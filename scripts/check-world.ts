// Verifies every quest target is reachable with the abilities the player has
// at that point in the story, and writes a minimap for eyeballing.
//
// Usage: `node scripts/check-world.ts [minimap.png]`.
import fs from 'node:fs'
import {PNG} from 'pngjs'
import {buildWorld, EMPTY, MAP_H, MAP_W, T, isWater, type Point} from '../app/game/world/world.ts'

const world = buildWorld()
const {ground, solid, spawns} = world

const blocked = Array.from({length: MAP_H}, () => Array<boolean>(MAP_W).fill(false))
for (const h of spawns.houses) for (let y = h.y; y < h.y + 3; y++) for (let x = h.x; x < h.x + 3; x++) blocked[y]![x] = true
for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) blocked[spawns.fountain.y + y]![spawns.fountain.x + x] = true
for (const p of [...Object.values(spawns.npcs), ...spawns.signs, ...spawns.lamps]) blocked[p.y]![p.x] = true

type Abilities = { floatie: boolean; boots: boolean }

function reachable(ab: Abilities) {
  const seen = Array.from({length: MAP_H}, () => Array<boolean>(MAP_W).fill(false))
  const q: Point[] = [spawns.player]
  seen[spawns.player.y]![spawns.player.x] = true
  const ok = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H || blocked[y]![x]) return false
    const s = solid[y]![x]!
    if (s === T.DRIFT) return ab.boots
    if (s !== EMPTY) return false
    return ab.floatie || !isWater(ground[y]![x]!)
  }
  while (q.length) {
    const {x, y} = q.shift()!
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy
      if (!seen[ny]?.[nx] && ok(nx, ny)) {
        seen[ny]![nx] = true
        q.push({x: nx, y: ny})
      }
    }
  }
  return seen
}

// A target counts if it, or a tile next to it (NPCs/signs are solid), is reachable.
const hits = (seen: boolean[][], p: Point) =>
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[p.y + dy!]?.[p.x + dx!])

const none = reachable({floatie: false, boots: false})
const float = reachable({floatie: true, boots: false})
const all = reachable({floatie: true, boots: true})

const checks: [string, boolean][] = [
  ...Object.entries(spawns.npcs)
      .filter(([id]) => id !== 'pip')
      .map(([id, p]) => [`npc ${id} (start)`, hits(none, p)] as [string, boolean]),
  ...spawns.carrots.map((p, i) => [`carrot ${i} (start)`, hits(none, p)] as [string, boolean]),
  ...spawns.berries.map((p, i) => [`berry ${i} (start)`, hits(none, p)] as [string, boolean]),
  ...spawns.dewdrops.map((p, i) => [`dewdrop ${i} (start)`, hits(none, p)] as [string, boolean]),
  ['pip NOT without floatie', !hits(none, spawns.npcs.pip!)],
  ['pip with floatie', hits(float, spawns.npcs.pip!)],
  ...spawns.bells.map((p, i) => [`bell ${i} NOT without boots`, !hits(float, p)] as [string, boolean]),
  ...spawns.bells.map((p, i) => [`bell ${i} with boots`, hits(all, p)] as [string, boolean]),
  ['berries >= 8', spawns.berries.length >= 8],
  ['carrots >= 5', spawns.carrots.length >= 5],
]
let failed = 0
for (const [name, pass] of checks) if (!pass) {
  failed++;
  console.log(`✗ ${name}`)
}
console.log(`${checks.length - failed}/${checks.length} checks passed`)

// Minimap.
const S = 6
const col: Record<number, [number, number, number]> = {
  [T.GRASS]: [106, 190, 75], [T.GRASS2]: [96, 178, 68], [T.FLOWERS]: [150, 200, 110], [T.TALLGRASS]: [80, 160, 60],
  [T.PATH]: [217, 178, 122], [T.PLAZA]: [200, 190, 170], [T.SAND]: [242, 220, 160], [T.SNOW]: [238, 246, 255],
  [T.SNOW2]: [220, 232, 245], [T.SNOWPATH]: [200, 210, 225], [T.WATER]: [61, 155, 224], [T.FOAM]: [140, 200, 240],
  [T.SOIL]: [130, 85, 50], [T.WOODS]: [70, 140, 70], [T.WOODS2]: [62, 128, 62],
}
const scol: Record<number, [number, number, number]> = {
  [T.TREE]: [30, 100, 50],
  [T.APPLE_TREE]: [60, 110, 50],
  [T.FLOWER_BUSH]: [80, 140, 80],
  [T.PINE]: [30, 80, 70],
  [T.PALM]: [60, 140, 60],
  [T.BUSH]: [50, 120, 50],
  [T.ROCK]: [130, 130, 140],
  [T.SNOWROCK]: [160, 170, 185],
  [T.FENCE]: [150, 100, 60],
  [T.DRIFT]: [255, 0, 255],
  [T.CLIFF]: [90, 90, 105],
  [T.STUMP]: [120, 80, 50],
}
const png = new PNG({width: MAP_W * S, height: MAP_H * S})
const mark = (p: Point, c: [number, number, number]) => paint(p.x, p.y, c, true)

function paint(tx: number, ty: number, c: [number, number, number], dot = false) {
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      if (dot && (x < 1 || y < 1 || x > S - 2 || y > S - 2)) continue
      const i = ((ty * S + y) * png.width + tx * S + x) * 4
      png.data[i] = c[0];
      png.data[i + 1] = c[1];
      png.data[i + 2] = c[2];
      png.data[i + 3] = 255
    }
}

for (let y = 0; y < MAP_H; y++)
  for (let x = 0; x < MAP_W; x++) paint(x, y, scol[solid[y]![x]!] ?? col[ground[y]![x]!] ?? [255, 0, 0])
for (const h of spawns.houses) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) paint(h.x + x, h.y + y, [200, 60, 60])
for (const p of Object.values(spawns.npcs)) mark(p, [255, 255, 0])
for (const p of spawns.carrots) mark(p, [255, 140, 0])
for (const p of spawns.berries) mark(p, [255, 40, 80])
for (const p of spawns.dewdrops) mark(p, [0, 255, 255])
for (const p of spawns.bells) mark(p, [255, 215, 0])
for (const p of spawns.signs) mark(p, [255, 255, 255])
mark(spawns.player, [0, 0, 0])
const out = process.argv[2] ?? 'minimap.png'
fs.writeFileSync(out, PNG.sync.write(png))
console.log(`minimap → ${out}`)
process.exit(failed ? 1 : 0)
