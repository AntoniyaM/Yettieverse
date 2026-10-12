// The single source of truth shared by Phaser (writes) and the Vue HUD (reads).
// No Phaser import here, so the SSR'd title page can use the save helpers.
import { markRaw, reactive } from 'vue'
import {
  ABILITIES,
  COSMETICS,
  ITEMS,
  NPCS,
  QUESTS,
  type AbilityId,
  type CosmeticId,
  type DialogLine,
  type ItemId,
  type QuestDef,
  type QuestId,
} from './data'

export type QuestStatus = 'locked' | 'available' | 'active' | 'ready' | 'done'
export type Facing = 'down' | 'up' | 'left' | 'right'

export interface SaveData {
  version: 1
  code: string
  createdAt: number
  updatedAt: number
  player: { x: number; y: number; facing: Facing } | null
  sparkles: number
  steps: number
  playTime: number
  // Day clock, from 0 to 1.
  clock: number
  inventory: Record<ItemId, number>
  collected: string[]
  quests: Record<QuestId, QuestStatus>
  questStart: Partial<Record<QuestId, number>>
  abilities: Record<AbilityId, boolean>
  owned: CosmeticId[]
  wearing: { hat: CosmeticId | null; face: CosmeticId | null }
  flags: Record<string, boolean>
  wishes: number
}

const LOCAL_KEY = 'yettieverse:save'
const PREFS_KEY = 'yettieverse:prefs'

// Save model.
export function generateCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const part = () => Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join('')
  return `${part()}-${part()}`
}

export function newSave(): SaveData {
  const now = Date.now()
  return {
    version: 1,
    code: generateCode(),
    createdAt: now,
    updatedAt: now,
    player: null,
    sparkles: 0,
    steps: 0,
    playTime: 0,
    clock: 0.12,
    inventory: { carrot: 0, berry: 0, dewdrop: 0 },
    collected: [],
    quests: Object.fromEntries(QUESTS.map((q) => [q.id, q.requires.length ? 'locked' : 'available'])) as Record<
      QuestId,
      QuestStatus
    >,
    questStart: {},
    abilities: { dash: false, floatie: false, boots: false },
    owned: [],
    wearing: { hat: null, face: null },
    flags: {},
    wishes: 0,
  }
}

// Fills gaps when an older/partial save is loaded.
function normalize(data: Partial<SaveData>): SaveData {
  const base = newSave()
  return {
    ...base,
    ...data,
    inventory: { ...base.inventory, ...data.inventory },
    quests: { ...base.quests, ...data.quests },
    abilities: { ...base.abilities, ...data.abilities },
    wearing: { ...base.wearing, ...data.wearing },
    flags: { ...data.flags },
  }
}

export function readLocalSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? normalize(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function writeLocalSave(data: SaveData) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
  } catch {
    // Private mode or quota exceeded: the game still runs, it just won't remember.
  }
}

export async function fetchCloudSave(code: string): Promise<SaveData> {
  const data = await $fetch<SaveData>(`/api/saves/${encodeURIComponent(code.trim().toUpperCase())}`)
  return normalize(data)
}

export const save = reactive<SaveData>(newSave())

export function loadIntoState(data: SaveData) {
  Object.assign(save, normalize(data))
}

export function persist() {
  save.updatedAt = Date.now()
  writeLocalSave(JSON.parse(JSON.stringify(save)))
}

export async function pushCloud() {
  persist()
  ui.cloud = 'saving'
  try {
    await $fetch(`/api/saves/${save.code}`, { method: 'PUT', body: save })
    ui.cloud = 'saved'
    ui.cloudAt = Date.now()
  } catch {
    ui.cloud = 'error'
  }
}

// Prefs (per device, not part of the save).

export function readPrefs(): { muted: boolean } {
  try {
    return { muted: false, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }
  } catch {
    return { muted: false }
  }
}
export function writePrefs(p: { muted: boolean }) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p))
  } catch {
    // Ignore: prefs are a nicety.
  }
}

// UI state.
export interface Toast {
  id: number
  text: string
  icon?: string
}
export interface RewardView {
  title: string
  sparkles: number
  extras: { icon: string; label: string; emoji?: boolean }[]
}

export const ui = reactive({
  ready: false,
  dialog: null as null | { lines: DialogLine[]; index: number; resolve: (choice: number) => void },
  panel: null as null | 'quests' | 'wardrobe' | 'menu',
  reward: null as null | RewardView,
  ending: false,
  toasts: [] as Toast[],
  zone: '',
  banner: null as null | { name: string; tagline: string; key: number },
  prompt: '',
  touch: { x: 0, y: 0, dash: false },
  inputLockedUntil: 0,
  portraits: markRaw({}) as Record<string, string>,
  cloud: 'idle' as 'idle' | 'saving' | 'saved' | 'error',
  cloudAt: 0,
  muted: false,
  // Front-frame measurements, for the wardrobe preview.
  yettieFront: null as null | { top: number; cx: number; eyes: { cx: number; cy: number } | null },
})

