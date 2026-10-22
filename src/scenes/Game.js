import { Scene } from 'phaser';
import { CONFIG, CONTROLS } from '../game/config.js';
import * as rules from '../game/rules.js';
import { playEvents } from '../sound.js';
import { addText, addMutedLabel, bindMuteKey } from '../ui.js';

const WHITE = 0xffffff;

// Runs one game: reads the keys, steps the rules, then moves the shapes to match
export class Game extends Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.mode = data.mode;
  }

  create() {
    const { width, height, wall, paddle: P, ball: B } = CONFIG;
    const { mode } = this;
    const onePaddle = mode === 'solo' || mode === 'aim';
    this.state = rules.createState(mode);

    this.add.rectangle(0, 0, width, wall, WHITE).setOrigin(0);
    this.add.rectangle(0, height - wall, width, wall, WHITE).setOrigin(0);
    if (mode === 'solo') {
      this.add.rectangle(width - wall, 0, wall, height, WHITE).setOrigin(0);
    } else if (mode !== 'aim') {
      for (let y = wall + 10; y < height - wall; y += 30) {
        this.add.rectangle(width / 2 - 2, y, 4, 15, WHITE).setOrigin(0);
      }
    }

    const shown = onePaddle ? this.state.paddles.slice(0, 1) : this.state.paddles;
    this.paddles = shown.map((p) =>
      mode === 'aim'
        ? this.add.image(p.x, p.y, this.aimPaddleTexture()).setOrigin(0)
        : this.add.rectangle(p.x, p.y, P.width, P.height, WHITE).setOrigin(0));
    this.ball = this.add.rectangle(0, 0, B.size, B.size, WHITE).setOrigin(0);

    if (mode === 'solo') {
      this.scoreTexts = [addText(this, width / 2, 62, '0', 48)];
      this.bestText = addText(this, width - 30, 39, '', 18, 1);
    } else if (mode === 'aim') {
      this.scoreTexts = [];
      this.createAimGuide();
    } else {
      this.scoreTexts = [addText(this, width / 4, 62, '0', 48), addText(this, (width * 3) / 4, 62, '0', 48)];
      const cpu = mode === 'cpu';
      this.serveHints = [
        addText(this, width / 4, height - 40, cpu ? 'W/S or ↑/↓' : 'W/S', 16),
        addText(this, (width * 3) / 4, height - 40, cpu ? 'CPU' : '↑/↓', 16),
      ];
    }

    this.keys = this.input.keyboard.addKeys('W,S,UP,DOWN');
    this.input.keyboard.on('keydown-P', () => {
      this.scene.pause();
      this.scene.launch('Pause');
    });
    bindMuteKey(this);
    addMutedLabel(this);
    this.sync();
  }

  update(time, delta) {
    // Cap the step so a slow frame doesn't fling the ball across the screen
    const dt = Math.min(delta / 1000, 1 / 30);
    const held = (names) => names.some((k) => this.keys[k].isDown);
    const dirs = CONTROLS[this.mode].map(({ up, down }) => (held(down) ? 1 : 0) - (held(up) ? 1 : 0));

    playEvents(this.sound, rules.update(this.state, dirs, dt));
    this.sync();

    if (this.state.over) {
      this.scene.pause();
      this.scene.launch('GameOver', {
        mode: this.mode,
        scores: [...this.state.scores],
        best: this.registry.get('best'),
      });
    }
  }

  // Moves the shapes and updates the text to match the game state
  sync() {
    const s = this.state;
    this.paddles.forEach((rect, i) => rect.setPosition(s.paddles[i].x, s.paddles[i].y));
    this.ball.setPosition(s.ball.x, s.ball.y);
    this.scoreTexts.forEach((text, i) => text.setText(s.scores[i]));

    if (this.mode === 'solo') {
      // Best score lives in the registry so it survives between games
      const best = Math.max(this.registry.get('best') ?? 0, s.scores[0]);
      this.registry.set('best', best);
      this.bestText.setText(`BEST ${best}`);
    } else if (this.mode === 'aim') {
      this.syncAimGuide();
    } else {
      this.serveHints.forEach((text) => text.setVisible(s.serveTimer > 0));
    }
  }

  // Colors the aim practice paddle by where it sends the ball: blue at the top
  // (steep up), white in the middle (straight), red at the bottom (steep down).
  // The angle changes evenly along the paddle, so a smooth gradient matches it.
  aimPaddleTexture() {
    const key = 'aim-paddle';
    if (!this.textures.exists(key)) {
      const { width, height } = CONFIG.paddle;
      const texture = this.textures.createCanvas(key, width, height);
      const ctx = texture.getContext();
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#4a8cff');
      gradient.addColorStop(0.5, '#ffffff');
      gradient.addColorStop(1, '#ff4a4a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      texture.refresh();
    }
    return key;
  }

  // Aim practice shows where the ball hit the paddle and the path it took after
  createAimGuide() {
    const { width, height } = CONFIG;
    this.aimText = addText(this, width / 2, 62, '', 24);
    addText(this, width / 2, height - 40, 'Hit with different parts of your paddle · P, then Esc for menu', 16);
    this.trail = this.add.graphics();
    this.trailPoints = [];
    this.hitMarker = this.add.rectangle(0, 0, 6, 4, WHITE).setOrigin(0, 0.5);
    this.ballId = null;
  }

  syncAimGuide() {
    const { paddle: P, ball: B } = CONFIG;
    const { aim, ball, paddles } = this.state;
    if (aim.ballId !== this.ballId) {
      this.ballId = aim.ballId;
      this.trailPoints = [];
    }

    const hit = aim.lastHit;
    this.hitMarker.setVisible(hit !== null);
    if (hit === null) {
      this.aimText.setText(`Incoming: ${rules.aimPattern(this.state).name}`);
    } else {
      this.aimText.setText(describeHit(hit));
      // The marker rides along with the paddle, at the spot the ball touched
      const p = paddles[0];
      this.hitMarker.setPosition(p.x + P.width + 2, p.y + P.height / 2 + (hit * P.height) / 2);
      this.trailPoints.push({ x: ball.x + B.size / 2, y: ball.y + B.size / 2 });
    }

    this.trail.clear();
    if (this.trailPoints.length > 1) {
      this.trail.lineStyle(2, WHITE, 0.4);
      this.trail.strokePoints(this.trailPoints);
    }
  }
}

// Puts a paddle hit into words, e.g. "Top edge → steep up, 54°".
// offset runs from -1 (top edge) to 1 (bottom edge).
function describeHit(offset) {
  const size = Math.abs(offset);
  const degrees = Math.round((size * CONFIG.maxBounceAngle * 180) / Math.PI);
  if (size < 0.15) return `Middle → straight, ${degrees}°`;
  const side = offset < 0 ? 'Top' : 'Bottom';
  const dir = offset < 0 ? 'up' : 'down';
  return size > 0.7
    ? `${side} edge → steep ${dir}, ${degrees}°`
    : `${side} half → angled ${dir}, ${degrees}°`;
}
