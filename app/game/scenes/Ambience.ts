// Mood: day/night cycle (Phaser 4 lighting), light sources, fireflies, butterflies,
// snow, smoke, fireworks.
//
// Everything in the world is lit (WorldScene.applyLighting). The ambient colour
// follows the clock: white by day, so lit objects look exactly as drawn, and
// deep blue at night, when the point lights below do the work.
import Phaser from 'phaser'
import { sfx } from '../audio'
import type { Player } from '../entities/Yettie'
import { save, ui } from '../state'
import { EMPTY, MAP_H, MAP_W, TILE, isWater, type World, type ZoneId } from '../world/world'

const DAY_SECONDS = 360

// Emissive things (glows, sparks, UI-ish bits) opt out of lighting so they stay bright at night.
export const unlit = <O extends Phaser.GameObjects.GameObject>(o: O) => {
  o.setData('unlit', true)
  return o
}
// Each entry is [clock, ambient light colour, night amount].
const SKY: [number, number, number][] = [
  [0.0, 0xffd2b8, 0.3],
  [0.08, 0xffffff, 0],
  [0.55, 0xffffff, 0],
  [0.64, 0xf2a878, 0.35],
  [0.72, 0x3a4680, 1],
  [0.92, 0x3a4680, 1],
  [1.0, 0xffd2b8, 0.3],
]

// A point light that only shines at night (scaled by `night`), optionally flickering.
interface Glow {
  light: Phaser.GameObjects.Light
  base: number
  flicker: number
  phase: number
  when?: () => boolean
}

const sky = (t: number) => {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [t0, c0, n0] = SKY[i]!, [t1, c1, n1] = SKY[i + 1]!
    if (t >= t0 && t <= t1) {
      const k = (t - t0) / (t1 - t0)
      const a = Phaser.Display.Color.IntegerToColor(c0), b = Phaser.Display.Color.IntegerToColor(c1)
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, k * 100)
      return { color: Phaser.Display.Color.GetColor(c.r, c.g, c.b), night: n0 + (n1 - n0) * k }
    }
  }
  return { color: 0xffffff, night: 0 }
}

export class Ambience {
  private windowGlows: Phaser.GameObjects.Image[] = []
  private glows: Glow[] = []
  private lantern: Glow
  private fireflies: { img: Phaser.GameObjects.Image; light: Phaser.GameObjects.Light; phase: number; rate: number; vx: number; vy: number }[] = []
  private butterflies: { s: Phaser.GameObjects.Sprite; hx: number; hy: number; a: number; b: number; p: number }[] = []
  private snow: Phaser.GameObjects.Particles.ParticleEmitter
  private snowZone = new Phaser.Geom.Rectangle(0, 0, 10, 10)
  private gold: Phaser.GameObjects.Particles.ParticleEmitter
  private fireworks: Phaser.GameObjects.Particles.ParticleEmitter
  private smoke: Phaser.GameObjects.Particles.ParticleEmitter
  private zone: ZoneId = 'village'
  night = 0

  constructor(private scene: Phaser.Scene, world: World) {
    scene.lights.enable().setAmbientColor(0xffffff)

    // Warm windows: a light spilling onto the ground in front of each, plus the glass itself.
    for (const h of scene.registry.get('houses') as { x: number; y: number }[]) {
      this.windowGlows.push(unlit(scene.add.image(h.x, h.y, 'house-glow').setOrigin(0.5, 1).setDepth(9100).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0)))
      for (const wx of [-11, 11]) this.addGlow(h.x + wx, h.y - 12, 44, 0xffbe5c, 1.1, { flicker: 0.06 })
    }

    // Yettie's own soft glow, so the night is cosy rather than pitch black.
    this.lantern = this.addGlow(0, 0, 84, 0xfff0d8, 0.75)

