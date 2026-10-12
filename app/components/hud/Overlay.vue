<script setup lang="ts">
import { NPCS } from '~/game/data'
import { questProgress, save, trackedQuest, ui } from '~/game/state'

const toggleMute = inject<() => void>('toggleMute')!
// Dev-only tools. The import sits in a branch the production build removes.
const DevTools = import.meta.dev ? defineAsyncComponent(() => import('./DevTools.vue')) : null
const tracked = computed(() => trackedQuest())
const progress = computed(() => (tracked.value ? questProgress(tracked.value) : null))
const ready = computed(() => tracked.value && save.quests[tracked.value.id] === 'ready')
</script>

<template>
  <div class="pointer-events-none absolute inset-0 z-10">
    <div class="px-panel pointer-events-auto absolute top-3 left-3 flex items-center gap-2.5 py-1.5 pr-3 pl-1.5 text-base">
      <img class="pixelated size-10 rounded border-2 border-ink bg-mint" :src="ui.portraits.yettie" alt="">
      <div>
        <div class="flex items-center gap-1"><img class="pixelated w-[15px]" :src="ui.portraits.spark" alt="">{{ save.sparkles }}</div>
        <div class="flex items-center gap-1 text-[13px] opacity-75">👣 {{ save.steps.toLocaleString() }}</div>
      </div>
      <div v-if="ui.zone" class="border-l-2 border-dashed border-[#e3d3ae] pl-2.5 text-sm text-ink-soft compact:hidden">{{ ui.zone }}</div>
    </div>

    <button
      v-if="tracked"
      class="px-panel pointer-events-auto absolute top-3 right-3 w-[min(260px,calc(100vw-24px))] cursor-pointer px-3 pt-2 pb-2.5 text-left compact:top-auto compact:bottom-[168px] compact:w-[200px]"
      :class="{ 'animate-nudge bg-[#eaffd8]': ready }"
      @click="ui.panel = 'quests'"
    >
      <div class="flex items-center gap-1.5 text-[15px]">
        <img class="pixelated w-3.5" :src="ui.portraits[ready ? 'ind-ready' : 'ind-active']" alt="">
        {{ tracked.title }}
      </div>
      <div v-if="ready" class="mt-1 flex items-center gap-1.5 text-[13px]">Return to {{ NPCS[tracked.giver].name }}!</div>
      <template v-else-if="progress">
        <div class="mt-1 flex items-center gap-1.5 text-[13px]">
          <img v-if="progress.icon" class="pixelated w-3" :src="ui.portraits[progress.icon]" alt="">
          {{ progress.have.toLocaleString() }}/{{ progress.need.toLocaleString() }} {{ progress.label }}
        </div>
        <div class="mt-1.5 h-2 overflow-hidden rounded-[3px] border-2 border-ink bg-cream">
          <span class="block h-full bg-teal transition-[width] duration-300" :style="{ width: `${(progress.have / progress.need) * 100}%` }" />
        </div>
      </template>
    </button>

    <div class="pointer-events-auto absolute right-3 bottom-3 flex gap-2 compact:top-16 compact:right-auto compact:bottom-auto compact:left-3 compact:[&_kbd]:hidden">
      <component :is="DevTools" v-if="DevTools" />
      <button class="px-btn px-btn-ghost px-btn-sm" @click="ui.panel = 'quests'"><kbd class="mr-0.5">Q</kbd> Quests</button>
      <button class="px-btn px-btn-ghost px-btn-sm" @click="ui.panel = 'wardrobe'"><kbd class="mr-0.5">C</kbd> Wardrobe</button>
      <button class="px-btn px-btn-ghost px-btn-sm" :aria-label="ui.muted ? 'Unmute' : 'Mute'" @click="toggleMute">{{ ui.muted ? '🔇' : '🔊' }}</button>
      <button class="px-btn px-btn-ghost px-btn-sm" @click="ui.panel = 'menu'"><kbd class="mr-0.5">Esc</kbd> Menu</button>
    </div>

    <Transition name="fade">
      <div
        v-if="ui.prompt && !ui.dialog && !ui.panel"
        class="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3.5 py-2 text-[15px] whitespace-nowrap text-cream compact:bottom-[160px] compact:[&_kbd]:hidden"
      >
        <kbd>Space</kbd> {{ ui.prompt }}
      </div>
    </Transition>
  </div>
</template>
