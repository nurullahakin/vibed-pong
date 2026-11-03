// The game itself: state and how it changes each frame. No drawing, sound or
// input here; scenes feed in paddle directions and react to the events.

import { CONFIG } from './config.js';
import { moveCpu } from './cpu.js';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// mode: 'solo' | 'versus' | 'cpu' | 'aim'
// options.side: in solo, the side you play on, 'left' (the default) or 'right'.
// The wall is on the other side.
export function createState(mode, options = {}) {
  const { width, height, paddle } = CONFIG;
  const y = (height - paddle.height) / 2;
  const state = {
    mode,
    side: mode === 'solo' && options.side === 'right' ? 1 : 0, // solo: your paddle, 0 left or 1 right
    scores: [0, 0], // solo only uses the first, whichever side you're on
    over: false,
    paddles: [
      { x: paddle.inset, y, speed: 0, dir: 0 },
      { x: width - paddle.inset - paddle.width, y, speed: 0, dir: 0 },
    ],
    ball: { x: 0, y: 0, vx: 0, vy: 0, speed: 0 },
    serveTimer: 0,
    cpu: { targetY: height / 2, lookTimer: 0, aimOffset: 0, incoming: false },
    // Aim practice. lastHit is where the ball hit the paddle, from -1 (top edge)
    // to 1 (bottom edge), or null before the hit. ballId changes with each ball.
    aim: { round: 0, lastHit: null, showTimer: 0, ballId: 0 },
  };
  if (mode === 'aim') launchAimBall(state);
  // Solo serves toward the wall, away from you, so you have a moment to get ready
  else if (mode === 'solo') serve(state, state.side === 0 ? 1 : -1);
  else serve(state, Math.random() < 0.5 ? 1 : -1);
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
// [{ type: 'wall', wall: 'top' }, { type: 'paddle', paddle: 0, speed }, { type: 'miss', side: 1 }].
export function update(state, dirs, dt) {
  const events = [];
  if (state.over) return events;
  const { width, height, wall, paddle: P, ball: B } = CONFIG;
  const { mode, side } = state;
  const solo = mode === 'solo';
  // Which paddles are in play. Solo has only yours, with a wall on the other side.
  const leftPaddle = !(solo && side === 1);
  const rightPaddle = mode === 'versus' || mode === 'cpu' || (solo && side === 1);

  // In solo, the one input moves your paddle, whichever side it's on
  dirs.forEach((dir, i) => movePaddle(state.paddles[solo ? side : i], dir, dt));
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
    events.push({ type: 'wall', wall: 'top' });
  } else if (b.y + B.size > height - wall) {
    b.y = height - wall - B.size;
    b.vy = -Math.abs(b.vy);
    events.push({ type: 'wall', wall: 'bottom' });
  }
  if (solo && side === 0 && b.x + B.size > width - wall) {
    b.x = width - wall - B.size;
    b.vx = -Math.abs(b.vx);
    events.push({ type: 'wall', wall: 'right' });
  } else if (solo && side === 1 && b.x < wall) {
    b.x = wall;
    b.vx = Math.abs(b.vx);
    events.push({ type: 'wall', wall: 'left' });
  }

  const leftHit = leftPaddle ? hitPaddle(state, 0, prev, events) : null;
  const rightHit = rightPaddle ? hitPaddle(state, 1, prev, events) : null;
  if (solo && (leftHit !== null || rightHit !== null)) state.scores[0]++;
  if (mode === 'aim' && leftHit !== null) {
    state.aim.lastHit = leftHit;
    state.aim.showTimer = CONFIG.aim.showTime;
  }

  if (leftPaddle && b.x + B.size < 0) leaveField(state, 0, events);
  // Aim practice has no right paddle, but its balls fly off that way after a hit
  else if ((rightPaddle || mode === 'aim') && b.x > width) leaveField(state, 1, events);
  return events;
}

// Paddles start slow and speed up while the key is held, so a short tap is a
// small nudge. Letting go stops the paddle at once, and reversing starts slow again.
function movePaddle(p, dir, dt) {
  const { height, wall, paddle: P } = CONFIG;
  if (dir === 0) p.speed = 0;
  else if (dir !== p.dir) p.speed = P.startSpeed;
  else p.speed = Math.min(p.speed + P.accel * dt, P.maxSpeed);
  p.dir = dir;
  p.y = clamp(p.y + dir * p.speed * dt, wall, height - wall - P.height);
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
  events.push({ type: 'paddle', paddle: index, speed: b.speed });
  return offset;
}

// side: 0 if the ball got past the left edge, 1 for the right
function leaveField(state, side, events) {
  if (state.mode === 'aim') {
    // Leaving on the right means it was hit. Either way, on to the next ball.
    if (side === 0) events.push({ type: 'miss', side });
    nextAimBall(state);
    return;
  }
  const loser = side;
  events.push({ type: 'miss', side });
  if (state.mode === 'solo') {
    state.over = true;
    return;
  }
  const winner = 1 - loser;
  state.scores[winner]++;
  if (state.scores[winner] >= CONFIG.winScore) state.over = true;
  else serve(state, loser === 0 ? -1 : 1); // toward the player who conceded
}
