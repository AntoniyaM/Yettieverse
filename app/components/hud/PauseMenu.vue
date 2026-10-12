<script setup lang="ts">
import { persist, pushCloud, save, ui } from '~/game/state'

const toggleMute = inject<() => void>('toggleMute')!
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(save.code)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // Clipboard is blocked; the code is visible on screen anyway.
  }
}

function quit() {
  persist()
  ui.panel = null
  navigateTo('/')
}

const cloudLabel = computed(
  () =>
    ({
      idle: 'Back up to the cloud',
      saving: 'Saving…',
      saved: `Saved ✓ ${ui.cloudAt ? new Date(ui.cloudAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`,
      error: 'Cloud unreachable. Retry?',
    })[ui.cloud],
)
</script>

<template>
  <Transition name="pop">
    <div v-if="ui.panel === 'menu'" class="modal-backdrop" @click.self="ui.panel = null">
      <section class="px-panel flex w-[min(420px,100%)] flex-col gap-3.5 p-[18px]" role="dialog" aria-label="Menu">
        <h2 class="text-center text-[28px]">Paused</h2>

        <div class="flex flex-col gap-2 rounded-md border-2 border-dashed border-ink-soft bg-white p-3">
          <small>Your save code. Use it to continue on another device.</small>
          <div class="flex items-center justify-between">
            <strong class="text-[26px] font-normal tracking-[3px] text-teal-dark">{{ save.code }}</strong>
            <button class="px-btn px-btn-ghost px-btn-sm" @click="copy">{{ copied ? 'Copied!' : 'Copy' }}</button>
          </div>
          <button class="px-btn px-btn-sm px-btn-teal" :disabled="ui.cloud === 'saving'" @click="pushCloud">{{ cloudLabel }}</button>
          <small class="text-ink-soft">Progress also autosaves in this browser.</small>
        </div>

        <div class="grid gap-1.5 text-sm">
          <div><kbd>←↑↓→</kbd> <kbd>WASD</kbd> Move</div>
          <div><kbd>Space</kbd> <kbd>E</kbd> Talk / interact</div>
          <div><kbd>Shift</kbd> Dash <em v-if="!save.abilities.dash" class="text-ink-soft">(needs sneakers)</em></div>
          <div><kbd>Q</kbd> Quests · <kbd>C</kbd> Wardrobe · <kbd>M</kbd> Mute</div>
        </div>

        <div class="grid gap-2">
          <button class="px-btn" @click="ui.panel = null">Resume</button>
          <button class="px-btn px-btn-ghost" @click="toggleMute">{{ ui.muted ? '🔇 Sound off' : '🔊 Sound on' }}</button>
          <button class="px-btn px-btn-ghost" @click="quit">Title screen</button>
        </div>
      </section>
    </div>
  </Transition>
</template>
