// Small choices remembered in this browser, like your player name or the side
// you play solo on. Storage can be blocked, for example in private windows, so
// it's just skipped then.

const PREFIX = 'pong.';

export function loadPref(key, fallback = null) {
  try {
    return localStorage.getItem(PREFIX + key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function savePref(key, value) {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    // not remembered this time
  }
}
