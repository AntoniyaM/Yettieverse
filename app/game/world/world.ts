// Builds the Yettieverse island. Deterministic (seeded), so pickup ids and
// positions are stable across reloads and saves.
//
// Kept dependency-free on purpose: `node scripts/check-world.ts` imports it
// directly to verify every quest target is reachable.

export const TILE = 16
export const MAP_W = 96
export const MAP_H = 80

// Tile indices in public/tiles/tileset.png: index n is the n-th 16px tile from the left.
export const T = {
  // Ground.
  GRASS: 0,
  GRASS2: 1,
  FLOWERS: 2,
  PATH: 3,
  SAND: 4,
  SNOW: 5,
  SNOW2: 6,
  WATER: 7,
  WATER_B: 8,
  FOAM: 9,
  FOAM_B: 10,
  SOIL: 11,
  WOODS: 12,
  WOODS2: 13,
  TALLGRASS: 14,
  PLAZA: 15,
  SNOWPATH: 16,
  // Solid.
  TREE: 17,
  TREE_TOP: 18,
  PINE: 19,
  PINE_TOP: 20,
  PALM: 21,
  PALM_TOP: 22,
  BUSH: 23,
  ROCK: 24,
  SNOWROCK: 25,
  FENCE: 26,
  DRIFT: 27,
  CLIFF: 28,
  STUMP: 29,
  // Decoration (walkable, drawn over the ground).
  LILY: 30,
  SHELL: 31,
  MUSHROOM: 32,
  PEBBLES: 33,
  // Variants (appended so older indices stay put).
  APPLE_TREE: 34,
  APPLE_TREE_TOP: 35,
  FLOWER_BUSH: 36,
} as const
export const EMPTY = -1

export const WATER_TILES: number[] = [T.WATER, T.WATER_B, T.FOAM, T.FOAM_B]

export type ZoneId = 'village' | 'meadow' | 'woods' | 'lake' | 'peak' | 'shore'
export const ZONES: Record<ZoneId, { name: string; tagline: string }> = {
  village: { name: 'Sprout Village', tagline: 'Home sweet home' },
  meadow: { name: 'Carrot Meadow', tagline: 'Crunchy since forever' },
  woods: { name: 'Whisper Woods', tagline: 'The trees are gossiping' },
  lake: { name: 'Glimmer Lake', tagline: 'Sparkly. Wet. Very wet.' },
  peak: { name: 'Frosty Peak', tagline: 'Brrr-illiant views' },
  shore: { name: 'Sunny Shore', tagline: 'Sand in fur guaranteed' },
}

export interface Point {
  x: number
  y: number
}
export type HouseKind = 'broc' | 'avo' | 'mama'
export interface World {
  ground: number[][]
  solid: number[][]
  above: number[][]
  deco: number[][]
  zone: ZoneId[][]
  spawns: {
    player: Point
    fountain: Point
    npcs: Record<string, Point>
    houses: (Point & { kind: HouseKind })[]
    signs: (Point & { text: string })[]
    carrots: Point[]
    berries: Point[]
    dewdrops: Point[]
    bells: Point[]
    lamps: Point[]
  }
}

// Helpers.
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function valueNoise(rng: () => number, cell: number) {
  const gw = Math.ceil(MAP_W / cell) + 2
  const gh = Math.ceil(MAP_H / cell) + 2
  const g = Array.from({ length: gw * gh }, rng)
  const s = (t: number) => t * t * (3 - 2 * t)
  return (x: number, y: number) => {
    const fx = x / cell, fy = y / cell
    const ix = Math.floor(fx), iy = Math.floor(fy)
    const tx = s(fx - ix), ty = s(fy - iy)
    const v = (a: number, b: number) => g[b * gw + a]!
    const top = v(ix, iy) * (1 - tx) + v(ix + 1, iy) * tx
    const bot = v(ix, iy + 1) * (1 - tx) + v(ix + 1, iy + 1) * tx
    return top * (1 - ty) + bot * ty
  }
}

