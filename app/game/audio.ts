// Procedural chiptune: no audio files, just WebAudio oscillators.
let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicBus: GainNode | null = null
let muted = false
let musicTimer: ReturnType<typeof setInterval> | null = null

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

function ac() {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.6
    master.connect(ctx.destination)
    musicBus = ctx.createGain()
    musicBus.gain.value = 0.35
    musicBus.connect(master)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  freq: number,
  at: number,
  dur: number,
  { type = 'square', gain = 0.08, slide = 0, bus }: { type?: OscillatorType; gain?: number; slide?: number; bus?: AudioNode } = {},
) {
  const a = ac()
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, at)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), at + dur)
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(gain, at + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(bus ?? master!)
  o.start(at)
  o.stop(at + dur + 0.02)
}

function noise(at: number, dur: number, gain = 0.1, freq = 1200) {
  const a = ac()
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = freq
  const g = a.createGain()
  g.gain.setValueAtTime(gain, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  src.connect(f).connect(g).connect(master!)
  src.start(at)
}

export const sfx = {
  // Dialog "voice": a soft, low triangle bup. `pitch` is a MIDI note.
  blip(pitch = 62) {
    const t = ac().currentTime
    tone(midi(pitch + Math.floor(Math.random() * 3)), t, 0.05, { type: 'triangle', gain: 0.07 })
  },
  pickup() {
    const t = ac().currentTime
    ;[76, 80, 83, 88].forEach((n, i) => tone(midi(n), t + i * 0.05, 0.12, { type: 'triangle', gain: 0.12 }))
  },
  accept() {
    const t = ac().currentTime
    tone(midi(72), t, 0.1, { gain: 0.06 })
    tone(midi(79), t + 0.1, 0.18, { gain: 0.06 })
  },
  complete() {
    const t = ac().currentTime
    ;[72, 76, 79, 84, 79, 84].forEach((n, i) =>
      tone(midi(n), t + i * 0.09, i === 5 ? 0.5 : 0.12, { gain: 0.07 }),
    )
    ;[48, 55, 60].forEach((n, i) => tone(midi(n), t + i * 0.18, 0.3, { type: 'triangle', gain: 0.1 }))
  },
  bell() {
    const t = ac().currentTime
    tone(1318, t, 1.6, { type: 'sine', gain: 0.12 })
    tone(1975, t, 1.1, { type: 'sine', gain: 0.05 })
    tone(659, t, 1.8, { type: 'triangle', gain: 0.05 })
  },
  splash() {
    noise(ac().currentTime, 0.25, 0.08, 900)
  },
  dash() {
    noise(ac().currentTime, 0.15, 0.05, 2400)
  },
  wish() {
    const t = ac().currentTime
    for (let i = 0; i < 10; i++) tone(midi(84 + ((i * 5) % 12)), t + i * 0.05, 0.2, { type: 'sine', gain: 0.05 })
  },
  bump() {
    tone(110, ac().currentTime, 0.06, { type: 'square', gain: 0.03, slide: -40 })
  },
  hug() {
    const t = ac().currentTime
    ;[79, 83, 86].forEach((n, i) => tone(midi(n), t + i * 0.12, 0.3, { type: 'sine', gain: 0.08 }))
  },
}

// Music: 8 bars in C, I–vi–IV–V then IV–I–ii–V.
const _ = null
const LEAD: (number | null)[] = [
  76, _, 79, _, 81, 79, 76, _,
  72, _, 76, _, 74, 72, 69, _,
  69, _, 72, _, 74, _, 77, 76,
  74, _, _, 71, 74, _, 79, _,
  81, 79, 77, _, 76, _, 72, _,
  76, _, 79, _, 84, _, _, _,
  74, 77, 81, _, 79, 77, 74, _,
  71, _, 74, _, 79, _, _, _,
]
const ROOTS = [48, 45, 41, 43, 41, 48, 50, 43]
const STEP = 0.3 // Seconds per 8th note (~100 bpm).

export function startMusic() {
  if (musicTimer) return
  const a = ac()
  let step = 0
  let next = a.currentTime + 0.1
  musicTimer = setInterval(() => {
    while (next < a.currentTime + 0.25) {
      const s = step % LEAD.length
      const lead = LEAD[s]
      if (lead) tone(midi(lead), next, STEP * 0.9, { gain: 0.05, bus: musicBus! })
      const root = ROOTS[Math.floor(s / 8)]!
      const pos = s % 8
      if (pos === 0 || pos === 3 || pos === 4 || pos === 6)
        tone(midi(pos === 4 ? root + 7 : root), next, STEP * 1.4, { type: 'triangle', gain: 0.14, bus: musicBus! })
      if (pos % 2 === 1) tone(midi(root + 24 + (pos === 5 ? 4 : 7)), next, 0.08, { type: 'sine', gain: 0.025, bus: musicBus! })
      next += STEP
      step++
    }
  }, 60)
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer)
  musicTimer = null
}

export function setMuted(m: boolean) {
  muted = m
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.6, ctx.currentTime, 0.05)
}

// Must be called from a user gesture at least once.
export function unlockAudio() {
  ac()
}
