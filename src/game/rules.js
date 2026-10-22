// The game itself: state and how it changes each frame. No drawing, sound or
// input here; scenes feed in paddle directions and react to the events.

import { CONFIG } from './config.js';
import { moveCpu } from './cpu.js';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// mode: 'solo' | 'versus' | 'cpu'
export function createState(mode) {
  const { width, height, paddle } = CONFIG;
  const y = (height - paddle.height) / 2;
  const state = {
    mode,
    scores: [0, 0], // solo only uses the first
    over: false,
    paddles: [
      { x: paddle.inset, y },
      { x: width - paddle.inset - paddle.width, y },
    ],
    ball: { x: 0, y: 0, vx: 0, vy: 0, speed: 0 },
    serveTimer: 0,
    cpu: { targetY: height / 2, lookTimer: 0, aimOffset: 0, incoming: false },
  };
  // Solo serves toward the far wall so the player has a moment to get ready
  serve(state, mode === 'solo' || Math.random() < 0.5 ? 1 : -1);
  return state;
}

// dir: 1 serves to the right, -1 to the left
export function serve(state, dir) {
  const { width, height, ball } = CONFIG;
  const b = state.ball;
  b.x = (width - ball.size) / 2;
  b.y = (height - ball.size) / 2;
  b.speed = ball.startSpeed;
  const angle = (Math.random() * 2 - 1) * CONFIG.maxServeAngle;
  b.vx = dir * b.speed * Math.cos(angle);
  b.vy = b.speed * Math.sin(angle);
  state.serveTimer = state.mode === 'solo' ? 0 : CONFIG.serveDelay;
}

// Moves everything forward by dt seconds. dirs holds each human paddle's input,
// left first: -1 up, 1 down, 0 still. Returns what happened this frame, e.g.
// [{ type: 'wall' }, { type: 'paddle', speed }, { type: 'miss' }].
export function update(state, dirs, dt) {
  const events = [];
  if (state.over) return events;
  const { width, height, wall, paddle: P, ball: B } = CONFIG;
  const solo = state.mode === 'solo';

  dirs.forEach((dir, i) => {
    const p = state.paddles[i];
    p.y = clamp(p.y + dir * P.speed * dt, wall, height - wall - P.height);
  });
  if (state.mode === 'cpu') moveCpu(state, dt);

  // Paddles can move while the ball waits to be served
  if (state.serveTimer > 0) {
    state.serveTimer -= dt;
    return events;
  }

  const b = state.ball;
  const prevX = b.x;
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  if (b.y < wall) {
    b.y = wall;
    b.vy = Math.abs(b.vy);
    events.push({ type: 'wall' });
  } else if (b.y + B.size > height - wall) {
    b.y = height - wall - B.size;
    b.vy = -Math.abs(b.vy);
    events.push({ type: 'wall' });
  }
  if (solo && b.x + B.size > width - wall) {
    b.x = width - wall - B.size;
    b.vx = -Math.abs(b.vx);
    events.push({ type: 'wall' });
  }

  if (hitPaddle(state, 0, prevX, events) && solo) state.scores[0]++;
  if (!solo) hitPaddle(state, 1, prevX, events);

  if (b.x + B.size < 0) miss(state, 0, events);
  else if (!solo && b.x > width) miss(state, 1, events);
  return events;
}

// Paddle 0 sends the ball right, paddle 1 sends it left
function hitPaddle(state, index, prevX, events) {
  const { paddle: P, ball: B } = CONFIG;
  const p = state.paddles[index];
  const b = state.ball;
  const dir = index === 0 ? 1 : -1;
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
  events.push({ type: 'paddle', speed: b.speed });
  return true;
}

// loser: 0 for the left player, 1 for the right
function miss(state, loser, events) {
  events.push({ type: 'miss' });
  if (state.mode === 'solo') {
    state.over = true;
    return;
  }
  const winner = 1 - loser;
  state.scores[winner]++;
  if (state.scores[winner] >= CONFIG.winScore) state.over = true;
  else serve(state, loser === 0 ? -1 : 1); // toward the player who conceded
}
