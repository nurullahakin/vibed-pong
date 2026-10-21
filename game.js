// Vibed Pong — v0.2 Sound

const CONFIG = {
  width: 800,
  height: 600,
  wall: 10,
  paddle: { x: 20, width: 10, height: 80, speed: 450 },
  ball: { size: 10, startSpeed: 350, speedUp: 1.05, maxSpeed: 900 },
  maxBounceAngle: Math.PI / 3, // reached when the ball hits the paddle's very edge
  maxServeAngle: Math.PI / 4,
  volume: 0.15,
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.width;
canvas.height = CONFIG.height;

// --- State ---

const state = {
  mode: 'start', // start | playing | paused | over
  score: 0,
  best: 0,
  paddle: { y: 0 },
  ball: { x: 0, y: 0, vx: 0, vy: 0, speed: 0 },
};

function resetRound() {
  const { width, height, paddle, ball } = CONFIG;
  state.score = 0;
  state.paddle.y = (height - paddle.height) / 2;

  const b = state.ball;
  b.x = (width - ball.size) / 2;
  b.y = (height - ball.size) / 2;
  b.speed = ball.startSpeed;
  // Serve toward the far wall so the player has a moment to get ready
  const angle = (Math.random() * 2 - 1) * CONFIG.maxServeAngle;
  b.vx = b.speed * Math.cos(angle);
  b.vy = b.speed * Math.sin(angle);
}

// --- Sound ---

// Synthesized beeps, so there are no audio files to load
const sound = {
  ctx: null,
  muted: false,

  // Browsers only allow audio once the player has interacted with the page
  unlock() {
    if (!this.ctx) this.ctx = new AudioContext();
  },

  beep(freq, duration, type = 'square', endFreq = freq) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    gain.gain.setValueAtTime(CONFIG.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  },

  // Pitch rises with ball speed, so you can hear the rally heating up
  paddle(speed) { this.beep(440 * Math.sqrt(speed / CONFIG.ball.startSpeed), 0.08); },
  wall() { this.beep(220, 0.06); },
  miss() { this.beep(300, 0.5, 'sawtooth', 60); },
};

// --- Input ---

// Physical key codes, so W/S work the same on any keyboard layout
const keys = new Set();

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  sound.unlock();

  if (e.code === 'KeyM') {
    sound.muted = !sound.muted;
  } else if (e.code === 'Space' && (state.mode === 'start' || state.mode === 'over')) {
    resetRound();
    state.mode = 'playing';
  } else if (e.code === 'KeyP') {
    if (state.mode === 'playing') state.mode = 'paused';
    else if (state.mode === 'paused') state.mode = 'playing';
  }
});

window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

// --- Update ---

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

function update(dt) {
  if (state.mode !== 'playing') return;
  const { width, height, wall, paddle: P, ball: B } = CONFIG;

  let dir = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dir -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dir += 1;
  const p = state.paddle;
  p.y = clamp(p.y + dir * P.speed * dt, wall, height - wall - P.height);

  const b = state.ball;
  const prevX = b.x;
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  if (b.y < wall) {
    b.y = wall;
    b.vy = Math.abs(b.vy);
    sound.wall();
  } else if (b.y + B.size > height - wall) {
    b.y = height - wall - B.size;
    b.vy = -Math.abs(b.vy);
    sound.wall();
  }
  if (b.x + B.size > width - wall) {
    b.x = width - wall - B.size;
    b.vx = -Math.abs(b.vx);
    sound.wall();
  }

  // Check whether the ball crossed the paddle's face this frame, rather than
  // whether it overlaps now, so it can't skip through at high speed.
  const face = P.x + P.width;
  const crossed = b.vx < 0 && prevX >= face && b.x < face;
  if (crossed && b.y + B.size > p.y && b.y < p.y + P.height) {
    b.x = face;
    const offset = (b.y + B.size / 2 - (p.y + P.height / 2)) / (P.height / 2);
    const angle = clamp(offset, -1, 1) * CONFIG.maxBounceAngle;
    b.speed = Math.min(b.speed * B.speedUp, B.maxSpeed);
    b.vx = b.speed * Math.cos(angle);
    b.vy = b.speed * Math.sin(angle);
    state.score++;
    state.best = Math.max(state.best, state.score);
    sound.paddle(b.speed);
  }

  if (b.x + B.size < 0) {
    state.mode = 'over';
    sound.miss();
  }
}

// --- Render ---

function drawText(text, x, y, size, align = 'center') {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

function drawOverlay(lines) {
  const { width, height } = CONFIG;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  lines.forEach(([text, size], i) => drawText(text, width / 2, height / 2 - 40 + i * 50, size));
}

function render() {
  const { width, height, wall, paddle: P, ball: B } = CONFIG;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, wall);
  ctx.fillRect(0, height - wall, width, wall);
  ctx.fillRect(width - wall, 0, wall, height);

  ctx.fillRect(P.x, state.paddle.y, P.width, P.height);
  ctx.fillRect(state.ball.x, state.ball.y, B.size, B.size);

  drawText(state.score, width / 2, 80, 48);
  drawText(`BEST ${state.best}`, width - 30, 45, 18, 'right');
  if (sound.muted) drawText('MUTED', 30, 45, 18, 'left');

  if (state.mode === 'start') {
    drawOverlay([
      ['VIBED PONG', 48],
      ['Press Space to start', 22],
      ['W/S or ↑/↓ to move · P to pause · M to mute', 16],
    ]);
  } else if (state.mode === 'paused') {
    drawOverlay([['PAUSED', 48], ['Press P to resume', 22]]);
  } else if (state.mode === 'over') {
    drawOverlay([
      ['GAME OVER', 48],
      [`Score ${state.score} · Best ${state.best}`, 22],
      ['Press Space to play again', 16],
    ]);
  }
}

// --- Loop ---

let last = performance.now();

function frame(now) {
  // Cap the step so switching tabs doesn't fling the ball across the screen
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

resetRound();
requestAnimationFrame(frame);
