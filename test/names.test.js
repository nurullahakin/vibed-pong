// Room and player names: random suggestions, and cleaning up what people type

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PLAYER_NAME, MAX_ROOM_NAME, cleanPlayerName, cleanRoomName, randomRoomName } from '../src/game/names.js';

// Invisible characters, spelled out so the source stays readable
const NULL = String.fromCharCode(0);
const BELL = String.fromCharCode(7);
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

test('names: a random name is two words, and avoids names already taken', () => {
  assert.match(randomRoomName(), /^\w+ \w+$/);
  const taken = new Set();
  for (let i = 0; i < 30; i++) taken.add(randomRoomName(taken));
  assert.equal(taken.size, 30, 'no repeats while there are free names');
});

test('names: typed names are trimmed, squeezed and cut to length', () => {
  assert.equal(cleanRoomName('  Friday   night  pong '), 'Friday night pong');
  assert.equal(cleanRoomName('Çılgın Şampiyonlar'), 'Çılgın Şampiyonlar');
  assert.equal(cleanRoomName('x'.repeat(40)).length, MAX_ROOM_NAME);
});

test('names: player names are cleaned the same way, but kept shorter', () => {
  assert.equal(cleanPlayerName('  Ada   Lovelace '), 'Ada Lovelace');
  assert.equal(cleanPlayerName('y'.repeat(40)).length, MAX_PLAYER_NAME);
  assert.equal(cleanPlayerName(BELL), '');
});

test('names: invisible characters are dropped, and empty names stay empty', () => {
  assert.equal(cleanRoomName(`Pong${NULL}${ZERO_WIDTH_SPACE} Club`), 'Pong Club');
  assert.equal(cleanRoomName('   '), '');
  assert.equal(cleanRoomName(undefined), '');
  assert.equal(cleanRoomName(42), '42');
});
