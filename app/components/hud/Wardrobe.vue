<script setup lang="ts">
import { ABILITIES, COSMETICS, QUESTS, type AbilityId, type CosmeticId } from '~/game/data'
import { save, ui } from '~/game/state'

const slots = ['hat', 'face'] as const
const bySlot = (slot: 'hat' | 'face') => (Object.keys(COSMETICS) as CosmeticId[]).filter((id) => COSMETICS[id].slot === slot)
const source = (id: CosmeticId) => QUESTS.find((q) => q.reward.cosmetic === id)
const abilitySource = (id: AbilityId) => QUESTS.find((q) => q.reward.ability === id)

const wear = (slot: 'hat' | 'face', id: CosmeticId | null) => {
  save.wearing[slot] = id
}
const front = computed(() => ui.yettieFront)
</script>

<template>
  <Transition name="pop">
    <div v-if="ui.panel === 'wardrobe'" class="modal-backdrop" @click.self="ui.panel = null">
      <section class="px-panel max-h-[92vh] w-[min(600px,100%)] overflow-auto p-4" role="dialog" aria-label="Wardrobe">
        <header class="mb-2 flex items-center justify-between">
          <h2 class="text-[26px]">Wardrobe</h2>
          <button class="px-btn px-btn-ghost px-btn-sm" @click="ui.panel = null">✕</button>
        </header>
        <div class="flex flex-wrap gap-[18px]">
          <div class="m-auto flex flex-none flex-col items-center gap-2">
            <!-- Drawn at the sprite's real 32px size, then zoomed, so wearables line up pixel-exact. -->
            <div class="relative size-8 rounded-[3px] bg-radial-[circle_at_50%_75%] from-white from-40% to-mint outline-1 outline-ink [zoom:5]">
              <img class="pixelated absolute inset-0" :src="ui.portraits.yettie" alt="Yettie">
              <img
                v-if="save.wearing.hat && front"
                class="pixelated absolute -translate-x-1/2 -translate-y-full"
                :src="ui.portraits[COSMETICS[save.wearing.hat].icon]"
                :style="{ left: `${front.cx}px`, top: `${front.top + 4}px` }"
                alt=""
              >
              <img
                v-if="save.wearing.face && front?.eyes"
                class="pixelated absolute -translate-1/2"
                :src="ui.portraits[COSMETICS[save.wearing.face].icon]"
                :style="{ left: `${front.eyes.cx}px`, top: `${front.eyes.cy}px` }"
                alt=""
              >
            </div>
            <div class="flex items-center gap-1"><img class="pixelated w-[13px]" :src="ui.portraits.diamond" alt=""> {{ save.diamonds }} diamonds</div>
          </div>

          <div class="min-w-[240px] flex-1">
            <div v-for="slot in slots" :key="slot">
              <h3 class="mt-2 mb-1.5 text-[15px] tracking-[1px] text-ink-soft uppercase">{{ slot === 'hat' ? 'Head' : 'Face' }}</h3>
              <div class="flex flex-wrap gap-2">
                <button
                  class="grid size-14 cursor-pointer place-items-center rounded-md border-3 border-ink text-xl text-ink-soft"
                  :class="!save.wearing[slot] ? 'bg-yellow shadow-[0_3px_0_var(--color-ink)]' : 'bg-white'"
                  title="Nothing"
                  @click="wear(slot, null)"
                >
                  ∅
                </button>
                <button
                  v-for="id in bySlot(slot)"
                  :key="id"
                  class="grid size-14 place-items-center rounded-md border-3 border-ink"
                  :class="[
                    save.wearing[slot] === id ? 'bg-yellow shadow-[0_3px_0_var(--color-ink)]' : 'bg-white',
                    save.owned.includes(id) ? 'cursor-pointer' : 'cursor-default',
                  ]"
                  :disabled="!save.owned.includes(id)"
                  :title="save.owned.includes(id) ? `${COSMETICS[id].name}: ${COSMETICS[id].blurb}` : `Reward from “${source(id)?.title}”`"
                  @click="wear(slot, id)"
                >
                  <img
                    class="pixelated h-7 w-9 object-contain"
                    :class="{ 'opacity-25 brightness-0': !save.owned.includes(id) }"
                    :src="ui.portraits[COSMETICS[id].icon]"
                    alt=""
                  >
                </button>
              </div>
            </div>

            <h3 class="mt-2 mb-1.5 text-[15px] tracking-[1px] text-ink-soft uppercase">Gear</h3>
            <ul class="grid gap-1.5">
              <li
                v-for="(a, id) in ABILITIES"
                :key="id"
                class="flex items-center gap-2.5 rounded-md border-2 border-ink bg-white px-2.5 py-1.5"
                :class="{ 'opacity-50': !save.abilities[id] }"
              >
                <span class="text-[22px]" :class="{ grayscale: !save.abilities[id] }">{{ a.icon }}</span>
                <div>
                  <strong class="font-normal">{{ save.abilities[id] ? a.name : '???' }}</strong>
                  <small class="block text-ink-soft">{{ save.abilities[id] ? a.blurb : `Reward from “${abilitySource(id)?.title}”` }}</small>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  </Transition>
</template>
