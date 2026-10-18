<script setup lang="ts">
import type Phaser from 'phaser'
import { startMusic, stopMusic, unlockAudio } from '~/game/audio'
import { loadIntoState, newSave, persist, pushCloud, readLocalSave, save, ui } from '~/game/state'

const host = ref<HTMLDivElement>()
let game: Phaser.Game | null = null
let timers: ReturnType<typeof setInterval>[] = []
let lastCloud = ''

const startAudio = () => {
  unlockAudio()
  startMusic()
}

const onHidden = () => {
  if (document.visibilityState === 'hidden') persist()
}

onMounted(async () => {
  loadIntoState(readLocalSave() ?? newSave())
  persist()
  // Phaser text needs the pixel font to be ready before the first draw.
  await document.fonts?.load('10px "Yv Text"').catch(() => {})
  const { createGame } = await import('~/game')
  game = createGame(host.value!)
  // Dev-only handle for poking at the game from the console: __yettie.save, __yettie.world().
  if (import.meta.dev) Object.assign(window, { __yettie: { game, save, ui, world: () => game?.scene.getScene('world') } })

  window.addEventListener('pointerdown', startAudio, { once: true })
  window.addEventListener('keydown', startAudio, { once: true })
  window.addEventListener('beforeunload', persist)
  document.addEventListener('visibilitychange', onHidden)

  timers = [
    setInterval(persist, 5000),
    // Cloud backup once a minute, only when something meaningful changed.
    setInterval(() => {
      const sig = JSON.stringify([save.quests, save.inventory, save.sparkles, save.flags, save.wearing, Math.floor(save.steps / 100)])
      if (sig !== lastCloud) {
        lastCloud = sig
        void pushCloud()
      }
    }, 60_000),
  ]
})

onBeforeUnmount(() => {
  persist()
  timers.forEach(clearInterval)
  window.removeEventListener('beforeunload', persist)
  document.removeEventListener('visibilitychange', onHidden)
  window.removeEventListener('pointerdown', startAudio)
  window.removeEventListener('keydown', startAudio)
  stopMusic()
  game?.destroy(true)
  game = null
  ui.ready = false
  ui.dialog = null
  ui.panel = null
  ui.reward = null
  ui.ending = false
})
</script>

<template>
  <div ref="host" class="absolute inset-0 [&_canvas]:pixelated [&_canvas]:block" />
</template>
