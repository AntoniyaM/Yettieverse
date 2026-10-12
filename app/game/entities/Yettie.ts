import Phaser from 'phaser'
import { COSMETICS } from '../data'
import { isBlocking, refreshQuests, save, ui, type Facing } from '../state'

// Per-frame measurements of the extracted sheet (see BootScene.analyzeYettie).
export interface FrameMeta {
  top: number
  bottom: number
  cx: number
  eyes: { cx: number; cy: number } | null
}

// Frame indices in public/sprites/characters/yettie.png.
const FRAMES: Record<Facing, number[]> = { down: [2], up: [0, 1, 5, 6], right: [3, 4], left: [9, 8] }
const HOP = [0, 1, 2, 1]
const FRAME = 32
// Idle breathing: one slow cycle, and how much taller/wider Yettie gets at the top of a breath.
const BREATH_MS = 2600
const BREATH_GROW_Y = 0.02
const BREATH_GROW_X = 0.03

// The visual part of a Yettie: sprite, shadow, wearables, floatie. Used for the hero and for Pip.
export class YettieView {
  sprite: Phaser.GameObjects.Sprite
  shadow: Phaser.GameObjects.Image
  floatie: Phaser.GameObjects.Image
  ripple: Phaser.GameObjects.Image
  hat: Phaser.GameObjects.Image
  face: Phaser.GameObjects.Image
  facing: Facing = 'down'
  private clock = 0
  private step = 0
  private blinkUntil = 0
  private nextBlink = 2000
  private wasSwimming = false
  private idleSince = 0

  constructor(
    scene: Phaser.Scene,
    private meta: FrameMeta[],
    private opts: { scale?: number; skin?: string; wearables?: boolean } = {},
  ) {
    const s = opts.scale ?? 1
    this.shadow = scene.add.image(0, 0, 'shadow').setScale(s * 1.2, s)
    this.ripple = scene.add.image(0, 0, 'ripple').setScale(s).setVisible(false)
    this.sprite = scene.add.sprite(0, 0, opts.skin ?? 'yettie', 2).setOrigin(0.5, 1).setScale(s)
    this.floatie = scene.add.image(0, 0, 'floatie').setOrigin(0.5, 1).setScale(s).setVisible(false)
    this.hat = scene.add.image(0, 0, 'wear-chefhat').setOrigin(0.5, 1).setVisible(false)
    this.face = scene.add.image(0, 0, 'wear-shades').setVisible(false)
    scene.tweens.add({ targets: this.ripple, scaleX: s * 1.15, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 })
  }

  // `x`/`y` are the feet. Returns true when it just splashed into water.
  render(x: number, y: number, dt: number, time: number, moving: boolean, swimming: boolean, fast = false) {
    const s = this.opts.scale ?? 1
    const frames = FRAMES[this.facing]
    this.clock += dt
    const period = fast ? 90 : swimming ? 200 : 140
    if (moving && this.clock > period) {
      this.clock = 0
      this.step = (this.step + 1) % 4
    } else if (!moving) this.step = 0

    const frame = moving ? frames[Math.floor(this.step / (frames.length > 2 ? 1 : 2)) % frames.length]! : frames[0]!
    // The front view only has one frame, so waddle by mirroring it.
    this.sprite.setFlipX(this.facing === 'down' && moving && this.step >= 2)

    if (time > this.nextBlink) {
      this.blinkUntil = time + 130
      this.nextBlink = time + 2200 + Math.random() * 3500
    }
    const blink = time < this.blinkUntil && !!this.meta[frame]?.eyes
    const skin = this.opts.skin ?? 'yettie'
    this.sprite.setTexture(blink ? `${skin}-blink` : skin, frame)

    const hop = (moving ? HOP[this.step]! : 0) * (swimming ? 0.5 : 1) * s
    const bob = swimming ? Math.round(Math.sin(time / 300)) * s : 0
    const m = this.meta[frame]!
    // Standing still on land, Yettie breathes: a slow inhale that grows the sprite from the
    // feet up, then exhales. Each breath starts from rest, so stopping never causes a jump.
    const idle = !moving && !swimming
    if (!idle) this.idleSince = time
    const breath = idle ? (1 - Math.cos(((time - this.idleSince) / BREATH_MS) * Math.PI * 2)) / 2 : 0
    const gx = 1 + BREATH_GROW_X * breath, gy = 1 + BREATH_GROW_Y * breath
    this.sprite.setScale(s * gx, s * gy)
    this.sprite.setPosition(Math.round(x), Math.round(y - hop + bob))
    this.sprite.setDepth(y)
    if (swimming) this.sprite.setCrop(0, 0, FRAME, m.bottom - 6)
    else this.sprite.setCrop()

    this.shadow.setPosition(Math.round(x), Math.round(y - 1)).setVisible(!swimming)
    this.shadow.setDepth(y - 100)
    this.ripple.setPosition(Math.round(x), Math.round(y - 3 * s)).setVisible(swimming).setDepth(y - 1)
    this.floatie.setPosition(Math.round(x), Math.round(y - 1 * s + bob)).setVisible(swimming).setDepth(y + 0.3)

    const flip = this.sprite.flipX ? -1 : 1
    const sx = this.sprite.x, top = this.sprite.y - FRAME * s * gy
    const hatId = this.opts.wearables ? save.wearing.hat : null
    this.hat.setVisible(!!hatId)
    if (hatId) {
      const tex = COSMETICS[hatId].icon
      if (this.hat.texture.key !== tex) this.hat.setTexture(tex)
      this.hat.setPosition(sx + Math.round((m.cx - FRAME / 2) * flip * gx), Math.round(top + (m.top + 4) * gy)).setDepth(y + 0.2)
    }
    const faceId = this.opts.wearables ? save.wearing.face : null
    this.face.setVisible(!!faceId && !!m.eyes && !blink)
    if (faceId && m.eyes) {
      this.face.setPosition(sx + Math.round((m.eyes.cx - FRAME / 2) * flip * gx), Math.round(top + m.eyes.cy * gy)).setDepth(y + 0.1)
    }

    const splashed = swimming && !this.wasSwimming
    this.wasSwimming = swimming
    return splashed
  }

