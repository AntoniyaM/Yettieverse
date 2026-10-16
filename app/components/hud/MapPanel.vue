<script setup lang="ts">
import { ui } from '~/game/state'
</script>

<template>
  <Transition name="pop">
    <div v-if="ui.panel === 'map'" class="modal-backdrop" @click.self="ui.panel = null">
      <section class="px-panel flex w-[min(760px,100%,calc((90vh-110px)*1.2))] flex-col gap-2.5 p-4" role="dialog" aria-label="Island map">
        <header class="flex items-center gap-2.5">
          <h2 class="flex-1 text-[26px]">Island Map</h2>
          <button class="px-btn px-btn-ghost px-btn-sm" @click="ui.panel = null">✕</button>
        </header>
        <HudMapView detailed class="rounded-md border-2 border-ink" />
        <footer class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
          <span class="flex items-center gap-1.5"><img class="pixelated size-5" :src="ui.portraits.yettie" alt="">You</span>
          <span class="flex items-center gap-1.5"><img class="pixelated w-[9px]" :src="ui.portraits['ind-available']" alt="">New quest</span>
          <span class="flex items-center gap-1.5"><img class="pixelated w-[9px]" :src="ui.portraits['ind-ready']" alt="">Quest done, go say hi</span>
        </footer>
      </section>
    </div>
  </Transition>
</template>
