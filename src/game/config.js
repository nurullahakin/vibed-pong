// Tuning values for the game. Everything in src/game/ is plain JavaScript with
// no Phaser, so the same rules can run on a multiplayer server later.

export const CONFIG = {
  width: 800,
  height: 600,
  wall: 10,
  paddle: {
    inset: 20,
    width: 10,
    height: 80,
    // Paddles start slow and speed up while a key is held, in pixels per second
    startSpeed: 120,
    maxSpeed: 520,
    accel: 1800, // reaches top speed after about a fifth of a second
  },
  ball: { size: 10, startSpeed: 350, speedUp: 1.05, maxSpeed: 900 },
  maxBounceAngle: Math.PI / 3, // reached when the ball hits the paddle's very edge
  maxServeAngle: Math.PI / 4,
  winScore: 11,
  serveDelay: 1, // seconds before each serve against another player or the CPU
  cpu: {
    speed: 250, // steady, while the player's paddle speeds up to 520
    reaction: 0.25, // seconds between looks at the ball
    aimError: 30, // how far off-center it may aim, in pixels
  },
  aim: {
    // Aim practice balls, in order. Each heads for the middle of the paddle's line.
    patterns: [
      { name: 'straight', angle: 0 },
      { name: 'from above', angle: 35 }, // degrees, heading down
      { name: 'from below', angle: -35 },
    ],
    distance: 380, // how far from the paddle each ball starts, in pixels
    showTime: 1.5, // seconds the ball keeps flying after a hit, so you see where it went
  },
  volume: 0.15,
};

// Keys for each human-controlled paddle, left first. With only one human,
// either set moves their paddle. Names match Phaser's key names.
const EITHER_KEYS = { up: ['W', 'UP'], down: ['S', 'DOWN'] };
export const CONTROLS = {
  solo: [EITHER_KEYS],
  cpu: [EITHER_KEYS],
  aim: [EITHER_KEYS],
  versus: [
    { up: ['W'], down: ['S'] },
    { up: ['UP'], down: ['DOWN'] },
  ],
};
