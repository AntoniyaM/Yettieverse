<script setup lang="ts">
import { ui } from '~/game/state'

const COLORS = ['#ffd23f', '#ff7eb6', '#2ec4b6', '#b9a0e8', '#8be07a', '#ffffff']
const confetti = Array.from({ length: 36 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${(i % 9) * 0.07}s`,
  color: COLORS[i % COLORS.length],
  drift: `${((i * 53) % 80) - 40}px`,
  spin: `${((i * 97) % 720) - 360}deg`,
}))

const close = () => {
  ui.reward = null
  ui.inputLockedUntil = performance.now() + 250
}
const onKey = (e: KeyboardEvent) => {
  // The keypress that closed the dialog would otherwise close this too.
  if (!ui.reward || ui.dialog || e.repeat || performance.now() < ui.inputLockedUntil) return
  if ([' ', 'Enter', 'Escape', 'e'].includes(e.key)) {
    e.preventDefault()
    close()
  }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition name="pop">
    <div v-if="ui.reward" class="modal-backdrop" @click.self="close">
      <div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <i
          v-for="(c, i) in confetti"
          :key="i"
          class="absolute -top-3 h-3 w-2 animate-fall border-2 border-ink"
          :style="{ left: c.left, animationDelay: c.delay, background: c.color, '--drift': c.drift, '--spin': c.spin }"
        />
      </div>
      <section class="px-panel relative w-[min(380px,100%)] px-5 pt-[34px] pb-5 text-center" role="dialog" aria-label="Quest complete">
        <div class="absolute -top-[18px] left-1/2 -translate-x-1/2 rounded-md border-3 border-ink bg-pink px-[18px] py-1.5 text-lg whitespace-nowrap text-white shadow-[0_3px_0_var(--color-ink)] text-shadow-[0_2px_0_#c2507f]">
          Quest complete!
        </div>
        <h2 class="mb-3 text-[26px]">{{ ui.reward.title }}</h2>
        <ul class="mb-4 grid gap-2">
          <li
            v-for="(x, i) in [{ icon: 'diamond', label: `+${ui.reward.diamonds} diamonds`, emoji: false }, ...ui.reward.extras]"
            :key="x.label"
            class="flex animate-pop-in items-center gap-3 rounded-md border-2 border-ink bg-white px-3 py-2 text-left"
            :style="{ animationDelay: `${i * 0.15}s` }"
          >
            <span v-if="x.emoji" class="w-7 text-center text-2xl">{{ x.icon }}</span>
            <img v-else class="pixelated size-7 object-contain" :src="ui.portraits[x.icon]" alt="">
            <span>{{ x.label }}</span>
          </li>
        </ul>
        <button class="px-btn px-btn-teal" @click="close">Yay! <kbd>Space</kbd></button>
      </section>
    </div>
  </Transition>
</template>
