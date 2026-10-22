// Plays the game rules without a browser. Run with `npm test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/game/config.js';
import { createState, update } from '../src/game/rules.js';

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

test('cpu: the computer returns the ball, and beats a player who never moves', () => {
  const state = createState('cpu');
  const events = play(state, 60 * 600, () => {});
  assert.equal(state.over, true);
  assert.equal(state.scores[1], CONFIG.winScore);
  assert.ok(events.some((e) => e.type === 'paddle'));
});

test('paddles stay inside the walls', () => {
  const state = createState('versus');
  for (let i = 0; i < 120; i++) update(state, [-1, 1], DT);
  assert.equal(state.paddles[0].y, CONFIG.wall);
  assert.equal(state.paddles[1].y, height - CONFIG.wall - P.height);
});
