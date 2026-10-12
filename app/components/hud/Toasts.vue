<script setup lang="ts">
import { ui } from '~/game/state'
</script>

<template>
  <TransitionGroup
    tag="div"
    class="pointer-events-none absolute top-[70px] left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5"
    enter-active-class="transition-all duration-300 ease-[cubic-bezier(0.2,1.5,0.4,1)]"
    enter-from-class="opacity-0 -translate-y-2.5 scale-90"
    leave-active-class="transition-all duration-250"
    leave-to-class="opacity-0"
    aria-live="polite"
  >
    <div
      v-for="t in ui.toasts"
      :key="t.id"
      class="flex items-center gap-2 rounded-md border-3 border-ink bg-cream px-3.5 py-[7px] text-[15px] whitespace-nowrap shadow-[0_3px_0_var(--color-ink)]"
    >
      <img v-if="t.icon && ui.portraits[t.icon]" class="pixelated w-3.5" :src="ui.portraits[t.icon]" alt="">
      {{ t.text }}
    </div>
  </TransitionGroup>
</template>
