<script setup lang="ts">
import { ui } from '~/game/state'

const shown = ref(false)
let t: ReturnType<typeof setTimeout> | undefined
watch(
  () => ui.banner?.key,
  () => {
    shown.value = true
    clearTimeout(t)
    t = setTimeout(() => (shown.value = false), 2600)
  },
)
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-500 ease-[cubic-bezier(0.2,1.4,0.4,1)]"
    enter-from-class="opacity-0 -translate-y-3"
    leave-active-class="transition-all duration-600 ease-in"
    leave-to-class="opacity-0"
  >
    <div
      v-if="shown && ui.banner"
      :key="ui.banner.key"
      class="pointer-events-none absolute top-[16%] left-1/2 z-12 -translate-x-1/2 text-center text-cream text-shadow-[0_3px_0_var(--color-ink),2px_0_0_var(--color-ink),-2px_0_0_var(--color-ink),0_-2px_0_var(--color-ink)]"
      aria-live="polite"
    >
      <div class="mx-auto h-[3px] w-[220px] bg-linear-to-r from-transparent via-yellow to-transparent" />
      <h2 class="mt-1 text-[clamp(26px,5vw,40px)] tracking-[1px]">{{ ui.banner.name }}</h2>
      <p class="mt-0.5 mb-1 text-base">{{ ui.banner.tagline }}</p>
      <div class="mx-auto h-[3px] w-[220px] bg-linear-to-r from-transparent via-yellow to-transparent" />
    </div>
  </Transition>
</template>
