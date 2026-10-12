<script setup lang="ts">
// Rendered only in dev (see Overlay.vue); production builds never include this component.
import { toggleDayNight } from '~/game/dev'
</script>

<template>
  <button class="px-btn px-btn-ghost px-btn-sm border-dashed" title="Dev only: toggle day/night" @click="toggleDayNight"><kbd>N</kbd> ☀️/🌙</button>
</template>
