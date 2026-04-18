/**
 * Sonidos de confirmación muy cortos generados con WebAudio para no
 * requerir assets. Respetan la preferencia `sounds_enabled` del usuario.
 */

import { getSoundsEnabled } from './preferences';

type AudioCtxCtor = typeof AudioContext;
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const w = window as unknown as {
    AudioContext?: AudioCtxCtor;
    webkitAudioContext?: AudioCtxCtor;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

function beep({
  frequency,
  duration,
  volume = 0.08,
  type = 'sine',
}: {
  frequency: number;
  duration: number;
  volume?: number;
  type?: OscillatorType;
}) {
  const ac = getCtx();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') void ac.resume();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ac.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  } catch {
    /* ignore */
  }
}

export function playSuccess(owner: string | null | undefined) {
  if (!getSoundsEnabled(owner)) return;
  // Dos tonos ascendentes, estilo "click" suave.
  beep({ frequency: 660, duration: 0.08, volume: 0.07, type: 'sine' });
  setTimeout(
    () => beep({ frequency: 990, duration: 0.09, volume: 0.07, type: 'sine' }),
    70,
  );
}

export function playError(owner: string | null | undefined) {
  if (!getSoundsEnabled(owner)) return;
  beep({ frequency: 240, duration: 0.18, volume: 0.09, type: 'square' });
}

export function playTick(owner: string | null | undefined) {
  if (!getSoundsEnabled(owner)) return;
  beep({ frequency: 880, duration: 0.04, volume: 0.05, type: 'triangle' });
}
