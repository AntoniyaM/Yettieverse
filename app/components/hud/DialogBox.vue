<script setup lang="ts">
import {sfx} from '~/game/audio'
import {NPCS} from '~/game/data'
import {closeDialog, save, speakerName, ui} from '~/game/state'

// Each speaker gets their own voice pitch (MIDI notes, all mellow).
const VOICE: Record<string, number> = {
  broc: 52,
  pear: 55,
  mama: 58,
  avo: 57,
  shelly: 50,
  yettie: 62,
  drip: 67,
  pip: 70,
  narrator: 60
}

const shown = ref(0)
const choice = ref(0)
const line = computed(() => (ui.dialog ? ui.dialog.lines[ui.dialog.index] : undefined))
const chars = computed(() => Array.from(line.value?.text ?? ''))
const typing = computed(() => shown.value < chars.value.length)
const text = computed(() => chars.value.slice(0, shown.value).join(''))

const portrait = computed(() => {
  const s = line.value?.speaker
  if (!s || s === 'narrator') return null
  if (s === 'yettie') return ui.portraits.yettie
  if (s === 'drip') return ui.portraits[save.quests.hydrate === 'done' ? 'npc-drip-1' : 'npc-drip-0']
  return ui.portraits[NPCS[s].portrait]
})

let timer: ReturnType<typeof setInterval> | undefined

watch(
    line,
    (l) => {
      clearInterval(timer)
      shown.value = 0
      choice.value = 0
      if (!l) return
      timer = setInterval(() => {
        if (shown.value >= chars.value.length) return clearInterval(timer)
        shown.value++
        if (shown.value % 4 === 0 && chars.value[shown.value - 1] !== ' ') sfx.blip(VOICE[l.speaker] ?? 60)
      }, 22)
    },
    {immediate: true},
)

function advance() {
  const d = ui.dialog
  if (!d || !line.value) return
  if (typing.value) {
    shown.value = chars.value.length
    return
  }
  if (line.value.choices) return closeDialog(choice.value)
  if (d.index < d.lines.length - 1) d.index++
  else closeDialog(-1)
}

function onKey(e: KeyboardEvent) {
  if (!ui.dialog) return
  const k = e.key.toLowerCase()
  if ([' ', 'enter', 'e'].includes(k)) {
    e.preventDefault()
    if (!e.repeat) advance()
  } else if (line.value?.choices && !typing.value) {
    const n = line.value.choices.length
    if (['arrowup', 'w', 'arrowleft', 'a'].includes(k)) choice.value = (choice.value + n - 1) % n
    if (['arrowdown', 's', 'arrowright', 'd'].includes(k)) choice.value = (choice.value + 1) % n
  }
}

onMounted(() => window.addEventListener('keydown', onKey))

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  clearInterval(timer)
})
</script>

<template>
  <Transition name="pop">
    <div
      v-if="line"
      class="px-panel absolute bottom-5 left-1/2 z-35 flex min-h-[120px] w-[min(720px,calc(100vw-24px))] -translate-x-1/2 cursor-pointer gap-3.5 px-[18px] py-3.5"
      role="dialog"
      aria-live="polite"
      @click="advance"
    >
      <div v-if="portrait" class="grid size-24 flex-none place-items-center rounded-md border-3 border-ink bg-radial-[at_50%_70%] from-white to-mint max-sm:size-16">
        <img class="pixelated size-20 object-contain max-sm:size-[52px]" :src="portrait" alt="">
      </div>
      <div class="relative flex-1">
        <div v-if="speakerName(line.speaker)" class="mb-1.5 inline-block rounded bg-ink px-2.5 py-0.5 text-[15px] text-yellow">{{ speakerName(line.speaker) }}</div>
        <p class="text-[19px]/[1.4] whitespace-pre-line max-sm:text-base" :class="{ 'text-ink-soft italic': line.speaker === 'narrator' }">
          {{ text }}<span class="invisible">{{ chars.slice(shown).join('') }}</span>
        </p>
        <div v-if="line.choices && !typing" class="mt-2.5 flex flex-wrap gap-2">
          <button
            v-for="(c, i) in line.choices"
            :key="c"
            class="px-btn px-btn-sm"
            :class="{ 'px-btn-ghost': i !== choice }"
            @click.stop="closeDialog(i)"
            @mouseenter="choice = i"
          >
            {{ i === choice ? '▶ ' : '' }}{{ c }}
          </button>
        </div>
        <span v-else-if="!typing" class="absolute right-0 -bottom-1 animate-blink">▼</span>
      </div>
    </div>
  </Transition>
</template>
