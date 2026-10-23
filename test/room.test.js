// Online rooms without a network: fake players record what the server sends them,
// and mock timers run countdowns and matches instantly.

import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../server/room.js';

function fakePlayer(name) {
  const inbox = [];
  return { name, inbox, send: (m) => inbox.push(m), last: (type) => inbox.filter((m) => m.type === type).at(-1) };
}

// Moves the fake clock forward a little at a time, like a real one. A single big
// mock tick would show every timer callback the end time at once.
function advance(ms) {
  for (let t = 0; t < ms; t += 5) mock.timers.tick(5);
}

function setup() {
  mock.timers.enable({ apis: ['setInterval', 'Date'] });
  const room = new Room('TEST', 'Test Room', () => {});
  const a = fakePlayer('A');
  const b = fakePlayer('B');
  room.join(a);
  room.join(b);
  return { room, a, b };
}

test('room: two players fill it, and a third is turned away', (t) => {
  t.after(() => mock.timers.reset());
  const { room, a, b } = setup();
  assert.equal(room.join(fakePlayer('C')), false);
  assert.deepEqual(a.last('room').room.players.map((p) => p.name), ['A', 'B']);
  assert.equal(a.last('room').seat, 0);
  assert.equal(b.last('room').seat, 1);
});

test('room: the room list shows its name, its players and what it is doing', (t) => {
  t.after(() => mock.timers.reset());
  const { room } = setup();
  assert.deepEqual(room.info(), { id: 'TEST', name: 'Test Room', players: ['A', 'B'], status: 'waiting' });
});

test('room: either player can rename it, but not mid-match or from outside', (t) => {
  t.after(() => mock.timers.reset());
  const { room, a, b } = setup();
  room.rename(b, 'Friday Night');
  assert.equal(a.last('room').room.name, 'Friday Night', 'the other player sees it');
  room.rename(fakePlayer('Stranger'), 'Taken Over');
  room.rename(a, '');
  assert.equal(room.name, 'Friday Night');
  room.setReady(a, true);
  room.setReady(b, true);
  advance(3000);
  room.rename(a, 'Mid Match');
  assert.equal(room.name, 'Friday Night');
});

test('room: the match starts after both are ready and a countdown', (t) => {
  t.after(() => mock.timers.reset());
  const { room, a, b } = setup();
  room.setReady(a, true);
  assert.equal(room.status, 'waiting');
  room.setReady(b, true);
  assert.equal(room.status, 'countdown');
  assert.equal(a.last('countdown').seconds, 3);

  advance(3000);
  assert.equal(room.status, 'playing');
  assert.deepEqual(a.last('start'), { type: 'start', seat: 0 });
  assert.deepEqual(b.last('start'), { type: 'start', seat: 1 });

  advance(1000);
  assert.ok(a.inbox.filter((m) => m.type === 'state').length >= 50, 'about 60 updates a second');
});

test('room: the game follows real time, even when the timer fires late', (t) => {
  t.after(() => mock.timers.reset());
  const { room, a, b } = setup();
  room.setReady(a, true);
  room.setReady(b, true);
  advance(3000 + 1000); // countdown, then the 1 second serve wait
  const before = room.state.ball.x;
  // Stop the timer and let 100 ms pass at once, like a late timer on Windows
  clearInterval(room.timer);
  advance(100);
  room.tick();
  const moved = Math.abs(room.state.ball.x - before);
  const expected = room.state.ball.speed * 0.1 * Math.abs(room.state.ball.vx) / room.state.ball.speed;
  assert.ok(Math.abs(moved - expected) < 6, `moved ${moved.toFixed(1)}px, expected about ${expected.toFixed(1)}px`);
});

test('room: un-readying during the countdown cancels it', (t) => {
  t.after(() => mock.timers.reset());
  const { room, a, b } = setup();
  room.setReady(a, true);
  room.setReady(b, true);
  room.setReady(b, false);
  assert.equal(room.status, 'waiting');
  advance(5000);
  assert.equal(a.last('start'), undefined);
});

test('room: inputs move the right paddle', (t) => {
  t.after(() => mock.timers.reset());
  const { room, a, b } = setup();
  room.setReady(a, true);
  room.setReady(b, true);
  advance(3000);
  const startY = a.last('state')?.state.paddles[1].y ?? room.state.paddles[1].y;
  room.input(b, 1);
  advance(500);
  const { paddles } = a.last('state').state;
  assert.ok(paddles[1].y > startY, 'right paddle moved down');
  assert.equal(paddles[0].y, startY, 'left paddle stayed');
});

test('room: a full match ends, and both go back to waiting, not ready', (t) => {
  t.after(() => mock.timers.reset());
  const { room, a, b } = setup();
  room.setReady(a, true);
  room.setReady(b, true);
  advance(3000);
  // Nobody moves, so points keep coming until someone reaches 11
  for (let i = 0; i < 600 && room.status === 'playing'; i++) advance(1000);
  const over = a.last('over');
  assert.ok(over, 'match ended');
  assert.equal(Math.max(...over.scores), 11);
  assert.equal(room.status, 'waiting');
  assert.deepEqual(a.last('room').room.players.map((p) => p.ready), [false, false]);
});

test('room: if a player leaves mid-match, the other is told and the match stops', (t) => {
  t.after(() => mock.timers.reset());
  const { room, a, b } = setup();
  room.setReady(a, true);
  room.setReady(b, true);
  advance(4000);
  room.leave(b);
  assert.equal(room.status, 'waiting');
  const message = a.last('room');
  assert.equal(message.room.notice, 'Your opponent left');
  assert.equal(message.room.players.length, 1);
  const updates = a.inbox.length;
  advance(2000);
  assert.equal(a.inbox.length, updates, 'no more game updates');
});
