// Vibed Pong — v0.3 Game Modes

const CONFIG = {
  width: 800,
  height: 600,
  wall: 10,
  paddle: { inset: 20, width: 10, height: 80, speed: 450 },
  ball: { size: 10, startSpeed: 350, speedUp: 1.05, maxSpeed: 900 },
  maxBounceAngle: Math.PI / 3, // reached when the ball hits the paddle's very edge
  maxServeAngle: Math.PI / 4,
  winScore: 11,
  serveDelay: 1, // seconds before each serve in two-player
  volume: 0.15,
};

// Keys for each paddle, left first. Solo lets either set move the one paddle.
const CONTROLS = {
  solo: [{ up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'] }],
  versus: [
    { up: ['KeyW'], down: ['KeyS'] },
    { up: ['ArrowUp'], down: ['ArrowDown'] },
  ],
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.width;
canvas.height = CONFIG.height;

// --- State ---

const state = {
  screen: 'menu', // menu | playing | paused | over
  mode: 'solo', // solo | versus
  scores: [0, 0], // solo only uses the first
  best: 0, // solo only
  paddles: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
  ball: { x: 0, y: 0, vx: 0, vy: 0, speed: 0 },
  serveTimer: 0,
};

function resetField(mode) {
  const { width, height, paddle } = CONFIG;
  state.mode = mode;
  state.scores = [0, 0];
  state.paddles[0].x = paddle.inset;
  state.paddles[1].x = width - paddle.inset - paddle.width;
  for (const p of state.paddles) p.y = (height - paddle.height) / 2;
  // Solo serves toward the far wall so the player has a moment to get ready
  serve(mode === 'solo' || Math.random() < 0.5 ? 1 : -1);
}

function startGame(mode) {
  resetField(mode);
  state.screen = 'playing';
}

// dir: 1 serves to the right, -1 to the left
function serve(dir) {
  const { width, height, ball } = CONFIG;
  const b = state.ball;
  b.x = (width - ball.size) / 2;
  b.y = (height - ball.size) / 2;
  b.speed = ball.startSpeed;
  const angle = (Math.random() * 2 - 1) * CONFIG.maxServeAngle;
  b.vx = dir * b.speed * Math.cos(angle);
  b.vy = b.speed * Math.sin(angle);
  state.serveTimer = state.mode === 'versus' ? CONFIG.serveDelay : 0;
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
const held = (codes) => codes.some((c) => keys.has(c));

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  sound.unlock();

  const { screen } = state;
  if (e.code === 'KeyM') {
    sound.muted = !sound.muted;
  } else if (screen === 'menu') {
    if (e.code === 'Digit1' || e.code === 'Numpad1') startGame('solo');
    if (e.code === 'Digit2' || e.code === 'Numpad2') startGame('versus');
  } else if (e.code === 'KeyP' && (screen === 'playing' || screen === 'paused')) {
    state.screen = screen === 'playing' ? 'paused' : 'playing';
  } else if (e.code === 'Space' && screen === 'over') {
    startGame(state.mode);
  } else if (e.code === 'Escape' && (screen === 'paused' || screen === 'over')) {
    state.screen = 'menu';
  }
});

window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

// --- Update ---

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

function update(dt) {
  if (state.screen !== 'playing') return;
  const { width, height, wall, paddle: P, ball: B } = CONFIG;
  const solo = state.mode === 'solo';

  CONTROLS[state.mode].forEach((keySet, i) => {
    const p = state.paddles[i];
    const dir = (held(keySet.down) ? 1 : 0) - (held(keySet.up) ? 1 : 0);
    p.y = clamp(p.y + dir * P.speed * dt, wall, height - wall - P.height);
  });

  // Paddles can move while the ball waits to be served
  if (state.serveTimer > 0) {
    state.serveTimer -= dt;
    return;
  }

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
  if (solo && b.x + B.size > width - wall) {
    b.x = width - wall - B.size;
    b.vx = -Math.abs(b.vx);
    sound.wall();
  }

  if (hitPaddle(state.paddles[0], 1, prevX) && solo) {
    state.scores[0]++;
    state.best = Math.max(state.best, state.scores[0]);
  }
  if (!solo) hitPaddle(state.paddles[1], -1, prevX);

  if (b.x + B.size < 0) miss(0);
  else if (!solo && b.x > width) miss(1);
}

// dir is the way the paddle sends the ball back: 1 for the left paddle, -1 for the right
function hitPaddle(p, dir, prevX) {
  const { paddle: P, ball: B } = CONFIG;
  const b = state.ball;
  // The ball's x when touching the paddle's face. Check whether the ball crossed
  // it this frame, rather than whether it overlaps now, so it can't skip through
  // at high speed.
  const contactX = dir > 0 ? p.x + P.width : p.x - B.size;
  const crossed = dir > 0
    ? b.vx < 0 && prevX >= contactX && b.x < contactX
    : b.vx > 0 && prevX <= contactX && b.x > contactX;
  if (!crossed || b.y + B.size <= p.y || b.y >= p.y + P.height) return false;

  b.x = contactX;
  const offset = (b.y + B.size / 2 - (p.y + P.height / 2)) / (P.height / 2);
  const angle = clamp(offset, -1, 1) * CONFIG.maxBounceAngle;
  b.speed = Math.min(b.speed * B.speedUp, B.maxSpeed);
  b.vx = dir * b.speed * Math.cos(angle);
  b.vy = b.speed * Math.sin(angle);
  sound.paddle(b.speed);
  return true;
}

// loser: 0 for the left player, 1 for the right
function miss(loser) {
  sound.miss();
  if (state.mode === 'solo') {
    state.screen = 'over';
    return;
  }
  const winner = 1 - loser;
  state.scores[winner]++;
  if (state.scores[winner] >= CONFIG.winScore) state.screen = 'over';
  else serve(loser === 0 ? -1 : 1); // toward the player who conceded
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
  lines.forEach(([text, size], i) => drawText(text, width / 2, height / 2 - 60 + i * 50, size));
}

function render() {
  const { width, height, wall, paddle: P, ball: B } = CONFIG;
  const solo = state.mode === 'solo';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, wall);
  ctx.fillRect(0, height - wall, width, wall);
  if (solo) {
    ctx.fillRect(width - wall, 0, wall, height);
  } else {
    for (let y = wall + 10; y < height - wall; y += 30) ctx.fillRect(width / 2 - 2, y, 4, 15);
  }

  const paddles = solo ? state.paddles.slice(0, 1) : state.paddles;
  for (const p of paddles) ctx.fillRect(p.x, p.y, P.width, P.height);
  ctx.fillRect(state.ball.x, state.ball.y, B.size, B.size);

  if (solo) {
    drawText(state.scores[0], width / 2, 80, 48);
    drawText(`BEST ${state.best}`, width - 30, 45, 18, 'right');
  } else {
    drawText(state.scores[0], width / 4, 80, 48);
    drawText(state.scores[1], (width * 3) / 4, 80, 48);
  }
  if (sound.muted) drawText('MUTED', 30, 45, 18, 'left');

  if (state.screen === 'menu') {
    drawOverlay([
      ['VIBED PONG', 48],
      ['1  Solo against the wall', 22],
      ['2  Two players', 22],
      ['P to pause · M to mute', 16],
    ]);
  } else if (state.screen === 'paused') {
    drawOverlay([['PAUSED', 48], ['Press P to resume', 22], ['Esc for menu', 16]]);
  } else if (state.screen === 'over') {
    const [left, right] = state.scores;
    drawOverlay(solo
      ? [['GAME OVER', 48], [`Score ${left} · Best ${state.best}`, 22]]
      : [[left > right ? 'LEFT WINS' : 'RIGHT WINS', 48], [`${left} – ${right}`, 22]]);
    drawText('Space to play again · Esc for menu', width / 2, height / 2 + 100, 16);
  } else if (state.serveTimer > 0) {
    drawText('W/S', width / 4, height - 40, 16);
    drawText('↑/↓', (width * 3) / 4, height - 40, 16);
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

resetField('solo');
requestAnimationFrame(frame);
