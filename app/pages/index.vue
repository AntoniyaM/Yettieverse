<script setup lang="ts">
import { QUESTS } from '~/game/data'
import { fetchCloudSave, newSave, readLocalSave, writeLocalSave, type SaveData } from '~/game/state'

useHead({ title: 'Yettieverse · a cozy pixel adventure' })

// Saves live in the browser, so everything save-related waits for mount (no hydration mismatch).
const existing = ref<SaveData | null>(null)
const mounted = ref(false)
const showLoad = ref(false)
const confirmNew = ref(false)
const code = ref('')
const loadError = ref('')
const loading = ref(false)

onMounted(() => {
  existing.value = readLocalSave()
  mounted.value = true
})

const doneCount = computed(() => (existing.value ? QUESTS.filter((q) => existing.value!.quests[q.id] === 'done').length : 0))
const playTime = computed(() => {
  const s = existing.value?.playTime ?? 0
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h ? `${h}h ${m}m` : `${m}m`
})

const startNew = () => {
  if (existing.value && !confirmNew.value) {
    confirmNew.value = true
    return
  }
  writeLocalSave(newSave())
  navigateTo('/play')
}

const loadCode = async () => {
  loadError.value = ''
  loading.value = true
  try {
    const data = await fetchCloudSave(code.value)
    writeLocalSave(data)
    navigateTo('/play')
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode
    loadError.value = status === 404 ? 'No save found for that code.' : status === 400 ? 'Codes look like ABCD-2345.' : 'Could not reach the cloud. Try again?'
  } finally {
    loading.value = false
  }
}

// Decorative layout for the clouds and sparkles, staggered so they never move in sync.
// Far clouds are smaller, fainter and slower; each starts at a different point of its drift.
const CLOUD_SIZES = { large: [56, 22], medium: [40, 18], small: [26, 13] } as const
const clouds = (
  [
    ['large', 4, 8, 70, 0.15],
    ['small', 3, 17, 110, 0.6],
    ['medium', 4, 30, 80, 0.85],
    ['small', 3, 45, 120, 0.35],
    ['large', 5, 60, 60, 0.55],
    ['medium', 3, 74, 100, 0.05],
    ['small', 4, 86, 90, 0.75],
  ] as const
).map(([size, scale, top, seconds, at]) => ({
  src: `/sprites/ui/cloud-${size}.png`,
  style: {
    top: `${top}%`,
    width: `${CLOUD_SIZES[size][0] * scale}px`,
    opacity: scale === 3 ? 0.7 : 0.95,
    animationDuration: `${seconds}s`,
    animationDelay: `${-seconds * at}s`,
  },
}))
const sparkles = Array.from({ length: 5 }, (_, k) => {
  const i = k + 1
  return { left: `${i * 19 - 10}%`, top: `${20 + Math.sin(i) * 30}%`, animationDelay: `${i * 0.37}s` }
})

// Slices of public/sprites/ui/title.svg: [x, width] of each letter in art pixels, scaled by --s.
const TITLE_SIZE = [133, 25]
const TITLE_LETTERS = [[1, 13], [14, 13], [27, 11], [38, 11], [49, 7], [56, 13], [69, 15], [84, 13], [97, 10], [107, 12], [119, 13]].map(
  ([x, w], i) => ({
    width: `calc(${w} * var(--s))`,
    height: `calc(${TITLE_SIZE[1]} * var(--s))`,
    backgroundSize: `calc(${TITLE_SIZE[0]} * var(--s)) calc(${TITLE_SIZE[1]} * var(--s))`,
    backgroundPosition: `calc(${-x!} * var(--s)) 0`,
    animationDelay: `${i * 0.08}s`,
  }),
)

