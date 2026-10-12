<script setup lang="ts">
import { NPCS, QUESTS, ITEMS } from '~/game/data'
import { questProgress, save, ui } from '~/game/state'

const STATUS = {
  locked: { label: 'Locked', row: 'bg-white opacity-55', chip: 'bg-cream' },
  available: { label: 'New!', row: 'bg-white', chip: 'bg-yellow' },
  active: { label: 'In progress', row: 'bg-white', chip: 'bg-cream' },
  ready: { label: 'Ready!', row: 'bg-[#eaffd8]', chip: 'bg-[#8be07a]' },
  done: { label: 'Done', row: 'bg-[#f1f7ea]', chip: 'bg-teal text-white' },
} as const
const doneCount = computed(() => QUESTS.filter((q) => save.quests[q.id] === 'done').length)
</script>

<template>
  <Transition name="pop">
    <div v-if="ui.panel === 'quests'" class="modal-backdrop" @click.self="ui.panel = null">
      <section class="px-panel flex max-h-[min(640px,90vh)] w-[min(560px,100%)] flex-col p-4" role="dialog" aria-label="Quest log">
        <header class="mb-2.5 flex items-center gap-2.5">
          <h2 class="text-[26px]">Quest Log</h2>
          <span class="flex-1 text-ink-soft">{{ doneCount }}/{{ QUESTS.length }} done</span>
          <button class="px-btn px-btn-ghost px-btn-sm" @click="ui.panel = null">✕</button>
        </header>
        <ul class="grid gap-2.5 overflow-auto pr-1 pb-1">
          <li v-for="q in QUESTS" :key="q.id" class="flex gap-3 rounded-md border-2 border-ink p-2.5" :class="STATUS[save.quests[q.id]].row">
            <img
              class="pixelated size-11 flex-none object-contain"
              :class="{ 'opacity-40 brightness-0': save.quests[q.id] === 'locked' }"
              :src="ui.portraits[q.giver === 'drip' ? (save.quests.hydrate === 'done' ? 'npc-drip-1' : 'npc-drip-0') : NPCS[q.giver].portrait]"
              alt=""
            >
            <div class="min-w-0 flex-1">
              <div class="flex justify-between gap-2 text-[17px]">
                <strong class="font-normal">{{ save.quests[q.id] === 'locked' ? '???' : q.title }}</strong>
                <span class="flex-none rounded-full border-2 border-ink px-2 py-px text-xs" :class="STATUS[save.quests[q.id]].chip">{{ STATUS[save.quests[q.id]].label }}</span>
              </div>
              <p class="mt-1 text-sm/[1.35] text-ink-soft">
                <template v-if="save.quests[q.id] === 'locked'">Help more friends to unlock this one.</template>
                <template v-else-if="save.quests[q.id] === 'available'">Talk to {{ NPCS[q.giver].name }}.</template>
                <template v-else>{{ q.summary }}</template>
              </p>
              <div v-if="['active', 'ready'].includes(save.quests[q.id])" class="mt-1.5 flex items-center gap-2">
                <img v-if="q.objective.type === 'collect'" class="pixelated w-3.5" :src="ui.portraits[ITEMS[q.objective.item].icon]" alt="">
                <div class="h-2.5 flex-1 overflow-hidden rounded-[3px] border-2 border-ink bg-cream">
                  <span class="block h-full bg-teal" :style="{ width: `${(questProgress(q).have / questProgress(q).need) * 100}%` }" />
                </div>
                <small>{{ questProgress(q).have.toLocaleString() }}/{{ questProgress(q).need.toLocaleString() }}</small>
              </div>
              <p v-if="save.quests[q.id] === 'ready'" class="mt-1 text-sm text-[#2e7d32]">Return to {{ NPCS[q.giver].name }}!</p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </Transition>
</template>
