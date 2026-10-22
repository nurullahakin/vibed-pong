// Plays the game rules without a browser. Run with `npm test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/game/config.js';
import { aimPattern, createState, update } from '../src/game/rules.js';

const DT = 1 / 60;
const { width, height, paddle: P } = CONFIG;

// A paddle that follows the ball, hitting with different parts of the paddle
function follow(state, index, frame) {
  state.paddles[index].y = state.ball.y - P.height / 2 + 5 + Math.sin(frame) * 30;
}

// A paddle that stays as far from the ball as it can
function dodge(state, index) {
  state.paddles[index].y = state.ball.y > height / 2 ? 10 : height - 10 - P.height;
}

function play(state, frames, beforeEachFrame) {
  const events = [];
  for (let i = 0; i < frames && !state.over; i++) {
    beforeEachFrame(i);
    events.push(...update(state, [0, 0], DT));
  }
  return events;
}

test('solo: a player who never misses keeps scoring, even at top speed', () => {
  const state = createState('solo');
  let leftField = false;
  // Top speed takes about 20 hits, so play for two minutes
  const events = play(state, 60 * 120, (i) => {
    follow(state, 0, i);
    const b = state.ball;
    if (b.y < 0 || b.y > height || b.x > width) leftField = true;
  });
  assert.equal(state.over, false);
  assert.ok(state.scores[0] > 10, `score ${state.scores[0]}`);
  assert.equal(state.ball.speed, CONFIG.ball.maxSpeed);
  assert.equal(leftField, false);
  assert.equal(events.filter((e) => e.type === 'paddle').length, state.scores[0]);
});

test('solo: one miss ends the game', () => {
  const state = createState('solo');
  const events = play(state, 60 * 30, () => dodge(state, 0));
  assert.equal(state.over, true);
  assert.equal(state.scores[0], 0);
  assert.deepEqual(events.at(-1), { type: 'miss' });
});

test('versus: the ball waits before each serve', () => {
  const state = createState('versus');
  const x = state.ball.x;
  update(state, [0, 0], DT);
  assert.equal(state.ball.x, x);
});

test('versus: two perfect players never score', () => {
  const state = createState('versus');
  play(state, 60 * 60, (i) => state.paddles.forEach((_, n) => follow(state, n, i)));
  assert.deepEqual(state.scores, [0, 0]);
});

test('versus: first to 11 wins, and each serve goes to whoever lost the point', () => {
  const state = createState('versus');
  let points = 0;
  play(state, 60 * 600, (i) => {
    follow(state, 1, i);
    dodge(state, 0);
    if (state.scores[1] !== points) {
      points = state.scores[1];
      if (!state.over) assert.ok(state.ball.vx < 0, 'serve should head left');
    }
  });
  assert.equal(state.over, true);
  assert.deepEqual(state.scores, [0, CONFIG.winScore]);
});

test('cpu: the computer returns a ball that comes straight at it', () => {
  const state = createState('cpu');
  state.ball.vx = state.ball.speed;
  state.ball.vy = 0;
  const events = play(state, 60 * 5, () => {});
  assert.ok(events.some((e) => e.type === 'paddle'));
  assert.equal(state.scores[0], 0, 'the CPU never lost the point');
});

test('cpu: the computer beats a player who never moves', () => {
  const state = createState('cpu');
  play(state, 60 * 600, () => {});
  assert.equal(state.over, true);
  assert.equal(state.scores[1], CONFIG.winScore);
});

// Steps aim practice until the current ball is hit or a new ball starts
function playAimBall(state, beforeEachFrame = () => {}) {
  const id = state.aim.ballId;
  for (let i = 0; i < 60 * 10; i++) {
    beforeEachFrame();
    update(state, [0], DT);
    if (state.aim.lastHit !== null || state.aim.ballId !== id) return;
  }
  throw new Error('ball never arrived');
}

test('aim: balls come straight, from above, then from below, aimed at the middle', () => {
  const state = createState('aim');
  const seen = [];
  for (let n = 0; n < 4; n++) {
    seen.push(aimPattern(state).name);
    const vy = state.ball.vy;
    playAimBall(state); // the paddle stays in the middle
    assert.ok(Math.abs(state.aim.lastHit) < 0.05, `hit ${state.aim.lastHit}`);
    if (n === 1) assert.ok(vy > 0, 'from above heads down');
    if (n === 2) assert.ok(vy < 0, 'from below heads up');
    while (state.aim.lastHit !== null) update(state, [0], DT); // wait for the next ball
  }
  assert.deepEqual(seen, ['straight', 'from above', 'from below', 'straight']);
});

test('aim: the same spot on the paddle gives the same shot, whatever the incoming angle', () => {
  const state = createState('aim');
  const shots = [];
  for (let n = 0; n < 3; n++) {
    // Line the paddle up so the ball meets it near the top edge
    playAimBall(state, () => { state.paddles[0].y = height / 2 - 5; });
    const { vx, vy } = state.ball;
    shots.push((Math.atan2(vy, vx) * 180) / Math.PI);
    assert.ok(state.aim.lastHit < -0.8);
    while (state.aim.lastHit !== null) update(state, [0], DT);
  }
  assert.ok(Math.max(...shots) - Math.min(...shots) < 0.01, `angles ${shots}`);
  assert.ok(shots[0] < -45, 'steep upward');
});

test('aim: a miss moves on to the next ball and never ends the game', () => {
  const state = createState('aim');
  for (let n = 0; n < 3; n++) {
    const id = state.aim.ballId;
    let events = [];
    while (state.aim.ballId === id) {
      dodge(state, 0);
      events = update(state, [0], DT);
    }
    assert.deepEqual(events, [{ type: 'miss' }]);
  }
  assert.equal(state.over, false);
  assert.equal(aimPattern(state).name, 'straight');
});

test('paddles start slow, speed up while held, and stop when let go', () => {
  const state = createState('versus');
  const p = state.paddles[0];
  const moved = (frames, dir) => {
    const y = p.y;
    for (let i = 0; i < frames; i++) update(state, [dir, 0], DT);
    return Math.abs(p.y - y);
  };

  const tap = moved(4, 1); // a quick tap, about 1/15 of a second
  assert.ok(tap < 12, `tap moved ${tap}px`);
  assert.equal(moved(1, 0), 0); // letting go stops it at once

  moved(30, 1); // hold for half a second
  assert.equal(p.speed, P.maxSpeed);
  moved(1, -1); // reversing starts slow again
  assert.equal(p.speed, P.startSpeed);
});

test('paddles stay inside the walls', () => {
  const state = createState('versus');
  for (let i = 0; i < 120; i++) update(state, [-1, 1], DT);
  assert.equal(state.paddles[0].y, CONFIG.wall);
  assert.equal(state.paddles[1].y, height - CONFIG.wall - P.height);
});
