/** sfx.ts — Efectos de sonido generados con Web Audio (sin archivos). */

let ctx: AudioContext | null = null;
let muted = false;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.18,
  when = 0,
) {
  const ac = audio();
  if (!ac || muted) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Ráfaga de ruido filtrado — sirve para el "crujido" del envoltorio de dulce. */
function noise(duration: number, freq: number, gain = 0.15, when = 0, q = 0.7) {
  const ac = audio();
  if (!ac || muted) return;
  const t0 = ac.currentTime + when;
  const frames = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buf = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

export const sfx = {
  setMuted(v: boolean) {
    muted = v;
  },
  isMuted() {
    return muted;
  },
  /** Debe llamarse desde un gesto del usuario para desbloquear el audio en móvil. */
  unlock() {
    audio();
  },
  select() {
    tone(520, 0.06, 'triangle', 0.1);
  },
  move() {
    tone(380, 0.09, 'triangle', 0.16);
    tone(560, 0.07, 'sine', 0.08, 0.03);
  },
  capture() {
    // Abrir un dulce: crujido del envoltorio + "pop" al destaparlo.
    noise(0.06, 3000, 0.18, 0);
    noise(0.05, 2200, 0.15, 0.06);
    noise(0.04, 3600, 0.13, 0.12);
    tone(880, 0.07, 'triangle', 0.16, 0.17);
    tone(1180, 0.06, 'sine', 0.1, 0.2);
  },
  check() {
    tone(740, 0.12, 'square', 0.16);
    tone(740, 0.12, 'square', 0.16, 0.16);
  },
  castle() {
    tone(300, 0.08, 'triangle', 0.14);
    tone(450, 0.08, 'triangle', 0.14, 0.08);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.18, i * 0.1));
  },
  lose() {
    [392, 330, 262].forEach((f, i) => tone(f, 0.28, 'sine', 0.16, i * 0.12));
  },
  draw() {
    tone(440, 0.25, 'sine', 0.14);
    tone(440, 0.25, 'sine', 0.14, 0.12);
  },
};
