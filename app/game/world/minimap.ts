// Paints the island as a map: one pixel per tile, in flat map colours rather than the
// tile art, so paths, water and woods read clearly at a glance.
import { EMPTY, MAP_H, MAP_W, T, ZONES, type HouseKind, type World, type ZoneId } from './world'

type Rgb = [number, number, number]

const GROUND: Partial<Record<number, Rgb>> = {
  [T.GRASS]: [126, 200, 92],
  [T.GRASS2]: [118, 192, 86],
  [T.FLOWERS]: [138, 206, 104],
  [T.TALLGRASS]: [104, 178, 78],
  [T.PATH]: [226, 190, 132],
  [T.PLAZA]: [214, 204, 184],
  [T.SAND]: [246, 226, 168],
  [T.SNOW]: [240, 246, 255],
  [T.SNOW2]: [228, 238, 250],
  [T.SNOWPATH]: [206, 216, 232],
  [T.WATER]: [74, 164, 226],
  [T.WATER_B]: [74, 164, 226],
  [T.FOAM]: [150, 208, 242],
  [T.FOAM_B]: [150, 208, 242],
  [T.SOIL]: [150, 104, 66],
  [T.WOODS]: [88, 156, 80],
  [T.WOODS2]: [82, 148, 76],
}
const SOLID: Partial<Record<number, Rgb>> = {
  [T.TREE]: [46, 116, 64],
  [T.APPLE_TREE]: [46, 116, 64],
  [T.PALM]: [70, 150, 70],
  [T.PINE]: [104, 150, 140],
  [T.BUSH]: [62, 136, 66],
  [T.FLOWER_BUSH]: [62, 136, 66],
  [T.ROCK]: [146, 146, 158],
  [T.SNOWROCK]: [176, 186, 202],
  [T.CLIFF]: [112, 110, 128],
  [T.DRIFT]: [250, 252, 255],
  [T.FENCE]: [166, 116, 72],
  [T.STUMP]: [134, 92, 58],
}
const ROOF: Record<HouseKind, Rgb> = { broc: [216, 84, 72], avo: [234, 150, 70], mama: [236, 116, 156] }
const FOUNTAIN: Rgb = [120, 196, 240]
// Where to print a zone's name when the middle of the zone is busy, in tiles. The village's
// middle is full of quest givers, so its name goes on the open grass south of the plaza.
const LABEL_AT: Partial<Record<ZoneId, { x: number; y: number }>> = { village: { x: 48, y: 53 } }

export interface MinimapData {
  // A PNG data URL, MAP_W × MAP_H pixels.
  src: string
  // Where to print each zone's name, in tiles.
  labels: { id: ZoneId; name: string; x: number; y: number }[]
}

export const paintMinimap = (world: World): MinimapData => {
  const canvas = document.createElement('canvas')
  canvas.width = MAP_W
  canvas.height = MAP_H
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(MAP_W, MAP_H)
  const put = (x: number, y: number, c: Rgb) => {
    const i = (y * MAP_W + x) * 4
    img.data.set([...c, 255], i)
  }
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      const s = world.solid[y]![x]!
      put(x, y, (s !== EMPTY && SOLID[s]) || GROUND[world.ground[y]![x]!] || GROUND[T.GRASS]!)
    }
  for (const h of world.spawns.houses) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) put(h.x + x, h.y + y, ROOF[h.kind])
  const f = world.spawns.fountain
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) put(f.x + x, f.y + y, FOUNTAIN)
  ctx.putImageData(img, 0, 0)

  // Each zone's label sits at the average position of its tiles.
  const sums = new Map<ZoneId, { x: number; y: number; n: number }>()
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      const z = world.zone[y]?.[x]
      if (!z) continue
      const s = sums.get(z) ?? { x: 0, y: 0, n: 0 }
      s.x += x
      s.y += y
      s.n++
      sums.set(z, s)
    }
  const labels = [...sums].map(([id, s]) => ({ id, name: ZONES[id].name, ...(LABEL_AT[id] ?? { x: s.x / s.n, y: s.y / s.n }) }))
  return { src: canvas.toDataURL(), labels }
}