// Stable per-tile 0..99, for picking art variants without touching the RNG stream.
const variant = (x: number, y: number) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 100

const grid = <V>(v: V): V[][] => Array.from({ length: MAP_H }, () => Array<V>(MAP_W).fill(v))
const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H
const ellipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2

// Peak is a walled ellipse; its ring is the cliff wall, broken by a snow-drift gate.
const PEAK = { cx: 72, cy: 14, rx: 20, ry: 15 }
const LAKE = { cx: 72, cy: 46, rx: 10, ry: 7 }
const ISLE = { cx: 73, cy: 46, r: 2.4 }

export function isWater(tile: number) {
  return WATER_TILES.includes(tile)
}

// Builder.
export function buildWorld(seed = 20261001): World {
  const rng = mulberry32(seed)
  const noise = valueNoise(rng, 7)
  const fine = valueNoise(rng, 3)
  const chance = (p: number) => rng() < p
  const pick = <V>(arr: V[]) => arr[Math.floor(rng() * arr.length)]!

  const ground = grid<number>(T.WATER)
  const solid = grid<number>(EMPTY)
  const above = grid<number>(EMPTY)
  const deco = grid<number>(EMPTY)
  const zone = grid<ZoneId>('village')
  const land = grid(false)
  const lake = grid(false)
  const path = grid(false)
  const keepClear = grid(false)

  // 1. Island silhouette: a union of blobs with a wobbly coastline.
  const blobs = [
    { cx: 48, cy: 44, rx: 40, ry: 30 },
    { cx: 24, cy: 22, rx: 17, ry: 15 },
    { cx: 72, cy: 16, rx: 19, ry: 14 },
    { cx: 48, cy: 68, rx: 22, ry: 9 },
    { cx: 16, cy: 50, rx: 12, ry: 14 },
  ]
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (x < 3 || y < 3 || x > MAP_W - 4 || y > MAP_H - 4) continue
      const v = Math.min(...blobs.map((b) => ellipse(x, y, b.cx, b.cy, b.rx, b.ry)))
      land[y]![x] = v + (noise(x, y) - 0.5) * 0.35 < 1
    }
  }
  // Glimmer Lake with its little isle.
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const inLake = ellipse(x, y, LAKE.cx, LAKE.cy, LAKE.rx, LAKE.ry) + (fine(x, y) - 0.5) * 0.25 < 1
      const inIsle = Math.hypot(x - ISLE.cx, y - ISLE.cy) < ISLE.r
      if (inLake && !inIsle) {
        land[y]![x] = false
        lake[y]![x] = true
      }
    }
  }

  // 2. Zones.
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      let z: ZoneId = 'village'
      if (ellipse(x, y, PEAK.cx, PEAK.cy, PEAK.rx, PEAK.ry) < 1) z = 'peak'
      else if (ellipse(x, y, LAKE.cx, LAKE.cy, LAKE.rx + 4, LAKE.ry + 4) < 1) z = 'lake'
      else if (x < 38 && y < 34) z = 'woods'
      else if (x < 31) z = 'meadow'
      else if (y > 62) z = 'shore'
      zone[y]![x] = z
    }
  }

  // 3. Base ground per zone.
  const nearOcean = (x: number, y: number, r: number) => {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx, ny = y + dy
        if (inMap(nx, ny) && !land[ny]![nx] && !lake[ny]![nx]) return true
      }
    return false
  }
  const nearLake = (x: number, y: number) =>
    [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => lake[y + dy!]?.[x + dx!])
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!land[y]![x]) continue
      const z = zone[y]![x]!
      const n = fine(x, y)
      let t: number
      if (z === 'peak') t = n > 0.6 ? T.SNOW2 : T.SNOW
      else if (z === 'shore' || nearOcean(x, y, 2) || nearLake(x, y)) t = T.SAND
      else if (z === 'woods') t = n > 0.55 ? T.WOODS2 : T.WOODS
      else if (z === 'meadow') t = chance(0.22) ? T.FLOWERS : chance(0.1) ? T.TALLGRASS : n > 0.5 ? T.GRASS2 : T.GRASS
      else t = chance(0.04) ? T.FLOWERS : n > 0.55 ? T.GRASS2 : T.GRASS
      ground[y]![x] = t
    }
  }

  // 4. Roads and trails.
  const stamp = (cx: number, cy: number, r: number, fn: (x: number, y: number) => void) => {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) if (inMap(cx + dx, cy + dy) && dx * dx + dy * dy <= r * r + r) fn(cx + dx, cy + dy)
  }
  const road = (pts: [number, number][], r = 1) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i]!, [x1, y1] = pts[i + 1]!
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2
      for (let s = 0; s <= steps; s++) {
        const wob = (noise(x0 + s, y0 + s) - 0.5) * 1.2
        const x = Math.round(x0 + ((x1 - x0) * s) / steps + (Math.abs(y1 - y0) > Math.abs(x1 - x0) ? wob : 0))
        const y = Math.round(y0 + ((y1 - y0) * s) / steps + (Math.abs(x1 - x0) >= Math.abs(y1 - y0) ? wob : 0))
        stamp(x, y, r, (px, py) => {
          if (!land[py]![px]) return
          path[py]![px] = true
          const g = ground[py]![px]!
          ground[py]![px] = zone[py]![px] === 'peak' ? T.SNOWPATH : g === T.SAND ? T.SAND : T.PATH
        })
      }
    }
  }

  // Plaza around the fountain.
  const fountain = { x: 47, y: 44 } // Top-left of the 2x2 fountain.
  for (let y = 41; y <= 49; y++) for (let x = 43; x <= 53; x++) {
    if ((x === 43 || x === 53) && (y === 41 || y === 49)) continue
    ground[y]![x] = T.PLAZA
    path[y]![x] = true
  }
  road([[44, 46], [36, 47], [28, 49], [18, 50], [12, 46]]) // West to the meadow.
  road([[45, 42], [41, 35], [34, 29]]) // North-west to the woods.
  road([[52, 42], [56, 34], [61, 26], [64, 21]]) // North-east to the peak gate.
  road([[53, 46], [61, 46]]) // East to the lake.
  road([[48, 49], [48, 56], [47, 63]]) // South to the shore.
  road([[41, 50], [41, 54]], 0) // Mama's garden path.
  // Woods trails (narrow, winding).
  road([[34, 29], [27, 24], [20, 18], [14, 13]], 1)
  road([[27, 24], [30, 16], [34, 10]], 1)
  road([[20, 18], [13, 24], [10, 31]], 1)
  // Peak trails.
  road([[64, 21], [72, 17], [80, 14]], 1)
  road([[72, 17], [72, 7]], 1)
  // Clearings at trail ends.
  for (const [cx, cy] of [[14, 13], [34, 10], [10, 31], [27, 24]] as const)
    stamp(cx, cy, 2, (x, y) => {
      if (land[y]![x]) path[y]![x] = true
    })

  // 5. Houses, NPCs and signs reserve their space.
  const houses: World['spawns']['houses'] = [
    { x: 39, y: 37, kind: 'broc' },
    { x: 55, y: 37, kind: 'avo' },
    { x: 37, y: 51, kind: 'mama' },
  ]
  const npcs: Record<string, Point> = {
    broc: { x: 43, y: 40 },
    avo: { x: 54, y: 40 },
    drip: { x: 50, y: 45 },
    mama: { x: 41, y: 55 },
    shelly: { x: 50, y: 58 },
    pear: { x: 54, y: 33 },
    pip: { x: 73, y: 46 },
  }
  const signs: World['spawns']['signs'] = [
    { x: 34, y: 46, text: '← Carrot Meadow\n↖ Whisper Woods' },
    { x: 37, y: 32, text: 'Whisper Woods. The trees whisper.\nMostly gossip about squirrels.' },
    { x: 57, y: 30, text: 'Frosty Peak ↑\nSnow boots required. Fluff alone is NOT enough.' },
    { x: 60, y: 44, text: 'Glimmer Lake →\nNo swimming without a floatie!\n— Drip, Lifeguard' },
    { x: 46, y: 60, text: 'Sunny Shore ↓\nSand in fur: guaranteed.' },
    { x: 46, y: 50, text: 'Welcome to Sprout Village!\nPopulation: cozy.' },
  ]
  const player = { x: 48, y: 47 }
  // Street lamps: the plaza corners, then a few along the roads (just off the path).
  const lamps: Point[] = [[43, 41], [53, 41], [43, 49], [53, 49], [36, 49], [58, 45], [49, 56], [42, 36]].map(([x, y]) => {
    for (let r = 0; r < 4; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) if (land[y! + dy]![x! + dx] && !path[y! + dy]![x! + dx]) return { x: x! + dx, y: y! + dy }
    return { x: x!, y: y! }
  })
  // Lamps are cleared *after* scattering (step 8): reserving them up front would shift the
  // RNG stream and move every tree and pickup on the island.
  for (const h of houses) for (let y = h.y - 1; y <= h.y + 3; y++) for (let x = h.x - 1; x <= h.x + 3; x++) keepClear[y]![x] = true
  for (const p of [...Object.values(npcs), ...signs, player]) stamp(p.x, p.y, 1, (x, y) => (keepClear[y]![x] = true))
  for (let y = fountain.y - 1; y <= fountain.y + 2; y++) for (let x = fountain.x - 1; x <= fountain.x + 2; x++) keepClear[y]![x] = true

  // 6. Peak cliff ring and drift gate.
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const r = Math.sqrt(ellipse(x, y, PEAK.cx, PEAK.cy, PEAK.rx, PEAK.ry))
      if (r < 0.87 || r > 1.0) continue
      if (path[y]![x]) {
        solid[y]![x] = T.DRIFT
        ground[y]![x] = T.SNOW
      } else solid[y]![x] = T.CLIFF
      if (!land[y]![x]) ground[y]![x] = T.WATER
      keepClear[y]![x] = true
    }
  }

  // 7. Carrot patches (soil and fences).
  const patches = [
    { x: 13, y: 43, w: 5, h: 3 },
    { x: 19, y: 54, w: 5, h: 3 },
    { x: 8, y: 50, w: 4, h: 3 },
  ]
  const soil: Point[] = []
  for (const p of patches) {
    for (let y = p.y - 1; y <= p.y + p.h; y++)
      for (let x = p.x - 1; x <= p.x + p.w; x++) {
        if (!land[y]![x]) continue
        keepClear[y]![x] = true
        const edge = y === p.y - 1 || y === p.y + p.h || x === p.x - 1 || x === p.x + p.w
        if (!edge) {
          ground[y]![x] = T.SOIL
          soil.push({ x, y })
        } else if (y === p.y - 1 && !path[y]![x]) solid[y]![x] = T.FENCE // Fence along the top only.
        else if (!path[y]![x]) ground[y]![x] = T.GRASS
      }
  }

  // 8. Scatter obstacles and decoration by zone.
  const bush = (x: number, y: number) => (zone[y]![x] !== 'woods' && variant(x, y) < 35 ? T.FLOWER_BUSH : T.BUSH)
  const putTree = (x: number, y: number, bottom: number, top: number) => {
    // A sprinkle of apple trees outside the deep woods.
    if (bottom === T.TREE && variant(x, y) < (zone[y]![x] === 'woods' ? 8 : 30)) [bottom, top] = [T.APPLE_TREE, T.APPLE_TREE_TOP]
    solid[y]![x] = bottom
    if (y > 0 && above[y - 1]![x] === EMPTY) above[y - 1]![x] = top
  }
  for (let y = 1; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (!land[y]![x] || path[y]![x] || keepClear[y]![x] || solid[y]![x] !== EMPTY) continue
      const z = zone[y]![x]!
      const g = ground[y]![x]!
      const n = noise(x * 1.7, y * 1.7)
      if (z === 'woods') {
        if (chance(0.45 + n * 0.3)) putTree(x, y, T.TREE, T.TREE_TOP)
        else if (chance(0.06)) deco[y]![x] = T.MUSHROOM
        else if (chance(0.05)) solid[y]![x] = bush(x, y)
      } else if (z === 'peak') {
        if (chance(0.16 + n * 0.12)) putTree(x, y, T.PINE, T.PINE_TOP)
        else if (chance(0.05)) solid[y]![x] = T.SNOWROCK
      } else if (g === T.SAND) {
        if (chance(0.035)) putTree(x, y, T.PALM, T.PALM_TOP)
        else if (chance(0.04)) deco[y]![x] = T.SHELL
        else if (chance(0.015)) solid[y]![x] = T.ROCK
      } else if (z === 'meadow') {
        if (chance(0.025)) solid[y]![x] = T.ROCK
        else if (chance(0.03)) solid[y]![x] = bush(x, y)
        else if (chance(0.02)) putTree(x, y, T.TREE, T.TREE_TOP)
      } else {
        // Village and lake shores: a light sprinkle, denser away from the plaza.
        const far = Math.hypot(x - 48, y - 45) > 13
        if (chance(far ? 0.07 : 0.015)) putTree(x, y, T.TREE, T.TREE_TOP)
        else if (chance(0.025)) solid[y]![x] = bush(x, y)
        else if (chance(0.015)) deco[y]![x] = T.PEBBLES
      }
    }
  }
  for (const l of lamps)
    stamp(l.x, l.y, 1, (x, y) => {
      if (solid[y]![x] === T.FENCE) return
      if ([T.TREE, T.APPLE_TREE, T.PINE, T.PALM].includes(solid[y]![x] as never) && y > 0) above[y - 1]![x] = EMPTY
      solid[y]![x] = EMPTY
      deco[y]![x] = EMPTY
    })
  // Isle: one shady tree, Pip naps beside it.
  putTree(74, 45, T.TREE, T.TREE_TOP)
  // Lily pads.
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) if (lake[y]![x] && chance(0.07)) deco[y]![x] = T.LILY
  // Garden fences.
  for (let x = 54; x <= 59; x++) if (solid[41]![x] === EMPTY && !path[41]![x] && x !== 54) solid[41]![x] = T.FENCE

  // 9. Foam on water tiles below land.
  for (let y = 1; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) if (isWater(ground[y]![x]!) && land[y - 1]![x]) ground[y]![x] = T.FOAM

  // 10. Pickups.
  const walkable = (x: number, y: number) => inMap(x, y) && land[y]![x] && solid[y]![x] === EMPTY
  const nudge = (p: Point): Point => {
    for (let r = 0; r < 8; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) if (walkable(p.x + dx, p.y + dy)) return { x: p.x + dx, y: p.y + dy }
    throw new Error(`no walkable tile near ${p.x},${p.y}`)
  }
  const spread = (cands: Point[], n: number, minDist: number) => {
    const out: Point[] = []
    const pool = [...cands]
    for (let tries = 0; out.length < n && tries < 2000; tries++) {
      const c = pick(pool)
      if (out.every((o) => Math.hypot(o.x - c.x, o.y - c.y) >= minDist)) out.push(c)
    }
    return out
  }
  const carrots = spread(soil, 6, 2)
  const woodsTrail: Point[] = []
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) if (zone[y]![x] === 'woods' && path[y]![x] && walkable(x, y) && y < 28) woodsTrail.push({ x, y })
  const berries = spread(woodsTrail, 10, 4)
  const dewdrops = [{ x: 34, y: 10 }, { x: 8, y: 56 }, { x: 62, y: 70 }, { x: 58, y: 35 }].map(nudge)
  const bells = [{ x: 65, y: 19 }, { x: 80, y: 13 }, { x: 72, y: 7 }].map(nudge)

  return {
    ground,
    solid,
    above,
    deco,
    zone,
    spawns: { player, fountain, npcs, houses, signs, carrots, berries, dewdrops, bells, lamps },
  }
}
