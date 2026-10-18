<script setup lang="ts">
import { bus, ui } from '~/game/state'

// Only rendered on touch-first devices.
const enabled = ref(false)
const knob = ref({ x: 0, y: 0 })
let origin: { x: number; y: number } | null = null
let pointer = -1
const R = 44

onMounted(() => {
  enabled.value = matchMedia('(pointer: coarse)').matches
})

const start = (e: PointerEvent) => {
  pointer = e.pointerId
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  move(e)
}
const move = (e: PointerEvent) => {
  if (!origin || e.pointerId !== pointer) return
  let dx = e.clientX - origin.x, dy = e.clientY - origin.y
  const d = Math.hypot(dx, dy)
  if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R }
  knob.value = { x: dx, y: dy }
  ui.touch.x = Math.abs(dx) > 8 ? dx / R : 0
  ui.touch.y = Math.abs(dy) > 8 ? dy / R : 0
}
const end = () => {
  origin = null
  pointer = -1
  knob.value = { x: 0, y: 0 }
  ui.touch.x = 0
  ui.touch.y = 0
}
const action = () => {
  if (ui.dialog) return // The dialog box handles its own taps.
  if (ui.reward || ui.ending) return
  bus.emit('touch-interact')
}
</script>

<template>
  <div v-if="enabled" class="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-40 pb-[env(safe-area-inset-bottom)]">
    <div
      class="pointer-events-auto absolute bottom-6 left-6 grid size-[120px] touch-none place-items-center rounded-full border-3 border-ink/50 bg-ink/25"
      @pointerdown="start"
      @pointermove="move"
      @pointerup="end"
      @pointercancel="end"
    >
      <div class="size-[52px] rounded-full border-3 border-ink bg-cream shadow-[0_3px_0_var(--color-ink)]" :style="{ transform: `translate(${knob.x}px, ${knob.y}px)` }" />
    </div>
    <div class="pointer-events-auto absolute right-6 bottom-[30px] flex items-end gap-3.5">
      <button
        class="size-[60px] touch-none rounded-full border-3 border-ink bg-mint text-[13px] text-ink shadow-[0_4px_0_var(--color-ink)]"
        @pointerdown="ui.touch.dash = true"
        @pointerup="ui.touch.dash = false"
        @pointercancel="ui.touch.dash = false"
        @pointerleave="ui.touch.dash = false"
      >
        Dash
      </button>
      <button class="size-[76px] touch-none rounded-full border-3 border-ink bg-yellow text-[26px] text-ink shadow-[0_4px_0_var(--color-ink)]" @pointerdown.prevent="action">A</button>
    </div>
  </div>
</template>
