import Phaser from 'phaser'
import { IMAGES, SHEETS, TILESET } from '../assets'
import type { FrameMeta } from '../entities/Yettie'
import { setPortraits, ui } from '../state'

const FRAME = 32
const COLS = 5

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  preload() {
    this.load.image(TILESET.key, TILESET.path)
    for (const [key, path] of Object.entries(IMAGES)) this.load.image(key, path)
    for (const [key, { path, ...frame }] of Object.entries(SHEETS)) this.load.spritesheet(key, path, frame)
  }

  create() {
    const meta = this.measureYettie()
    this.registry.set('yettieMeta', meta)
    ui.yettieFront = meta[2] ?? null
    this.anims.create({ key: 'fountain-flow', frames: this.anims.generateFrameNumbers('fountain', { frames: [1, 2] }), frameRate: 5, repeat: -1 })
    this.anims.create({ key: 'flutter', frames: this.anims.generateFrameNumbers('butterfly', { frames: [0, 1] }), frameRate: 8, repeat: -1 })
    setPortraits(this.portraits())
    this.scene.start('world')
  }

  // Measures every frame of the Yettie sheet (head top, centre, eyes), so hats and shades
  // sit right. Done at boot rather than hardcoded, so edits to the sheet just work.
  private measureYettie(): FrameMeta[] {
    const img = this.textures.get('yettie').getSourceImage() as HTMLImageElement
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const frames = (img.width / FRAME) * (img.height / FRAME)
    const meta: FrameMeta[] = []
    for (let f = 0; f < frames; f++) {
      const d = ctx.getImageData((f % COLS) * FRAME, Math.floor(f / COLS) * FRAME, FRAME, FRAME).data
      const at = (x: number, y: number) => (y * FRAME + x) * 4
      let top = FRAME, bottom = 0
      const whites: [number, number][] = []
      for (let y = 0; y < FRAME; y++)
        for (let x = 0; x < FRAME; x++) {
          const i = at(x, y)
          if (d[i + 3]! < 128) continue
          top = Math.min(top, y)
          bottom = Math.max(bottom, y)
          if (d[i]! > 235 && d[i + 1]! > 235 && d[i + 2]! > 235) whites.push([x, y])
        }
      // The head's centre: the average x of the top 8 rows.
      let sum = 0, n = 0
      for (let y = top; y < top + 8; y++)
        for (let x = 0; x < FRAME; x++) if (d[at(x, y) + 3]! > 128) { sum += x; n++ }
      const cx = n ? sum / n : FRAME / 2
      // The eyes: the box around the white pixels. Back views have none.
      let eyes: FrameMeta['eyes'] = null
      if (whites.length > 6) {
        const xs = whites.map((w) => w[0]), ys = whites.map((w) => w[1])
        eyes = { cx: (Math.min(...xs) + Math.max(...xs) + 1) / 2, cy: (Math.min(...ys) + Math.max(...ys) + 1) / 2 }
      }
      meta.push({ top, bottom, cx, eyes })
    }
    return meta
  }

  // Data URLs for the Vue HUD (dialog portraits, item icons).
  private portraits() {
    const out: Record<string, string> = {}
    const keys = [
      'npc-broc', 'npc-avo', 'npc-pear', 'npc-shelly', 'item-carrot', 'item-berry', 'item-dewdrop',
      'wear-chefhat', 'wear-crown', 'wear-bow', 'wear-shades', 'ind-available', 'ind-ready', 'ind-active',
      'note', 'heart', 'spark',
    ]
    for (const k of keys) out[k] = this.textures.getBase64(k)
    out['npc-drip-0'] = this.textures.getBase64('npc-drip', 0)
    out['npc-drip-1'] = this.textures.getBase64('npc-drip', 1)
    out['yettie'] = this.textures.getBase64('yettie', 2)
    out['npc-mama'] = this.textures.getBase64('yettie-mama', 2)
    out['npc-pip'] = this.textures.getBase64('yettie-pip', 2)
    return out
  }
}
