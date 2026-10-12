// Dev-only helpers. Only ever imported behind `import.meta.dev`, so production builds drop this file.
import { save, toast } from './state'

// Jump the day clock to midday or midnight (see the SKY table in scenes/Ambience.ts).
export function toggleDayNight() {
  const night = save.clock > 0.62 || save.clock < 0.04
  save.clock = night ? 0.3 : 0.8
  toast(night ? 'Dev: ☀️ jumped to day' : 'Dev: 🌙 jumped to night')
}