  setVisible(v: boolean) {
    for (const o of [this.sprite, this.shadow]) o.setVisible(v)
    if (!v) for (const o of [this.floatie, this.ripple, this.hat, this.face]) o.setVisible(false)
  }
}

const STEP_PX = 12

// The hero: physics body + input + view.
export class Player {
  body: Phaser.Physics.Arcade.Image
  view: YettieView
  moving = false
  swimming = false
  dashing = false
  private keys: Record<string, Phaser.Input.Keyboard.Key>
  private stepDist = 0
  private last: { x: number; y: number }
  private dustClock = 0

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    meta: FrameMeta[],
    private isWaterAt: (x: number, y: number) => boolean,
    private fx: { dust: (x: number, y: number, n: number) => void; splash: (x: number, y: number) => void },
  ) {
    this.body = scene.physics.add.image(x, y, 'px').setVisible(false)
    ;(this.body.body as Phaser.Physics.Arcade.Body).setSize(12, 7)
    this.last = { x, y }
    this.body.setCollideWorldBounds(true)
    this.view = new YettieView(scene, meta, { wearables: true })
    const K = Phaser.Input.Keyboard.KeyCodes
    this.keys = scene.input.keyboard!.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT,
      w: K.W, a: K.A, s: K.S, d: K.D, shift: K.SHIFT,
    }) as Record<string, Phaser.Input.Keyboard.Key>
  }

  get x() {
    return this.body.x
  }
  get y() {
    return this.body.y + 3 // Feet.
  }

  update(time: number, dt: number) {
    const k = this.keys
    let vx = 0, vy = 0
    if (!isBlocking()) {
      vx = (k.right!.isDown || k.d!.isDown ? 1 : 0) - (k.left!.isDown || k.a!.isDown ? 1 : 0) + ui.touch.x
      vy = (k.down!.isDown || k.s!.isDown ? 1 : 0) - (k.up!.isDown || k.w!.isDown ? 1 : 0) + ui.touch.y
    }
    const len = Math.hypot(vx, vy)
    this.moving = len > 0.15
    if (len > 1) { vx /= len; vy /= len }

    this.swimming = this.isWaterAt(this.x, this.y)
    const wantsDash = save.abilities.dash && (k.shift!.isDown || ui.touch.dash) && this.moving && !this.swimming
    if (wantsDash && !this.dashing) this.scene.events.emit('dash')
    this.dashing = wantsDash
    const speed = this.swimming ? 52 : this.dashing ? 140 : 80
    this.body.setVelocity(vx * speed, vy * speed)

    if (this.moving) {
      if (Math.abs(vx) > Math.abs(vy) + 0.1) this.view.facing = vx > 0 ? 'right' : 'left'
      else if (Math.abs(vy) > 0.1) this.view.facing = vy > 0 ? 'down' : 'up'
      // Count distance actually traveled, so walking into a wall earns nothing.
      this.stepDist += Math.hypot(this.body.x - this.last.x, this.body.y - this.last.y)
      while (this.stepDist >= STEP_PX) {
        this.stepDist -= STEP_PX
        save.steps++
        if (save.steps % 10 === 0) refreshQuests()
      }
      this.dustClock += dt
      if (!this.swimming && this.dustClock > (this.dashing ? 60 : 220)) {
        this.dustClock = 0
        this.fx.dust(this.x, this.y, this.dashing ? 2 : 1)
      }
    }
    this.last = { x: this.body.x, y: this.body.y }
    if (this.view.render(this.x, this.y, dt, time, this.moving, this.swimming, this.dashing)) this.fx.splash(this.x, this.y)
  }
}
