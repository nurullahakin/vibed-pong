// Visual effects that react to what happens in the game: a ball trail, sparks
// on impact, a paddle squash, a screen shake on a miss and a score pop.
// They only change how things look, never the game itself.
//
// Positions and directions start on the rules' field and go through the view,
// which turns them to match where you play on screen.

import { CONFIG } from './game/config.js';
import { sparkTexture } from './textures.js';
import { COLORS } from './theme.js';
import { makeView } from './view.js';

// Which way sparks fly on the field, in degrees (0 is along x, 90 along y), away
// from what was hit, and their color: the paddle's own, or a pale blue off the walls
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
  // paddleShapes: the drawn paddles by the rules' paddle number, with their origin
  // in the center. view: how the field sits on screen (as it is, unless solo is turned).
  constructor(scene, paddleShapes, view = makeView(), paddleTint = COLORS.left) {
    this.scene = scene;
    this.paddleShapes = paddleShapes;
    this.view = view;

    this.sparks = {};
    for (const [key, { angle, tint }] of Object.entries(SPRAY)) {
      this.sparks[key] = scene.add.particles(0, 0, sparkTexture(scene), {
        angle: { min: view.angle(angle.min), max: view.angle(angle.max) },
        // In solo your paddle's sparks match its color, whichever side it's on
        tint: key === 'paddle0' ? paddleTint : tint,
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

  // Sparks at a point on the field
  burst(key, count, x, y) {
    const at = this.view.point(x, y);
    this.sparks[key].explode(count, at.x, at.y);
  }

  // Call once per frame with the events from rules.update()
  play(events, state) {
    const { wall, ball: B } = CONFIG;
    // An older server may not send the field; it is the screen size then
    const { width, height } = state.field ?? CONFIG;
    const b = state.ball;
    const cx = b.x + B.size / 2;
    const cy = b.y + B.size / 2;
    // Faster balls throw more sparks
    const count = Math.round(5 + (b.speed / B.maxSpeed) * 10);

    for (const e of events) {
      if (e.type === 'wall') {
        if (e.wall === 'top') this.burst('top', count, cx, wall);
        if (e.wall === 'bottom') this.burst('bottom', count, cx, height - wall);
        if (e.wall === 'right') this.burst('right', count, width - wall, cy);
      } else if (e.type === 'paddle') {
        this.burst(`paddle${e.paddle}`, count, e.paddle === 0 ? b.x : b.x + B.size, cy);
        this.squash(this.paddleShapes[e.paddle]);
      } else if (e.type === 'miss' && !reduceMotion) {
        this.scene.cameras.main.shake(180, 0.008);
      }
    }
    this.drawTrail(state);
  }

  // The paddle bulges for a moment when it hits the ball. Its own x is its
  // thickness, even when it's turned to lie flat.
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
      const at = this.view.point(p.x + B.size / 2, p.y + B.size / 2);
      this.trail.fillStyle(COLORS.ball, t * 0.35);
      this.trail.fillCircle(at.x, at.y, size / 2);
    });
  }
}
