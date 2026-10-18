// What happens when Yettie talks to someone or pokes something.
import { DOORS, FORTUNES, NAP, NPCS, PIP_LINES, QUESTS, VIEWS, type DialogLine, type NpcId } from './data'
import { acceptQuest, bus, completeQuest, save, say, setFlag, toast } from './state'

const pickOne = <V>(arr: V[]) => arr[Math.floor(Math.random() * arr.length)]!
const line = (speaker: DialogLine['speaker'], text: string): DialogLine => ({ speaker, text })

export const indicatorFor = (npc: NpcId): 'available' | 'active' | 'ready' | null => {
  if (npc === 'pip') return save.quests.pip === 'active' && !save.flags.pipFollowing ? 'available' : null
  const q = QUESTS.find((d) => d.giver === npc && save.quests[d.id] !== 'done' && save.quests[d.id] !== 'locked')
  if (!q) return null
  const st = save.quests[q.id]
  return st === 'available' ? 'available' : st === 'ready' ? 'ready' : 'active'
}

export const talkTo = async (npc: NpcId) => {
  if (npc === 'pip') return talkToPip()

  const mine = QUESTS.filter((q) => q.giver === npc)
  const q = mine.find((d) => save.quests[d.id] === 'ready') ?? mine.find((d) => ['available', 'active'].includes(save.quests[d.id]))

  if (q && save.quests[q.id] === 'ready') {
    await say(q.done)
    completeQuest(q.id)
    if (q.id === 'hydrate') bus.emit('fountain')
    if (q.id === 'pip') bus.emit('pip-home')
    if (q.id === 'bells') bus.emit('finale')
    return
  }
  if (q && save.quests[q.id] === 'available') {
    await say(q.intro)
    acceptQuest(q.id)
    return
  }
  if (q && save.quests[q.id] === 'active') {
    await say(q.waiting)
    return
  }
  const locked = mine.find((d) => save.quests[d.id] === 'locked')
  if (locked?.locked) {
    await say(locked.locked)
    return
  }
  await say([line(npc, pickOne(NPCS[npc].idle))])
}

const talkToPip = async () => {
  if (save.quests.pip === 'active' && !save.flags.pipFollowing) {
    await say(PIP_LINES.found)
    setFlag('pipFollowing')
    bus.emit('pip-follow')
    bus.emit('sfx', 'hug')
    return
  }
  if (save.flags.pipFollowing && save.quests.pip !== 'done') {
    await say([line('pip', pickOne(PIP_LINES.following))])
    return
  }
  if (save.quests.pip === 'done') {
    await say([line('pip', pickOne(NPCS.pip.idle))])
    return
  }
  await say([line('pip', 'Zzz... butterflies... zzz...')])
}

export const readSign = async (text: string) => {
  await say([line('narrator', text)])
}

export const knockDoor = async (kind: string) => {
  if (kind === 'mama') return napAtHome()
  await say([line('narrator', DOORS[kind] ?? 'Knock knock. Nobody home.')])
}

// Home is where the naps are: skip to night or to morning, so nobody has to wait for the moon.
const napAtHome = async () => {
  const night = save.clock > 0.64 || save.clock < 0.04
  const nap = night ? NAP.night : NAP.day
  const pick = await say([{ speaker: 'narrator', text: nap.text, choices: [nap.choice, 'Not now'] }])
  if (pick !== 0) return
  bus.emit('nap', night ? 0.1 : 0.74)
}

export const enjoyView = async (i: number) => {
  await say([line('narrator', VIEWS[i] ?? 'What a view.')])
  const flag = `view${i}`
  if (save.quests.tour !== 'active' || save.flags[flag]) return
  bus.emit('sfx', 'accept')
  setFlag(flag)
  const seen = VIEWS.filter((_, n) => save.flags[`view${n}`]).length
  toast(`Lookout ${seen}/${VIEWS.length} visited`, 'spark')
}

export const useFountain = async () => {
  if (save.quests.hydrate !== 'done') {
    await say([line('narrator', 'The fountain is bone dry. Only a few sad pebbles at the bottom.')])
    return
  }
  if (save.sparkles < 5) {
    await say([line('narrator', 'The fountain sparkles invitingly. You need 5 ✨ to make a wish.')])
    return
  }
  const pick = await say([
    { speaker: 'narrator', text: `The water shimmers. Make a wish? (you have ${save.sparkles} ✨)`, choices: ['Toss 5 ✨', 'Not now'] },
  ])
  if (pick !== 0) return
  save.sparkles -= 5
  save.wishes++
  bus.emit('sfx', 'wish')
  bus.emit('wish')
  await say([line('narrator', '*plink* The fountain swirls and whispers...'), line('narrator', `"${pickOne(FORTUNES)}"`)])
}

export const ringBell = async (i: number) => {
  const flag = `bell${i}`
  if (save.flags[flag]) {
    await say([line('narrator', 'The bell hums softly. It remembers you.')])
    return
  }
  if (save.quests.bells !== 'active') {
    await say([line('narrator', 'A dusty old bell. Maybe someone knows what it is for.')])
    return
  }
  bus.emit('sfx', 'bell')
  bus.emit('bell', i)
  setFlag(flag)
  const rung = [0, 1, 2].filter((n) => save.flags[`bell${n}`]).length
  toast(rung < 3 ? `Wishing Bell ${rung}/3 rings out!` : 'All three bells! Something magical is happening...', 'note')
}
