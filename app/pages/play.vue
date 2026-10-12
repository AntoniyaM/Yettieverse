<script setup lang="ts">
import { setMuted } from '~/game/audio'
import { readPrefs, ui, writePrefs } from '~/game/state'

useHead({ title: 'Yettieverse' })

function toggleMute() {
  ui.muted = !ui.muted
  setMuted(ui.muted)
  writePrefs({ muted: ui.muted })
}
provide('toggleMute', toggleMute)

// Dev-only helpers, loaded on mount in dev. The branch (and module) vanish from production builds.
let dev: typeof import('~/game/dev') | null = null

function onKey(e: KeyboardEvent) {
  if (!ui.ready || ui.dialog || ui.reward || ui.ending || e.repeat) return
  const k = e.key.toLowerCase()
  if (k === 'escape') ui.panel = ui.panel ? null : 'menu'
  else if (k === 'q' || k === 'j') ui.panel = ui.panel === 'quests' ? null : 'quests'
  else if (k === 'c' || k === 'i') ui.panel = ui.panel === 'wardrobe' ? null : 'wardrobe'
  else if (k === 'm') toggleMute()
  else if (k === 'n' && dev) dev.toggleDayNight()
  else return
  // So the key that closed a panel doesn't also reach the game.
  ui.inputLockedUntil = performance.now() + 150
}

onMounted(async () => {
  if (import.meta.dev) dev = await import('~/game/dev')
  ui.muted = readPrefs().muted
  setMuted(ui.muted)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="fixed inset-0 touch-none overflow-hidden bg-sky select-none">
    <GameCanvas />
    <template v-if="ui.ready">
      <HudOverlay />
      <HudZoneBanner />
      <HudToasts />
      <HudDialogBox />
      <HudQuestLog />
      <HudWardrobe />
      <HudPauseMenu />
      <HudRewardModal />
      <HudEndingCard />
      <HudTouchControls />
    </template>
    <div v-else class="absolute inset-0 grid place-items-center text-xl text-white text-shadow-[0_2px_0_var(--color-ink)]">Loading the Yettieverse…</div>
  </div>
</template>
