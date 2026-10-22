import { CONFIG } from './game/config.js';

// Synthesized beeps, so there are no audio files to load. They play through
// Phaser's sound manager, so its mute and unlock-on-first-input apply.
function beep(sound, freq, duration, type = 'square', endFreq = freq) {
  const ctx = sound.context;
  if (!ctx) return; // no Web Audio in this browser
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
  gain.gain.setValueAtTime(CONFIG.volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain).connect(sound.destination);
  osc.start(t);
  osc.stop(t + duration);
}

// Plays a sound for each event from rules.update()
export function playEvents(sound, events) {
  for (const e of events) {
    // Pitch rises with ball speed, so you can hear the rally heating up
    if (e.type === 'paddle') beep(sound, 440 * Math.sqrt(e.speed / CONFIG.ball.startSpeed), 0.08);
    else if (e.type === 'wall') beep(sound, 220, 0.06);
    else if (e.type === 'miss') beep(sound, 300, 0.5, 'sawtooth', 60);
  }
}
