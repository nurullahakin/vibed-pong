// Images the game draws itself on first use: the background, glowing paddles,
// the ball and sparks. No image files to load.

import { CONFIG } from './game/config.js';
import { COLORS, css } from './theme.js';

const GLOW = 8; // room around paddles and the ball for their glow, in pixels

function canvasTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, width, height);
  draw(texture.getContext(), width, height);
  texture.refresh();
  return key;
}

// A soft vertical gradient with a faint glow in the middle
export function backgroundTexture(scene) {
  const { width, height } = CONFIG;
  return canvasTexture(scene, 'background', width, height, (ctx) => {
    const fade = ctx.createLinearGradient(0, 0, 0, height);
    fade.addColorStop(0, css(COLORS.bgTop));
    fade.addColorStop(1, css(COLORS.bgBottom));
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
    glow.addColorStop(0, 'rgba(122, 162, 255, 0.08)');
    glow.addColorStop(1, 'rgba(122, 162, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  });
}

// A rounded paddle with a glow. fill is a color or a function that makes a
// canvas gradient, for the aim practice paddle.
export function paddleTexture(scene, key, fill, glowColor) {
  const { width, height } = CONFIG.paddle;
  return canvasTexture(scene, key, width + GLOW * 2, height + GLOW * 2, (ctx) => {
    ctx.shadowColor = css(glowColor);
    ctx.shadowBlur = 12;
    ctx.fillStyle = typeof fill === 'function' ? fill(ctx, GLOW, height) : css(fill);
    ctx.beginPath();
    ctx.roundRect(GLOW, GLOW, width, height, width / 2);
    ctx.fill();
  });
}

// A round ball with a soft glow, centered in its texture
export function ballTexture(scene) {
  const size = CONFIG.ball.size + GLOW * 2;
  return canvasTexture(scene, 'ball', size, size, (ctx) => {
    const c = size / 2;
    const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = css(COLORS.ball);
    ctx.beginPath();
    ctx.arc(c, c, CONFIG.ball.size / 2 + 1, 0, Math.PI * 2);
    ctx.fill();
  });
}

// A small round spark, white so particles can tint it
export function sparkTexture(scene) {
  return canvasTexture(scene, 'spark', 6, 6, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(3, 3, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}
