// Views put the field on any side of the screen: solo on each side, two players facing each other

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/game/config.js';
import { createState } from '../src/game/rules.js';
import { makeView, SIDES, viewFor } from '../src/view.js';

const { width, height } = CONFIG;
const near = (a, b) => Math.abs(a - b) < 1e-9;

// Where your paddle's center and the wall end up on screen
function layout(side) {
  const view = makeView(side);
  const state = createState('solo', { sideways: view.sideways });
  const p = state.paddles[0];
  const paddle = view.point(p.x + CONFIG.paddle.width / 2, p.y + CONFIG.paddle.height / 2);
  const wall = view.point(state.field.width - CONFIG.wall / 2, state.field.height / 2);
  return { paddle, wall, view, state };
}

test('view: your paddle and the wall land on opposite edges, for every side', () => {
  const edges = {
    left: ({ x }) => x < 50,
    right: ({ x }) => x > width - 50,
    top: ({ y }) => y < 50,
    bottom: ({ y }) => y > height - 50,
  };
  const opposite = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
  for (const side of SIDES) {
    const { paddle, wall } = layout(side);
    assert.ok(edges[side](paddle), `${side}: paddle at ${JSON.stringify(paddle)}`);
    assert.ok(edges[opposite[side]](wall), `${side}: wall at ${JSON.stringify(wall)}`);
  }
});

test('view: the field fills the screen exactly, for every side', () => {
  for (const side of SIDES) {
    const { view, state } = layout(side);
    const corners = [[0, 0], [state.field.width, 0], [0, state.field.height], [state.field.width, state.field.height]]
      .map(([x, y]) => view.point(x, y));
    const xs = corners.map((c) => c.x);
    const ys = corners.map((c) => c.y);
    assert.deepEqual([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)], [0, width, 0, height], side);
  }
});

test('view: directions turn with the field, so sparks fly the right way', () => {
  // Along the field's x is "away from you, toward the wall"
  const away = { left: 0, right: 180, top: 90, bottom: -90 };
  for (const side of SIDES) assert.ok(near(makeView(side).angle(0), away[side]), side);
  // Angle ranges stay ranges: 30° either side of "away" stays 60° wide
  for (const side of SIDES) {
    const view = makeView(side);
    assert.ok(near(Math.abs(view.angle(30) - view.angle(-30)), 60), side);
  }
});

test('view: two players on the top and bottom face each other across the screen', () => {
  const view = viewFor('versus', { sides: 'topBottom' });
  const state = createState('versus', { sideways: view.sideways });
  const [top, bottom] = state.paddles.map((p) => view.point(p.x + CONFIG.paddle.width / 2, p.y + CONFIG.paddle.height / 2));
  assert.ok(top.y < 50 && bottom.y > height - 50, `paddles at ${top.y} and ${bottom.y}`);
  assert.equal(viewFor('versus').side, 'left', 'left and right by default');
  assert.equal(viewFor('cpu', { sides: 'topBottom' }).side, 'left', 'only two players can turn');
});

test('view: top and bottom lay paddles flat, left and right keep them upright', () => {
  assert.deepEqual(SIDES.map((side) => makeView(side).sideways), [false, false, true, true]);
});
