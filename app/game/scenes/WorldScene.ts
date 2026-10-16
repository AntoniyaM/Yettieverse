import Phaser from 'phaser'
import { sfx } from '../audio'
import { ITEMS, NPCS, type ItemId, type NpcId } from '../data'
import { Player, YettieView, type FrameMeta } from '../entities/Yettie'
import {
  addItem,
  bus,
  isBlocking,
  persist,
  save,
  say,
  ui,
} from '../state'
import { indicatorFor, knockDoor, readSign, ringBell, talkTo, useFountain } from '../story'
import { paintMinimap } from '../world/minimap'
import { MAP_H, MAP_W, T, TILE, WATER_TILES, ZONES, buildWorld, isWater, type Point, type World } from '../world/world'
import { Ambience, unlit } from './Ambience'

interface Interactable {
  x: number
  y: number
  label: () => string
  // Height above the base point where the "you can interact" arrow floats.
  lift: number
  act: () => Promise<void> | void
  enabled?: () => boolean
  // Extra distance when competing with other targets (lower priority).
  penalty?: () => number
}
interface Npc {
  id: NpcId
  sprite: Phaser.GameObjects.Sprite
  indicator: Phaser.GameObjects.Image
}
interface Pickup {
  id: string
  item: ItemId
  sprite: Phaser.GameObjects.Image
  shadow: Phaser.GameObjects.Image
}

const center = (p: Point) => ({ x: p.x * TILE + TILE / 2, y: p.y * TILE + TILE / 2 })
const PIP_HOME = { x: 43 * TILE + 8, y: 56 * TILE + 6 }

export class WorldScene extends Phaser.Scene {
  world!: World
  player!: Player
  ambience!: Ambience
  private ground!: Phaser.Tilemaps.TilemapLayer
  private solid!: Phaser.Tilemaps.TilemapLayer
  private waterTiles: Phaser.Tilemaps.Tile[] = []
  private npcs = new Map<NpcId, Npc>()
  private interactables: Interactable[] = []
  private pickups = new Map<string, Pickup>()
  private blockers: Phaser.GameObjects.Zone[] = []
  private arrow!: Phaser.GameObjects.Image
  private target: Interactable | null = null
  private fountain!: Phaser.GameObjects.Sprite
  private bells: Phaser.GameObjects.Sprite[] = []
  private lamps: Phaser.GameObjects.Sprite[] = []
  private pip!: YettieView
  private pipInteract!: Interactable
  private pipPos = { x: 0, y: 0 }
  private trail: { x: number; y: number }[] = []
  private zoneId = ''
  private offBus: (() => void)[] = []
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter
  private hearts!: Phaser.GameObjects.Particles.ParticleEmitter
  private notes!: Phaser.GameObjects.Particles.ParticleEmitter
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter
  private busy = false

  constructor() {
    super('world')
  }

