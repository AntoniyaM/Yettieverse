<script setup lang="ts">
import { ui } from '~/game/state'
import { MAP_H, MAP_W } from '~/game/world/world'

// `detailed` is the full map: zone names, bigger markers, and Yettie's face instead of a dot.
defineProps<{ detailed?: boolean }>()
const at = (x: number, y: number) => ({ left: `${(x / MAP_W) * 100}%`, top: `${(y / MAP_H) * 100}%` })
// Zone names are centred on their zone; keep the ones near the coast from running off the map.
const label = (x: number, y: number) => at(Math.min(Math.max(x, 14), MAP_W - 14), y)
</script>

<template>
  <div class="relative overflow-hidden bg-[#4aa4e2]" :style="{ aspectRatio: `${MAP_W} / ${MAP_H}` }">
    <img class="pixelated absolute inset-0 size-full" :src="ui.map.src" alt="">
    <template v-if="detailed">
      <span
        v-for="l in ui.map.labels"
        :key="l.id"
        class="absolute -translate-1/2 rounded-full bg-ink/75 px-2 text-base whitespace-nowrap text-cream compact:px-1.5 compact:text-xs"
        :style="label(l.x, l.y)"
      >{{ l.name }}</span>
    </template>
    <img
      v-for="m in ui.map.markers"
      :key="m.id"
      class="pixelated absolute -translate-x-1/2 -translate-y-full"
      :class="detailed ? 'w-[18px] animate-bob' : 'w-[9px]'"
      :src="ui.portraits[`ind-${m.kind}`]"
      :style="at(m.x, m.y)"
      alt=""
    >
    <img
      v-if="detailed"
      class="pixelated absolute size-8 -translate-x-1/2 -translate-y-[85%] drop-shadow-[0_2px_0_var(--color-ink)]"
      :src="ui.portraits.yettie"
      :style="at(ui.map.player.x, ui.map.player.y)"
      alt="You"
    >
    <span v-else class="absolute size-0" :style="at(ui.map.player.x, ui.map.player.y)">
      <span class="absolute -top-1 -left-1 size-2 animate-ping rounded-full bg-white" />
      <span class="absolute -top-1 -left-1 size-2 rounded-full border border-ink bg-pink" />
    </span>
  </div>
</template>