    for (let i = 0; i < 16; i++) {
      const img = unlit(scene.add.image(0, 0, 'firefly').setDepth(9100).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0))
      const light = scene.lights.addLight(0, 0, 14, 0xd8ff70, 0)
      this.fireflies.push({ img, light, phase: Math.random() * 10, rate: 0.35 + Math.random() * 0.25, vx: 0, vy: 0 })
    }

    // Butterflies hang around flowery places.
    const spots: [number, number][] = []
    for (let y = 0; y < MAP_H; y += 3)
      for (let x = 0; x < MAP_W; x += 3) {
        const z = world.zone[y]![x]
        if ((z === 'meadow' || z === 'village' || z === 'orchard') && world.solid[y]![x] === EMPTY && !isWater(world.ground[y]![x]!)) spots.push([x, y])
      }
    const tints = [0xffffff, 0xfff3a0, 0xa8dcff, 0xffc2dd, 0xb9a0e8]
    for (let i = 0; i < 20 && spots.length; i++) {
      const [x, y] = spots[Math.floor(Math.random() * spots.length)]!
      const s = scene.add.sprite(x * TILE, y * TILE, 'butterfly').play('flutter').setDepth(7000).setTint(tints[i % tints.length]!)
      this.butterflies.push({ s, hx: x * TILE, hy: y * TILE, a: 0.3 + Math.random() * 0.5, b: 0.4 + Math.random() * 0.5, p: Math.random() * 10 })
    }

    this.snow = scene.add.particles(0, 0, 'px', {
      emitZone: { type: 'random', source: this.snowZone, quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
      lifespan: 4500, speedY: { min: 14, max: 30 }, speedX: { min: -10, max: 6 }, scale: { min: 0.5, max: 1 },
      alpha: { start: 0.95, end: 0.2 }, frequency: 50, emitting: false,
    }).setDepth(8500)

    this.gold = scene.add.particles(0, 0, 'px', {
      emitZone: { type: 'random', source: this.snowZone, quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
      lifespan: 3000, speedY: { min: -10, max: -3 }, scale: { start: 0.5, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: 0xffe27a,
      frequency: 160, emitting: !!save.flags.aurora, blendMode: Phaser.BlendModes.ADD,
    }).setDepth(9150)
    unlit(this.gold)

    this.fireworks = scene.add.particles(0, 0, 'px', {
      lifespan: 1300, speed: { min: 30, max: 95 }, gravityY: 40, scale: { start: 1, end: 0.2 }, alpha: { start: 1, end: 0 },
      tint: [0xffd23f, 0xff7eb6, 0x9ff0e6, 0xb9a0e8, 0xffffff, 0x8be07a], emitting: false, blendMode: Phaser.BlendModes.ADD,
    }).setDepth(9300)
    unlit(this.fireworks)

    this.smoke = scene.add.particles(0, 0, 'dust', {
      lifespan: 2600, speedY: { min: -14, max: -8 }, speedX: { min: 2, max: 8 }, scale: { start: 1, end: 2.5 },
      alpha: { start: 0.55, end: 0 }, tint: 0xd5dbe3, emitting: false,
    }).setDepth(8100)
    const chimney = scene.registry.get('chimney') as { x: number; y: number } | undefined
    if (chimney) scene.time.addEvent({ delay: 650, loop: true, callback: () => this.smoke.explode(1, chimney.x, chimney.y) })
  }

  // Adds a night-time light. `when` can switch it off (e.g. a bell not rung yet).
  addGlow(x: number, y: number, radius: number, color: number, base: number, opts: { flicker?: number; when?: () => boolean } = {}) {
    const g: Glow = { light: this.scene.lights.addLight(x, y, radius, color, 0), base, flicker: opts.flicker ?? 0, phase: Math.random() * 10, when: opts.when }
    this.glows.push(g)
    return g
  }

  removeGlow(g: Glow) {
    this.scene.lights.removeLight(g.light)
    this.glows.splice(this.glows.indexOf(g), 1)
  }

  setZone(z: ZoneId) {
    this.zone = z
    if (z === 'peak') this.snow.start()
    else this.snow.stop()
  }

  update(time: number, dt: number, player: Player) {
    save.clock = (save.clock + dt / 1000 / DAY_SECONDS) % 1
    const { color, night } = sky(save.clock)
    this.night = night
    this.scene.lights.setAmbientColor(color)
    for (const l of this.windowGlows) l.setAlpha(night * (0.85 + Math.sin(time / 300 + l.x) * 0.08))
    this.lantern.light.setPosition(player.x, player.y - 10)
    for (const g of this.glows) {
      const on = g.when ? g.when() : true
      const flick = g.flicker ? 1 + Math.sin(time / 90 + g.phase) * g.flicker + Math.sin(time / 37 + g.phase * 3) * g.flicker * 0.5 : 1
      g.light.intensity = on ? g.base * night * flick : 0
    }

    const view = this.scene.cameras.main.worldView
    this.snowZone.setTo(view.x - 20, view.y - 20, view.width + 40, view.height * 0.6)

    for (const f of this.fireflies) {
      const off = f.img.x < view.x - 20 || f.img.x > view.right + 20 || f.img.y < view.y - 20 || f.img.y > view.bottom + 20
      if (off) {
        f.img.setPosition(view.x + Math.random() * view.width, view.y + Math.random() * view.height)
      }
      f.phase += (dt / 1000) * f.rate
      // Lazy wandering with a slight upward drift.
      f.vx = Phaser.Math.Clamp(f.vx + (Math.random() - 0.5) * 0.25, -0.6, 0.6)
      f.vy = Phaser.Math.Clamp(f.vy + (Math.random() - 0.52) * 0.25, -0.6, 0.6)
      f.img.x += f.vx * (dt / 60)
      f.img.y += f.vy * (dt / 60)
      // Fireflies blink with a slow, soft swell rather than a flash: smooth in, smooth out, then a dark pause.
      const pulse = Math.max(0, Math.sin(f.phase * Math.PI)) ** 2
      const glow = this.zone === 'peak' ? 0 : night * pulse
      f.img.setAlpha(glow * 0.8)
      f.light.setPosition(f.img.x, f.img.y)
      f.light.intensity = glow * 0.4
    }

    for (const b of this.butterflies) {
      const t = time / 1000 + b.p
      b.s.setPosition(b.hx + Math.sin(t * b.a) * 26 + Math.sin(t * 2.3) * 3, b.hy + Math.cos(t * b.b) * 16 + Math.sin(t * 3.1) * 2)
      b.s.setAlpha(1 - night)
      // Shy: flutter off when Yettie gets close.
      const d = Math.hypot(b.s.x - player.x, b.s.y - player.y)
      if (d < 18) {
        b.hx += (b.s.x - player.x) * 0.08
        b.hy += (b.s.y - player.y) * 0.08
      }
    }
  }

  // All three bells rung.
  celebrate(x: number, y: number) {
    for (let i = 0; i < 6; i++) this.scene.time.delayedCall(i * 250, () => this.burst(x, y))
  }

  // Quest line finished: fireworks, everlasting sparkle, then the ending card.
  finale(player: Player) {
    save.flags.aurora = true
    this.gold.start()
    this.scene.time.addEvent({ delay: 380, repeat: 14, callback: () => this.burst(player.x, player.y) })
    this.scene.time.delayedCall(4200, () => (ui.ending = true))
  }

  private burst(x: number, y: number) {
    const bx = x + (Math.random() - 0.5) * 160, by = y - 40 - Math.random() * 50
    this.fireworks.explode(28, bx, by)
    sfx.dash()
  }
}
