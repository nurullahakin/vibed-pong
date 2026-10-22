import { CONFIG } from './config.js';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// The CPU follows where the ball is (it doesn't predict bounces), only looks a
// few times a second, moves slower than the player and aims a bit off-center,
// so it can be beaten.
export function moveCpu(state, dt) {
  const { height, wall, paddle: P, ball: B, cpu } = CONFIG;
  const p = state.paddles[1];
  const b = state.ball;
  const c = state.cpu;

  const incoming = b.vx > 0;
  if (incoming && !c.incoming) c.aimOffset = (Math.random() * 2 - 1) * cpu.aimError;
  c.incoming = incoming;

  c.lookTimer -= dt;
  if (c.lookTimer <= 0) {
    c.lookTimer = cpu.reaction;
    // Chase the ball when it's coming, otherwise drift back to the middle
    c.targetY = incoming ? b.y + B.size / 2 + c.aimOffset : height / 2;
  }

  const diff = c.targetY - (p.y + P.height / 2);
  const step = Math.min(Math.abs(diff), cpu.speed * dt);
  p.y = clamp(p.y + Math.sign(diff) * step, wall, height - wall - P.height);
}
