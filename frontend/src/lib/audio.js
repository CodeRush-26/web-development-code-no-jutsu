/**
 * Tiny WebAudio-based alert sounds. No external assets, plays in-browser.
 * Triggered by AlertSound.jsx whenever a new alert arrives.
 */

let ctx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      ctx = null;
    }
  }
  // Some browsers suspend the context until a user gesture
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone({ freq, duration = 0.18, type = 'sine', volume = 0.18, when = 0 }) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function playSeverity(severity = 'high') {
  switch (severity) {
    case 'critical':
      // 3 fast high beeps
      tone({ freq: 880, duration: 0.18, type: 'square', volume: 0.22 });
      tone({ freq: 880, duration: 0.18, type: 'square', volume: 0.22, when: 0.22 });
      tone({ freq: 1200, duration: 0.30, type: 'square', volume: 0.22, when: 0.44 });
      break;
    case 'high':
      // 2 mid beeps
      tone({ freq: 660, duration: 0.18, type: 'square', volume: 0.20 });
      tone({ freq: 880, duration: 0.22, type: 'square', volume: 0.20, when: 0.22 });
      break;
    case 'medium':
      // 1 soft beep
      tone({ freq: 520, duration: 0.20, type: 'sine', volume: 0.18 });
      break;
    case 'low':
    default:
      tone({ freq: 380, duration: 0.18, type: 'sine', volume: 0.14 });
      break;
  }
}

/** Resume the AudioContext on the first user click (browser autoplay policy). */
export function unlockAudio() {
  const c = getCtx();
  if (c?.state === 'suspended') c.resume().catch(() => {});
}
