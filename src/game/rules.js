// The game itself: state and how it changes each frame. No drawing, sound or
// input here; scenes feed in paddle directions and react to the events.

import { CONFIG } from './config.js';
import { moveCpu } from './cpu.js';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// mode: 'solo' | 'versus' | 'cpu' | 'aim'
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
    // Aim practice. lastHit is where the ball hit the paddle, from -1 (top edge)
    // to 1 (bottom edge), or null before the hit. ballId changes with each ball.
    aim: { round: 0, lastHit: null, showTimer: 0, ballId: 0 },
  };
  if (mode === 'aim') launchAimBall(state);
  // Solo serves toward the far wall so the player has a moment to get ready
  else serve(state, mode === 'solo' || Math.random() < 0.5 ? 1 : -1);
  return state;
}

export function aimPattern(state) {
  const { patterns } = CONFIG.aim;
  return patterns[state.aim.round % patterns.length];
}

// Starts the current aim practice ball so it arrives at the middle of the
// paddle's line from the pattern's angle
function launchAimBall(state) {
  const { height, paddle: P, ball: B, aim } = CONFIG;
  const angle = (aimPattern(state).angle * Math.PI) / 180;
  const b = state.ball;
  b.x = P.inset + P.width + aim.distance * Math.cos(angle);
  b.y = (height - B.size) / 2 - aim.distance * Math.sin(angle);
  b.speed = B.startSpeed;
  b.vx = -b.speed * Math.cos(angle);
  b.vy = b.speed * Math.sin(angle);
  state.aim.lastHit = null;
  state.aim.ballId++;
  state.serveTimer = CONFIG.serveDelay;
}

function nextAimBall(state) {
  state.aim.round++;
  launchAimBall(state);
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
  const { mode } = state;
  const hasRightPaddle = mode === 'versus' || mode === 'cpu';

  dirs.forEach((dir, i) => {
    const p = state.paddles[i];
    p.y = clamp(p.y + dir * P.speed * dt, wall, height - wall - P.height);
  });
  if (mode === 'cpu') moveCpu(state, dt);

  // Paddles can move while the ball waits to be served
  if (state.serveTimer > 0) {
    state.serveTimer -= dt;
    return events;
  }

  // In aim practice, a ball that was hit only flies on long enough to show its path
  if (mode === 'aim' && state.aim.lastHit !== null) {
    state.aim.showTimer -= dt;
    if (state.aim.showTimer <= 0) {
      nextAimBall(state);
      return events;
    }
  }

  const b = state.ball;
  const prev = { x: b.x, y: b.y };
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
  if (mode === 'solo' && b.x + B.size > width - wall) {
    b.x = width - wall - B.size;
    b.vx = -Math.abs(b.vx);
    events.push({ type: 'wall' });
  }

  const hit = hitPaddle(state, 0, prev, events);
  if (hit !== null && mode === 'solo') state.scores[0]++;
  if (hit !== null && mode === 'aim') {
    state.aim.lastHit = hit;
    state.aim.showTimer = CONFIG.aim.showTime;
  }
  if (hasRightPaddle) hitPaddle(state, 1, prev, events);

  if (b.x + B.size < 0) leaveField(state, 0, events);
  else if (mode !== 'solo' && b.x > width) leaveField(state, 1, events);
  return events;
}

// Paddle 0 sends the ball right, paddle 1 sends it left. prev is where the ball
// was before this frame's move. Returns where on the paddle the ball hit, from
// -1 (top edge) to 1 (bottom edge), or null for no hit.
function hitPaddle(state, index, prev, events) {
  const { paddle: P, ball: B } = CONFIG;
  const p = state.paddles[index];
  const b = state.ball;
  const dir = index === 0 ? 1 : -1;
  // The ball's x when touching the paddle's face. Check whether the ball crossed
  // it this frame, rather than whether it overlaps now, so it can't skip through
  // at high speed.
  const contactX = dir > 0 ? p.x + P.width : p.x - B.size;
  const crossed = dir > 0
    ? b.vx < 0 && prev.x >= contactX && b.x < contactX
    : b.vx > 0 && prev.x <= contactX && b.x > contactX;
  if (!crossed) return null;

  // Where the ball was at the moment it reached the face. By the end of the
  // frame an angled ball has moved further up or down, which would put the hit
  // in the wrong spot.
  const t = (prev.x - contactX) / (prev.x - b.x);
  const contactY = prev.y + (b.y - prev.y) * t;
  if (contactY + B.size <= p.y || contactY >= p.y + P.height) return null;

  b.x = contactX;
  b.y = contactY;
  const offset = clamp((b.y + B.size / 2 - (p.y + P.height / 2)) / (P.height / 2), -1, 1);
  const angle = offset * CONFIG.maxBounceAngle;
  b.speed = Math.min(b.speed * B.speedUp, B.maxSpeed);
  b.vx = dir * b.speed * Math.cos(angle);
  b.vy = b.speed * Math.sin(angle);
  events.push({ type: 'paddle', speed: b.speed });
  return offset;
}

// side: 0 if the ball got past the left edge, 1 for the right
function leaveField(state, side, events) {
  if (state.mode === 'aim') {
    // Leaving on the right means it was hit. Either way, on to the next ball.
    if (side === 0) events.push({ type: 'miss' });
    nextAimBall(state);
    return;
  }
  const loser = side;
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
