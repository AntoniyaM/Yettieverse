<script setup lang="ts">
import { NPCS } from '~/game/data'
import { questProgress, save, trackedQuests, ui } from '~/game/state'

const toggleMute = inject<() => void>('toggleMute')!
// Dev-only tools. The import sits in a branch the production build removes.
const DevTools = import.meta.dev ? defineAsyncComponent(() => import('./DevTools.vue')) : null
const tracked = computed(() =>
  trackedQuests().map((q) => ({ q, ready: save.quests[q.id] === 'ready', progress: questProgress(q) })),
)
</script>

<template>
  <div class="pointer-events-none absolute inset-0 z-10">
    <div class="px-panel pointer-events-auto absolute top-3 left-3 flex items-center gap-2.5 py-1.5 pr-3 pl-1.5 text-base">
      <img class="pixelated size-10 rounded border-2 border-ink bg-mint" :src="ui.portraits.yettie" alt="">
      <div>
        <div class="flex items-center gap-1"><img class="pixelated w-[13px]" :src="ui.portraits.diamond" alt="Diamonds">{{ save.diamonds }}</div>
        <div class="flex items-center gap-1 text-[13px] opacity-75">👣 {{ save.steps.toLocaleString() }}</div>
      </div>
      <div v-if="ui.zone" class="border-l-2 border-dashed border-[#e3d3ae] pl-2.5 text-sm text-ink-soft compact:hidden">{{ ui.zone }}</div>
    </div>

    <div
      v-if="tracked.length"
      class="absolute top-3 right-3 flex w-[min(260px,calc(100vw-24px))] flex-col gap-2 compact:top-auto compact:bottom-[168px] compact:w-[200px] compact:gap-1.5"
    >
      <button
        v-for="{ q, ready, progress } in tracked"
        :key="q.id"
        class="px-panel pointer-events-auto cursor-pointer px-3 pt-2 pb-2.5 text-left compact:px-2.5 compact:py-1.5"
        :class="{ 'animate-nudge bg-[#eaffd8]': ready }"
        @click="ui.panel = 'quests'"
      >
        <div class="flex items-center gap-1.5 text-[15px]">
          <img class="pixelated w-3.5" :src="ui.portraits[ready ? 'ind-ready' : 'ind-active']" alt="">
          {{ q.title }}
        </div>
        <div v-if="ready" class="mt-1 flex items-center gap-1.5 text-[13px]">Return to {{ NPCS[q.giver].name }}!</div>
        <template v-else>
          <div class="mt-1 flex items-center gap-1.5 text-[13px]">
            <img v-if="progress.icon" class="pixelated w-3" :src="ui.portraits[progress.icon]" alt="">
            {{ progress.have.toLocaleString() }}/{{ progress.need.toLocaleString() }} {{ progress.label }}
          </div>
          <div class="mt-1.5 h-2 overflow-hidden rounded-[3px] border-2 border-ink bg-cream compact:hidden">
            <span class="block h-full bg-teal transition-[width] duration-300" :style="{ width: `${(progress.have / progress.need) * 100}%` }" />
          </div>
        </template>
      </button>
    </div>

    <button
      class="px-panel pointer-events-auto absolute bottom-3 left-3 w-[200px] cursor-pointer p-1 compact:top-[108px] compact:right-3 compact:bottom-auto compact:left-auto compact:w-[124px]"
      aria-label="Open the map"
      @click="ui.panel = 'map'"
    >
      <HudMapView class="rounded-[3px]" />
      <kbd class="absolute right-2 bottom-2 compact:hidden">Tab</kbd>
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
