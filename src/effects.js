// Visual effects that react to what happens in the game: a ball trail, sparks
// on impact, a paddle squash, a screen shake on a miss and a score pop.
// They only change how things look, never the game itself.

import { CONFIG } from './game/config.js';
import { sparkTexture } from './textures.js';
import { COLORS } from './theme.js';

// Which way sparks fly, in degrees (0 is right, 90 is down), away from what was
// hit, and their color: the paddle's own, or a pale blue off the walls
const SPRAY = {
  top: { angle: { min: 30, max: 150 }, tint: COLORS.spark },
  bottom: { angle: { min: 210, max: 330 }, tint: COLORS.spark },
  right: { angle: { min: 120, max: 240 }, tint: COLORS.spark },
  paddle0: { angle: { min: -60, max: 60 }, tint: COLORS.left },
  paddle1: { angle: { min: 120, max: 240 }, tint: COLORS.right },
};

// Players can ask their system for less motion. Screen shake is skipped for them.
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export class Effects {
  // paddleShapes: the drawn paddles, left first, with their origin in the center
  constructor(scene, paddleShapes) {
    this.scene = scene;
    this.paddleShapes = paddleShapes;

    this.sparks = {};
    for (const [key, { angle, tint }] of Object.entries(SPRAY)) {
      this.sparks[key] = scene.add.particles(0, 0, sparkTexture(scene), {
        angle,
        tint,
        speed: { min: 80, max: 240 },
        lifespan: 300,
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        emitting: false,
      });
    }

    this.trail = scene.add.graphics().setDepth(-1);
    this.trailPoints = [];
  }

  // Call once per frame with the events from rules.update()
  play(events, state) {
    const { width, height, wall, ball: B } = CONFIG;
    const b = state.ball;
    const cx = b.x + B.size / 2;
    const cy = b.y + B.size / 2;
    // Faster balls throw more sparks
    const count = Math.round(5 + (b.speed / B.maxSpeed) * 10);

    for (const e of events) {
      if (e.type === 'wall') {
        if (e.wall === 'top') this.sparks.top.explode(count, cx, wall);
        if (e.wall === 'bottom') this.sparks.bottom.explode(count, cx, height - wall);
        if (e.wall === 'right') this.sparks.right.explode(count, width - wall, cy);
      } else if (e.type === 'paddle') {
        const x = e.paddle === 0 ? b.x : b.x + B.size;
        this.sparks[`paddle${e.paddle}`].explode(count, x, cy);
        this.squash(this.paddleShapes[e.paddle]);
      } else if (e.type === 'miss' && !reduceMotion) {
        this.scene.cameras.main.shake(180, 0.008);
      }
    }
    this.drawTrail(state);
  }

  // The paddle bulges for a moment when it hits the ball
  squash(shape) {
    if (!shape) return;
    this.scene.tweens.killTweensOf(shape);
    shape.setScale(1);
    this.scene.tweens.add({ targets: shape, scaleX: 1.6, scaleY: 0.92, duration: 60, yoyo: true, ease: 'Quad.easeOut' });
  }

  // Text grows for a moment, e.g. when a score changes
  pop(text) {
    this.scene.tweens.killTweensOf(text);
    text.setScale(1.5);
    this.scene.tweens.add({ targets: text, scale: 1, duration: 250, ease: 'Back.easeOut' });
  }

  // Fading copies of the ball along its recent path, longer when it's faster
  drawTrail(state) {
    const { ball: B } = CONFIG;
    const b = state.ball;
    const last = this.trailPoints.at(-1);
    // A waiting ball has no trail, and a jump means it was just served from elsewhere
    if (state.serveTimer > 0 || (last && Math.hypot(b.x - last.x, b.y - last.y) > 50)) {
      this.trailPoints = [];
    }
    if (state.serveTimer <= 0) this.trailPoints.push({ x: b.x, y: b.y });

    const speedUp = (b.speed - B.startSpeed) / (B.maxSpeed - B.startSpeed);
    const length = Math.round(6 + 10 * speedUp);
    while (this.trailPoints.length > length) this.trailPoints.shift();

    this.trail.clear();
    const n = this.trailPoints.length;
    this.trailPoints.forEach((p, i) => {
      const t = (i + 1) / (n + 1); // 0 for the oldest copy, nearly 1 for the newest
      const size = B.size * (0.4 + 0.6 * t);
      this.trail.fillStyle(COLORS.ball, t * 0.35);
      this.trail.fillCircle(p.x + B.size / 2, p.y + B.size / 2, size / 2);
    });
  }
}