  create() {
    this.world = buildWorld()
    const { src, labels } = paintMinimap(this.world)
    ui.map.src = src
    ui.map.labels = labels
    const meta = this.registry.get('yettieMeta') as FrameMeta[]
    const W = MAP_W * TILE, H = MAP_H * TILE

    this.buildMap()
    this.physics.world.setBounds(0, 0, W, H)

    this.dust = this.add.particles(0, 0, 'dust', {
      lifespan: 450, speed: { min: 4, max: 14 }, angle: { min: 200, max: 340 }, alpha: { start: 0.9, end: 0 },
      scale: { start: 1, end: 0.4 }, emitting: false,
    }).setDepth(-5)
    this.sparks = this.add.particles(0, 0, 'spark', {
      lifespan: 700, speed: { min: 20, max: 60 }, alpha: { start: 1, end: 0 }, scale: { start: 1, end: 0.3 },
      emitting: false,
    }).setDepth(9500)
    unlit(this.sparks)
    this.hearts = this.add.particles(0, 0, 'heart', {
      lifespan: 1400, speedY: { min: -30, max: -15 }, speedX: { min: -12, max: 12 }, alpha: { start: 1, end: 0 },
      emitting: false,
    }).setDepth(9500)
    unlit(this.hearts)
    this.notes = this.add.particles(0, 0, 'note', {
      lifespan: 1600, speedY: { min: -26, max: -14 }, speedX: { min: -16, max: 16 }, alpha: { start: 1, end: 0 },
      tint: [0xffd23f, 0xff7eb6, 0x9ff0e6, 0xb9a0e8], emitting: false,
    }).setDepth(9500)
    unlit(this.notes)

    this.buildProps()
    this.buildNpcs()

    const start = save.player ?? { ...center(this.world.spawns.player), facing: 'down' as const }
    this.player = new Player(this, start.x, start.y - 3, meta, (x, y) => this.isWaterAt(x, y), {
      dust: (x, y, n) => this.dust.explode(n, x, y),
      splash: (x, y) => {
        sfx.splash()
        this.dust.explode(6, x, y)
      },
    })
    this.player.view.facing = start.facing

    this.buildPip(meta)
    this.colliders()

    this.arrow = unlit(this.add.image(0, 0, 'arrow').setDepth(9600).setVisible(false))

    this.ambience = new Ambience(this, this.world)
    this.addNightLights()

    const cam = this.cameras.main
    cam.setBounds(0, 0, W, H).setRoundPixels(true)
    cam.startFollow(this.player.body, true, 0.14, 0.14)
    this.fitZoom()
    this.scale.on('resize', this.fitZoom, this)
    cam.fadeIn(600, 255, 246, 224)

    // Keydown events rather than Key.JustDown: a tap released within one frame would be lost.
    this.input.keyboard!.addCapture('SPACE')
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (!e.repeat && [' ', 'e', 'E', 'Enter'].includes(e.key)) void this.tryInteract()
    })

    this.syncPickups()
    this.refreshIndicators()
    this.offBus.push(
      bus.on('quests', () => {
        this.syncPickups()
        this.refreshIndicators()
      }),
      bus.on('sfx', (name) => (sfx as Record<string, () => void>)[name as string]?.()),
      bus.on('fountain', () => this.fillFountain()),
      bus.on('pip-follow', () => {
        this.trail = []
        this.hearts.explode(5, this.pipPos.x, this.pipPos.y - 14)
        this.refreshIndicators()
      }),
      bus.on('pip-home', () => this.pipGoHome()),
      bus.on('bell', (i) => this.bellRung(i as number)),
      bus.on('wish', () => {
        const f = this.fountain
        this.sparks.explode(16, f.x, f.y - 20)
        this.hearts.explode(4, f.x, f.y - 20)
      }),
      bus.on('finale', () => this.ambience.finale(this.player)),
      bus.on('touch-interact', () => this.tryInteract()),
    )
    this.events.on('dash', () => sfx.dash())
    this.events.once('shutdown', () => this.offBus.forEach((off) => off()))

    // Light autosave of the player's position.
    this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        save.player = { x: Math.round(this.player.x), y: Math.round(this.player.y), facing: this.player.view.facing }
        save.playTime++
      },
    })
    this.time.addEvent({ delay: 550, loop: true, callback: () => this.animateWater() })
    this.time.addEvent({ delay: 300, loop: true, callback: () => this.checkZone() })

    this.applyLighting()
    ui.ready = true
    if (!save.flags.welcomed) {
      save.flags.welcomed = true
      this.time.delayedCall(700, () =>
        say([
          { speaker: 'narrator', text: 'Welcome to the Yettieverse! A cozy little island full of friends who could use a fluffy hand.' },
          { speaker: 'narrator', text: 'Move with the arrow keys or WASD. Walk up to someone and press SPACE to talk.' },
          { speaker: 'narrator', text: 'Look for a yellow ! above heads. Those friends have a quest for you. Press Q for your quest log.' },
          { speaker: 'yettie', text: '*excited fluff noises*' },
        ]).then(persist),
      )
    }
  }

  // World building.

  private buildMap() {
    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: MAP_W, height: MAP_H })
    const ts = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!
    const layer = (name: string, data: number[][], depth: number) => {
      const l = map.createBlankLayer(name, ts)!
      l.putTilesAt(data, 0, 0)
      l.setDepth(depth)
      return l
    }
    this.ground = layer('ground', this.world.ground, -1000)
    layer('deco', this.world.deco, -999)
    this.solid = layer('solid', this.world.solid, -998)
    layer('above', this.world.above, 8000)
    this.ground.setCollision(WATER_TILES)
    this.solid.setCollisionByExclusion([-1])
    this.ground.forEachTile((t) => {
      if (isWater(t.index)) this.waterTiles.push(t)
    })
  }

  // Night lights for props. Lamps, windows and Yettie's glow live in Ambience.
  private addNightLights() {
    for (const lamp of this.lamps) this.ambience.addGlow(lamp.x, lamp.y - 22, 78, 0xffc46b, 1.15, { flicker: 0.05 })
    this.ambience.addGlow(this.fountain.x, this.fountain.y - 14, 52, 0x7cc6ff, 0.7, { flicker: 0.08, when: () => save.quests.hydrate === 'done' })
    this.bells.forEach((bell, i) =>
      this.ambience.addGlow(bell.x, bell.y - 16, 60, 0xffe27a, 0.9, { flicker: 0.04, when: () => !!save.flags[`bell${i}`] }),
    )
  }

  // Everything in the world takes part in lighting, except things marked unlit (glows, UI bits).
  private applyLighting() {
    for (const o of this.children.list) {
      if (o.getData('unlit')) continue
      const lit = o as unknown as { setLighting?: (on: boolean) => void }
      lit.setLighting?.(true)
    }
  }

  private block(x: number, y: number, w: number, h: number) {
    const z = this.add.zone(x, y, w, h)
    this.physics.add.existing(z, true)
    this.blockers.push(z)
  }

  private buildProps() {
    const s = this.world.spawns
    for (const h of s.houses) {
      const x = h.x * TILE, y = h.y * TILE
      this.add.image(x + 24, y + 48, `house-${h.kind}`).setOrigin(0.5, 1).setDepth(y + 44)
      this.block(x + 24, y + 30, 42, 28)
      this.interactables.push({
        x: x + 24, y: y + 50, lift: 26, label: () => 'Knock on the door', act: () => knockDoor(h.kind),
      })
      if (h.kind === 'broc') this.registry.set('chimney', { x: x + 36, y: y + 2 })
    }
    this.registry.set('houses', s.houses.map((h) => ({ x: h.x * TILE + 24, y: h.y * TILE + 48 })))

    const f = s.fountain
    this.fountain = this.add.sprite(f.x * TILE + 16, f.y * TILE + 34, 'fountain', 0).setOrigin(0.5, 1).setDepth(f.y * TILE + 30)
    if (save.quests.hydrate === 'done') this.fountain.play('fountain-flow')
    this.block(f.x * TILE + 16, f.y * TILE + 26, 30, 14)
    this.interactables.push({
      x: this.fountain.x, y: this.fountain.y, lift: 40, act: useFountain,
      label: () => (save.quests.hydrate === 'done' ? 'Make a wish' : 'Look at the fountain'),
    })

    for (const sign of s.signs) {
      const { x, y } = center(sign)
      this.add.image(x, y + 8, 'sign').setOrigin(0.5, 1).setDepth(y + 6)
      this.block(x, y + 4, 10, 6)
      this.interactables.push({ x, y: y + 8, lift: 20, label: () => 'Read the sign', act: () => readSign(sign.text) })
    }

    for (const l of s.lamps) {
      const { x, y } = center(l)
      this.lamps.push(this.add.sprite(x, y + 8, 'lamp', 0).setOrigin(0.5, 1).setDepth(y + 6))
      this.block(x, y + 5, 6, 4)
    }

    s.bells.forEach((b, i) => {
      const { x, y } = center(b)
      const bell = this.add.sprite(x, y + 8, 'bell', save.flags[`bell${i}`] ? 1 : 0).setOrigin(0.5, 1).setDepth(y + 6)
      this.bells.push(bell)
      this.block(x, y + 4, 16, 6)
      this.interactables.push({ x, y: y + 8, lift: 30, label: () => 'Ring the bell', act: () => ringBell(i) })
    })
  }

  private buildNpcs() {
    for (const [id, p] of Object.entries(this.world.spawns.npcs) as [NpcId, Point][]) {
      if (id === 'pip') continue
      const { x, y } = center(p)
      const sprite =
        id === 'mama'
          ? this.add.sprite(x, y + 7, 'yettie-mama', 2)
          : this.add.sprite(x, y + 7, `npc-${id}`, id === 'drip' && save.quests.hydrate === 'done' ? 1 : 0)
      sprite.setOrigin(0.5, 1).setDepth(y + 7)
      this.add.image(x, y + 6, 'shadow').setDepth(-100)
      // Idle: a little breathing squash, offset so they don't sync up.
      this.tweens.add({
        targets: sprite, scaleY: 0.94, scaleX: 1.04, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1,
        ease: 'Sine.inOut', delay: Math.random() * 800,
      })
      const indicator = unlit(this.add.image(x, sprite.y - sprite.height - 6, 'ind-available').setDepth(9600).setVisible(false))
      this.tweens.add({ targets: indicator, y: '-=3', duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
      this.npcs.set(id, { id, sprite, indicator })
      this.block(x, y + 4, 12, 7)
      this.interactables.push({
        x, y: y + 7, lift: sprite.height + 4, label: () => `Talk to ${NPCS[id].name}`,
        act: async () => {
          if (id === 'shelly') sprite.setFlipX(this.player.x < x) // The only one drawn side-on.
          this.tweens.add({ targets: sprite, y: sprite.y - 3, duration: 90, yoyo: true })
          await talkTo(id)
        },
      })
    }
  }

  private buildPip(meta: FrameMeta[]) {
    this.pip = new YettieView(this, meta, { scale: 0.5, skin: 'yettie-pip' })
    const isle = center(this.world.spawns.npcs.pip!)
    this.pipPos = save.quests.pip === 'done' ? { ...PIP_HOME } : save.flags.pipFollowing ? { x: this.player.x, y: this.player.y + 10 } : { x: isle.x, y: isle.y + 6 }
    // Position is kept in sync with Pip in updatePip().
    this.pipInteract = {
      x: 0, y: 0, lift: 18, label: () => 'Talk to Pip', act: () => talkTo('pip'),
      // A following Pip is always close by; don't let it steal focus from everyone else.
      penalty: () => (save.flags.pipFollowing && save.quests.pip !== 'done' ? 14 : 0),
    }
    this.interactables.push(this.pipInteract)
  }

  private colliders() {
    this.physics.add.collider(this.player.body, this.ground, undefined, () => !save.abilities.floatie)
    this.physics.add.collider(this.player.body, this.solid, undefined, (_p, tile) => {
      const t = tile as Phaser.Tilemaps.Tile
      if (t.index === T.DRIFT && save.abilities.boots) {
        if (Math.random() < 0.15) this.dust.explode(1, this.player.x, this.player.y)
        return false
      }
      return true
    })
    this.physics.add.collider(this.player.body, this.blockers)
  }

  // Runtime.

  isWaterAt(x: number, y: number) {
    const t = this.ground.getTileAtWorldXY(x, y)
    return !!t && isWater(t.index)
  }

  private fitZoom() {
    const w = this.scale.width, h = this.scale.height
    const z = Phaser.Math.Clamp(Math.round(Math.min(w / 420, h / 270)), 2, 6)
    this.cameras.main.setZoom(z)
  }

  private animateWater() {
    for (const t of this.waterTiles) {
      if (t.index === T.WATER) t.index = T.WATER_B
      else if (t.index === T.WATER_B) t.index = T.WATER
      else if (t.index === T.FOAM) t.index = T.FOAM_B
      else if (t.index === T.FOAM_B) t.index = T.FOAM
    }
  }

  private checkZone() {
    const tx = Math.floor(this.player.x / TILE), ty = Math.floor(this.player.y / TILE)
    const z = this.world.zone[ty]?.[tx]
    if (!z || z === this.zoneId) return
    this.zoneId = z
    ui.zone = ZONES[z].name
    ui.banner = { ...ZONES[z], key: Date.now() }
    this.ambience.setZone(z)
  }

  private syncPickups() {
    const want = new Map<string, { item: ItemId; p: Point }>()
    const add = (quest: 'soup' | 'berries' | 'hydrate', item: ItemId, pts: Point[]) => {
      if (save.quests[quest] !== 'active') return
      pts.forEach((p, i) => {
        const id = `${item}-${i}`
        if (!save.collected.includes(id)) want.set(id, { item, p })
      })
    }
    const s = this.world.spawns
    add('soup', 'carrot', s.carrots)
    add('berries', 'berry', s.berries)
    add('hydrate', 'dewdrop', s.dewdrops)

    for (const [id, pk] of this.pickups) {
      if (!want.has(id)) {
        pk.sprite.destroy()
        pk.shadow.destroy()
        this.pickups.delete(id)
      }
    }
    for (const [id, { item, p }] of want) {
      if (this.pickups.has(id)) continue
      const { x, y } = center(p)
      const shadow = this.add.image(x, y + 6, 'shadow').setScale(0.6).setDepth(-100)
      const sprite = this.add.image(x, y + 3, ITEMS[item].icon).setOrigin(0.5, 1).setDepth(y + 3)
      sprite.setScale(0).setLighting(true)
      shadow.setLighting(true)
      this.tweens.add({ targets: sprite, scale: 1, duration: 300, ease: 'Back.out', delay: Math.random() * 300 })
      this.tweens.add({ targets: sprite, y: y, duration: 700 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
      if (item === 'dewdrop') {
        const glow = this.add.image(x, y, 'glow').setScale(3).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(9100).setTint(0x88ccff)
        this.tweens.add({ targets: glow, alpha: 0.15, duration: 800, yoyo: true, repeat: -1 })
        const light = this.ambience.addGlow(x, y - 4, 34, 0x7cc6ff, 1, { flicker: 0.15 })
        sprite.once('destroy', () => {
          glow.destroy()
          this.ambience.removeGlow(light)
        })
      }
      this.pickups.set(id, { id, item, sprite, shadow })
    }
  }

  private refreshIndicators() {
    for (const npc of this.npcs.values()) {
      const kind = indicatorFor(npc.id)
      npc.indicator.setVisible(!!kind)
      if (kind) npc.indicator.setTexture(`ind-${kind}`)
    }
    const drip = this.npcs.get('drip')
    if (drip) drip.sprite.setFrame(save.quests.hydrate === 'done' ? 1 : 0)
    // The map only shows friends you can do something with: new quests and finished ones.
    ui.map.markers = (Object.entries(this.world.spawns.npcs) as [NpcId, Point][]).flatMap(([id, p]) => {
      const kind = indicatorFor(id)
      return kind === 'available' || kind === 'ready' ? [{ id, x: p.x + 0.5, y: p.y + 0.5, kind }] : []
    })
  }

  private collect(pk: Pickup) {
    this.pickups.delete(pk.id)
    const { sprite, shadow } = pk
    this.tweens.killTweensOf(sprite)
    this.tweens.add({
      targets: sprite, y: sprite.y - 14, scale: 1.6, alpha: 0, duration: 380, ease: 'Quad.out',
      onComplete: () => sprite.destroy(),
    })
    shadow.destroy()
    this.sparks.explode(8, sprite.x, sprite.y - 6)
    sfx.pickup()
    addItem(pk.item, pk.id)
    this.floatText(sprite.x, sprite.y - 12, `+1 ${ITEMS[pk.item].name}`)
  }

  floatText(x: number, y: number, text: string, color = '#fff6e0') {
    const t = this.add
      .text(x, y, text, { fontFamily: '"Yv Text", monospace', fontSize: '10px', color, stroke: '#2b2340', strokeThickness: 3 })
      .setOrigin(0.5, 1).setDepth(9700).setResolution(4)
    this.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 1200, ease: 'Quad.out', onComplete: () => t.destroy() })
  }

  private fillFountain() {
    const f = this.fountain
    f.play('fountain-flow')
    this.sparks.explode(20, f.x, f.y - 16)
    this.cameras.main.shake(200, 0.004)
    sfx.splash()
    this.refreshIndicators()
  }

  private bellRung(i: number) {
    const bell = this.bells[i]!
    bell.setFrame(1)
    this.tweens.add({ targets: bell, angle: { from: -14, to: 14 }, duration: 160, yoyo: true, repeat: 3, onComplete: () => bell.setAngle(0) })
    this.notes.explode(6, bell.x, bell.y - 20)
    this.sparks.explode(10, bell.x, bell.y - 16)
    if ([0, 1, 2].every((n) => save.flags[`bell${n}`])) {
      this.time.delayedCall(700, () => {
        this.cameras.main.flash(500, 255, 240, 180)
        this.ambience.celebrate(this.player.x, this.player.y)
      })
    }
  }

  private pipGoHome() {
    this.hearts.explode(10, this.pipPos.x, this.pipPos.y - 10)
    const mama = this.npcs.get('mama')
    if (mama) this.hearts.explode(6, mama.sprite.x, mama.sprite.y - 30)
    this.tweens.add({ targets: this.pipPos, x: PIP_HOME.x, y: PIP_HOME.y, duration: 900, ease: 'Quad.inOut' })
  }

  private updatePip(time: number, dt: number) {
    const following = save.flags.pipFollowing && save.quests.pip !== 'done'
    let moving = false
    if (following) {
      const last = this.trail[this.trail.length - 1]
      if (!last || Math.hypot(last.x - this.player.x, last.y - this.player.y) > 2) {
        this.trail.push({ x: this.player.x, y: this.player.y })
        if (this.trail.length > 80) this.trail.shift()
      }
      const goal = this.trail[Math.max(0, this.trail.length - 12)]
      if (goal) {
        const dx = goal.x - this.pipPos.x, dy = goal.y - this.pipPos.y
        const d = Math.hypot(dx, dy)
        if (d > 1.5) {
          const step = Math.min(d, (this.player.dashing ? 150 : 95) * (dt / 1000))
          this.pipPos.x += (dx / d) * step
          this.pipPos.y += (dy / d) * step
          moving = true
          this.pip.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
        }
      }
    } else if (save.quests.pip === 'done') {
      // Happy little hops at home.
      moving = Math.sin(time / 700) > 0.6
      this.pip.facing = 'down'
    }
    const swimming = this.isWaterAt(this.pipPos.x, this.pipPos.y)
    this.pip.render(this.pipPos.x, this.pipPos.y, dt, time, moving, swimming)
    this.pipInteract.x = this.pipPos.x
    this.pipInteract.y = this.pipPos.y
  }

  private findTarget(): Interactable | null {
    const dir = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.player.view.facing]
    const fx = this.player.x + dir[0]! * 10, fy = this.player.y + dir[1]! * 10 - 2
    let best: Interactable | null = null
    let bestD = 18
    for (const it of this.interactables) {
      if (it.enabled && !it.enabled()) continue
      const d = Math.min(Math.hypot(it.x - fx, it.y - fy), Math.hypot(it.x - this.player.x, it.y - this.player.y) + 4)
      if (d + (it.penalty?.() ?? 0) < bestD) {
        bestD = d + (it.penalty?.() ?? 0)
        best = it
      }
    }
    return best
  }

  private async tryInteract() {
    if (this.busy || isBlocking() || performance.now() < ui.inputLockedUntil || !this.target) return
    this.busy = true
    this.player.body.setVelocity(0, 0)
    try {
      await this.target.act()
    } finally {
      this.busy = false
      persist()
    }
  }

  override update(time: number, dt: number) {
    this.player.update(time, dt)
    this.updatePip(time, dt)

    this.target = isBlocking() ? null : this.findTarget()
    ui.prompt = this.target ? this.target.label() : ''
    this.arrow.setVisible(!!this.target)
    if (this.target) {
      const bob = Math.round(Math.sin(time / 130) + 1)
      this.arrow.setPosition(this.target.x, this.target.y - this.target.lift + bob)
    }

    for (const pk of this.pickups.values()) {
      if (Math.hypot(pk.sprite.x - this.player.x, pk.sprite.y - this.player.y) < 12) this.collect(pk)
    }
    this.ambience.update(time, dt, this.player)
    // Quarter-tile steps: smooth enough for the map, and Vue only re-renders when it changes.
    ui.map.player.x = Math.round((this.player.x / TILE) * 4) / 4
    ui.map.player.y = Math.round((this.player.y / TILE) * 4) / 4
    const lampFrame = this.ambience.night > 0.25 ? 1 : 0
    for (const l of this.lamps) if (l.frame.name !== String(lampFrame)) l.setFrame(lampFrame)
  }
}
