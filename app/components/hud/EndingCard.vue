<script setup lang="ts">
import {NPCS} from '~/game/data'
import {save, ui} from '~/game/state'

const cast = ['broc', 'avo', 'drip', 'shelly', 'mama', 'pip', 'pear'] as const
const time = computed(() => {
  const m = Math.floor(save.playTime / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`
})

const stats = computed(() => [
  { label: 'Steps', value: save.steps.toLocaleString() },
  { label: 'Play time', value: time.value },
  { label: 'Wishes', value: save.wishes },
  { label: 'Sparkles', value: save.sparkles },
])

function close() {
  ui.ending = false
  ui.inputLockedUntil = performance.now() + 250
}
</script>

<template>
  <Transition name="pop">
    <div v-if="ui.ending" class="modal-backdrop bg-transparent bg-[radial-gradient(circle_at_50%_30%,rgb(255_210_63/0.35),rgb(43_35_64/0.75))]">
      <section class="px-panel max-h-[92vh] w-[min(560px,100%)] overflow-auto p-[22px] text-center" role="dialog" aria-label="The end">
        <p class="tracking-[6px] text-gold">✦ ✦ ✦</p>
        <h2 class="mt-1 mb-2 text-[30px]">The Yettieverse is glowing!</h2>
        <p class="mb-3.5 text-base/[1.4]">
          Soup was made, jam was jammed, the fountain flows and Pip is home. Thanks to one very fluffy hero, the
          Wishing Bells ring again.
        </p>
        <div class="mb-3.5 flex flex-wrap justify-center gap-2">
          <figure
            v-for="(c, i) in [{ key: 'yettie', name: 'Yettie' }, ...cast.map((id) => ({ key: id === 'drip' ? 'npc-drip-1' : NPCS[id].portrait, name: NPCS[id].name }))]"
            :key="c.key"
            class="w-15"
          >
            <img class="pixelated mx-auto size-11 animate-bob object-contain" :style="{ animationDelay: i % 2 ? '0.4s' : '0s' }" :src="ui.portraits[c.key]" alt="">
            <figcaption class="text-[11px]">{{ c.name }}</figcaption>
          </figure>
        </div>
        <dl class="mb-3.5 grid grid-cols-4 gap-2 max-[480px]:grid-cols-2">
          <div v-for="s in stats" :key="s.label" class="rounded-md border-2 border-ink bg-white px-1 py-2">
            <dt class="text-xs text-ink-soft">{{ s.label }}</dt>
            <dd class="text-xl">{{ s.value }}</dd>
          </div>
        </dl>
        <p class="mb-3.5 text-sm text-ink-soft">The end… for now. The island is yours to wander. Try a wish at the fountain!</p>
        <button class="px-btn px-btn-teal" @click="close">Keep exploring</button>
      </section>
    </div>
  </Transition>
</template>
