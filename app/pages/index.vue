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
const clouds = Array.from({ length: 6 }, (_, k) => {
  const i = k + 1
  return { top: `${i * 13 - 8}%`, animationDuration: `${40 + i * 9}s`, animationDelay: `${i * -11}s` }
})
const sparkles = Array.from({ length: 5 }, (_, k) => {
  const i = k + 1
  return { left: `${i * 19 - 10}%`, top: `${20 + Math.sin(i) * 30}%`, animationDelay: `${i * 0.37}s` }
})

const formatCode = (e: Event) => {
  const v = (e.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  code.value = v.length > 4 ? `${v.slice(0, 4)}-${v.slice(4)}` : v
}
</script>

<template>
  <main class="relative grid min-h-full place-items-center overflow-hidden bg-linear-to-b from-[#7cc6f5] via-[#bfe6ff] via-55% to-[#ffe9c7] px-4 pt-6 pb-8">
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <span
        v-for="(c, i) in clouds"
        :key="i"
        class="absolute -left-[200px] h-6 w-[120px] animate-drift rounded-[2px] bg-white opacity-85 shadow-[24px_-16px_0_#fff,56px_-8px_0_#fff,16px_8px_0_#eaf6ff]"
        :style="c"
      />
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

      <h1 class="font-logo text-[clamp(40px,10vw,72px)]/none font-bold tracking-[2px] text-teal [-webkit-text-stroke:2px_var(--color-ink)] text-shadow-[0_4px_0_var(--color-ink),0_8px_0_rgb(43_35_64/0.25)]">
        <span
          v-for="(ch, i) in 'YETTIEVERSE'"
          :key="i"
          class="inline-block animate-wave odd:text-yellow"
          :style="{ animationDelay: `${i * 0.08}s` }"
        >{{ ch }}</span>
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
