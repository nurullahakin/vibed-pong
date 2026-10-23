// One online room: up to two players, ready-up, a countdown, then a match run
// with the same rules as local play. The server is in charge of the game; players
// only send which way they're pressing.

import { createState, update } from '../src/game/rules.js';

const TICK = 1 / 60; // seconds per game step
// Timers aren't exact: on Windows, one asked to fire 60 times a second fires about
// 35 times. So the loop checks twice as often as needed, and each check runs as
// many game steps as the real time that has passed calls for.
const CHECK_EVERY = (TICK * 1000) / 2; // milliseconds
const MAX_CATCH_UP = 0.25; // seconds; after a long stall, don't fast-forward further
const COUNTDOWN = 3; // seconds

// player: { id, name, send(message) }
export class Room {
  constructor(id, name, onChange) {
    this.id = id; // a short code, like "K7QF"
    this.name = name; // a friendly name, like "Swift Comet"
    this.onChange = onChange; // called when the room list should be refreshed
    this.players = []; // [{ player, ready, dir }], seat 0 plays left, seat 1 right
    this.status = 'waiting'; // waiting | countdown | playing
    this.notice = null;
  }

  get full() {
    return this.players.length === 2;
  }

  // What the room list shows about this room
  info() {
    return {
      id: this.id,
      name: this.name,
      players: this.players.map((p) => p.player.name),
      status: this.status,
    };
  }

  join(player) {
    if (this.full || this.status !== 'waiting') return false;
    this.players.push({ player, ready: false, dir: 0 });
    this.notice = null;
    this.broadcastRoom();
    this.onChange();
    return true;
  }

  leave(player) {
    const seat = this.seat(player);
    if (seat === -1) return;
    this.players.splice(seat, 1);
    if (this.status !== 'waiting') {
      this.stop();
      this.notice = 'Your opponent left';
    }
    for (const p of this.players) p.ready = false;
    this.broadcastRoom();
    this.onChange();
  }

  setReady(player, ready) {
    const seat = this.seat(player);
    if (seat === -1 || this.status === 'playing') return;
    this.players[seat].ready = Boolean(ready);
    if (this.status === 'countdown' && !ready) this.stop();
    this.broadcastRoom();
    if (this.full && this.players.every((p) => p.ready)) this.startCountdown();
  }

  // Either player can rename the room while it isn't mid-match
  rename(player, name) {
    if (this.seat(player) === -1 || this.status === 'playing' || !name || name === this.name) return;
    this.name = name;
    this.broadcastRoom();
    this.onChange();
  }

  input(player, dir) {
    const seat = this.seat(player);
    if (seat === -1) return;
    this.players[seat].dir = dir === 1 || dir === -1 ? dir : 0;
  }

  seat(player) {
    return this.players.findIndex((p) => p.player === player);
  }

  startCountdown() {
    this.status = 'countdown';
    this.onChange();
    let left = COUNTDOWN;
    this.broadcast({ type: 'countdown', seconds: left });
    this.timer = setInterval(() => {
      left--;
      if (left > 0) this.broadcast({ type: 'countdown', seconds: left });
      else this.startMatch();
    }, 1000);
  }

  startMatch() {
    clearInterval(this.timer);
    this.status = 'playing';
    this.state = createState('versus');
    this.players.forEach((p, seat) => {
      p.dir = 0;
      p.player.send({ type: 'start', seat });
    });
    this.lastTick = Date.now();
    this.unplayed = 0; // seconds of real time not yet turned into game steps
    this.timer = setInterval(() => this.tick(), CHECK_EVERY);
  }

  tick() {
    const now = Date.now();
    this.unplayed = Math.min(this.unplayed + (now - this.lastTick) / 1000, MAX_CATCH_UP);
    this.lastTick = now;
    if (this.unplayed < TICK) return; // too early for the next step

    const events = [];
    const dirs = this.players.map((p) => p.dir);
    while (this.unplayed >= TICK && !this.state.over) {
      events.push(...update(this.state, dirs, TICK));
      this.unplayed -= TICK;
    }
    this.broadcast({ type: 'state', state: snapshot(this.state), events });
    if (this.state.over) {
      const { scores } = this.state;
      this.stop();
      this.broadcast({ type: 'over', scores });
      for (const p of this.players) p.ready = false;
      this.broadcastRoom();
    }
  }

  // Ends a countdown or match and goes back to waiting
  stop() {
    clearInterval(this.timer);
    this.status = 'waiting';
    this.state = null;
    this.onChange();
  }

  broadcastRoom() {
    for (const [seat, p] of this.players.entries()) {
      p.player.send({
        type: 'room',
        room: {
          id: this.id,
          name: this.name,
          status: this.status,
          notice: this.notice,
          players: this.players.map((q) => ({ name: q.player.name, ready: q.ready })),
        },
        seat,
      });
    }
  }

  broadcast(message) {
    for (const p of this.players) p.player.send(message);
  }
}

// The part of the game state players need to draw it
function snapshot(state) {
  const { mode, scores, over, paddles, ball, serveTimer } = state;
  return {
    mode,
    scores,
    over,
    serveTimer,
    paddles: paddles.map(({ x, y }) => ({ x, y })),
    ball: { x: ball.x, y: ball.y, speed: ball.speed },
  };
}