export const isBlocking = () => !!(ui.dialog || ui.panel || ui.reward || ui.ending)

let toastId = 0
export function toast(text: string, icon?: string) {
  const t = { id: ++toastId, text, icon }
  ui.toasts.push(t)
  setTimeout(() => {
    const i = ui.toasts.indexOf(t)
    if (i >= 0) ui.toasts.splice(i, 1)
  }, 3200)
}

// Opens the dialog box; resolves with the picked choice index (or -1).
export function say(lines: DialogLine[]): Promise<number> {
  return new Promise((resolve) => {
    ui.dialog = { lines, index: 0, resolve }
  })
}
export function closeDialog(choice = -1) {
  const d = ui.dialog
  ui.dialog = null
  ui.inputLockedUntil = performance.now() + 200
  d?.resolve(choice)
}

export function speakerName(id: string) {
  if (id === 'yettie') return 'Yettie'
  if (id === 'narrator') return ''
  return NPCS[id as keyof typeof NPCS]?.name ?? id
}

// Tiny event bus (state → scene).
type Handler = (payload?: unknown) => void
const handlers = new Map<string, Set<Handler>>()
export const bus = {
  on(evt: string, fn: Handler) {
    if (!handlers.has(evt)) handlers.set(evt, new Set())
    handlers.get(evt)!.add(fn)
    return () => handlers.get(evt)!.delete(fn)
  },
  emit(evt: string, payload?: unknown) {
    handlers.get(evt)?.forEach((fn) => fn(payload))
  },
}

// Quest engine.
export const questDef = (id: QuestId) => QUESTS.find((q) => q.id === id)!

export function questProgress(q: QuestDef): { have: number; need: number; label: string; icon?: string } {
  const o = q.objective
  if (o.type === 'collect')
    return { have: Math.min(save.inventory[o.item], o.count), need: o.count, label: ITEMS[o.item].plural, icon: ITEMS[o.item].icon }
  if (o.type === 'steps') {
    const start = save.questStart[q.id] ?? save.steps
    return { have: Math.min(save.steps - start, o.count), need: o.count, label: 'steps' }
  }
  return { have: o.flags.filter((f) => save.flags[f]).length, need: o.flags.length, label: o.label }
}

// Unlocks quests whose requirements are done, and flags active ones as ready.
export function refreshQuests() {
  for (const q of QUESTS) {
    const st = save.quests[q.id]
    if (st === 'locked' && q.requires.every((r) => save.quests[r] === 'done')) {
      save.quests[q.id] = 'available'
      bus.emit('quests')
    }
    if (st === 'active') {
      const p = questProgress(q)
      if (p.have >= p.need) {
        save.quests[q.id] = 'ready'
        toast(`${q.title}: return to ${NPCS[q.giver].name}!`, 'ind-ready')
        bus.emit('quests')
      }
    }
  }
}

export function acceptQuest(id: QuestId) {
  save.quests[id] = 'active'
  save.questStart[id] = save.steps
  toast(`New quest: ${questDef(id).title}`, 'ind-available')
  bus.emit('quests')
  bus.emit('sfx', 'accept')
  refreshQuests()
}

export function completeQuest(id: QuestId) {
  const q = questDef(id)
  if (q.objective.type === 'collect') save.inventory[q.objective.item] -= q.objective.count
  save.quests[id] = 'done'
  const { sparkles, cosmetic, ability } = q.reward
  save.sparkles += sparkles
  const extras: RewardView['extras'] = []
  if (cosmetic) {
    if (!save.owned.includes(cosmetic)) save.owned.push(cosmetic)
    const c = COSMETICS[cosmetic]
    save.wearing[c.slot] = cosmetic // Wear it right away: instant gratification.
    extras.push({ icon: c.icon, label: c.name })
  }
  if (ability) {
    save.abilities[ability] = true
    extras.push({ icon: ABILITIES[ability].icon, label: `${ABILITIES[ability].name}: ${ABILITIES[ability].blurb}`, emoji: true })
  }
  ui.reward = { title: q.title, sparkles, extras }
  bus.emit('sfx', 'complete')
  bus.emit('quests')
  refreshQuests()
  persist()
  void pushCloud()
}

export function addItem(item: ItemId, pickupId: string) {
  if (save.collected.includes(pickupId)) return
  save.collected.push(pickupId)
  save.inventory[item]++
  refreshQuests()
}

export function setFlag(flag: string) {
  if (save.flags[flag]) return
  save.flags[flag] = true
  refreshQuests()
}

// The quest shown in the HUD tracker: ready first, then active, in story order.
export function trackedQuest() {
  return (
    QUESTS.find((q) => save.quests[q.id] === 'ready') ?? QUESTS.find((q) => save.quests[q.id] === 'active') ?? null
  )
}

export function setPortraits(p: Record<string, string>) {
  ui.portraits = markRaw(p)
}