const formatCode = (e: Event) => {
  const v = (e.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  code.value = v.length > 4 ? `${v.slice(0, 4)}-${v.slice(4)}` : v
}
</script>

<template>
  <main class="relative grid min-h-full place-items-center overflow-hidden bg-linear-to-b from-[#7cc6f5] via-[#bfe6ff] via-55% to-[#ffe9c7] px-4 pt-6 pb-8">
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <img
        v-for="(c, i) in clouds"
        :key="i"
        class="pixelated absolute -left-[300px] animate-drift"
        :src="c.src"
        :style="c.style"
        alt=""
      >
    </div>

    <section class="relative flex max-w-[560px] flex-col items-center gap-3.5 text-center">
      <div class="relative h-[200px] w-48" aria-hidden="true">
        <div class="pixelated absolute inset-x-0 top-0 bottom-2 animate-yettie-idle bg-[url(/sprites/characters/yettie.png)] bg-size-[960px_768px] bg-no-repeat" />
        <div class="absolute inset-x-[38px] bottom-1 h-3.5 animate-shadow-pulse rounded-[50%] bg-ink/20" />
        <span
          v-for="(sp, i) in sparkles"
          :key="i"
          class="absolute animate-twinkle text-[18px] text-yellow text-shadow-[0_2px_0_var(--color-gold)]"
          :style="sp"
        >✦</span>
      </div>

      <!-- The title is pixel art (Yazio Sans letters) stored as an SVG of squares, shown a letter at a time so each can wave. Being vector, it stays crisp while gliding smoothly between screen pixels. -->
      <h1 class="flex [--s:2px] min-[480px]:[--s:3px] md:[--s:4px]">
        <span class="sr-only">Yettieverse</span>
        <span
          v-for="(l, i) in TITLE_LETTERS"
          :key="i"
          class="inline-block animate-wave bg-[url(/sprites/ui/title.svg)] bg-no-repeat will-change-transform"
          :style="l"
          aria-hidden="true"
        />
      </h1>
      <p class="text-lg text-ink-soft">A cozy little island adventure. Help friends, find snacks, ring the Wishing Bells.</p>

      <div class="px-panel flex w-[min(360px,100%)] flex-col gap-3 p-[18px]">
        <template v-if="mounted">
          <button v-if="existing" class="px-btn px-btn-teal flex flex-col items-center gap-1.5 px-4 py-3.5 text-xl/none" @click="navigateTo('/play')">
            ▶ Continue
            <small class="text-xs opacity-95">{{ doneCount }}/{{ QUESTS.length }} quests · {{ existing.sparkles }} ✨ · {{ playTime }}</small>
          </button>
          <button
            class="px-btn"
            :class="existing ? 'px-btn-ghost' : 'px-btn-teal flex flex-col items-center gap-1.5 px-4 py-3.5 text-xl/none'"
            @click="startNew"
          >
            {{ confirmNew ? 'Really? This overwrites your save' : existing ? 'New adventure' : '▶ Start adventure' }}
          </button>
          <button v-if="!showLoad" class="px-btn px-btn-ghost px-btn-sm" @click="showLoad = true">I have a save code</button>
          <form v-else class="flex gap-2" @submit.prevent="loadCode">
            <input
              :value="code"
              placeholder="ABCD-2345"
              aria-label="Save code"
              autocomplete="off"
              spellcheck="false"
              class="min-w-0 flex-1 rounded-md border-3 border-ink bg-white px-2 py-1.5 text-center text-lg tracking-[2px] text-ink"
              @input="formatCode"
            >
            <button class="px-btn px-btn-sm" :disabled="code.length !== 9 || loading">{{ loading ? '…' : 'Load' }}</button>
          </form>
          <p v-if="loadError" class="text-sm text-[#c0392b]">{{ loadError }}</p>
        </template>
        <p v-else class="my-2">Fluffing pixels…</p>
      </div>

      <p class="mt-1 text-[13px] leading-loose text-ink-soft">
        <kbd>←↑↓→</kbd>/<kbd>WASD</kbd> move · <kbd>Space</kbd> talk · <kbd>Q</kbd> quests · <kbd>C</kbd> wardrobe ·
        <kbd>Esc</kbd> menu
      </p>
    </section>
  </main>
</template>
