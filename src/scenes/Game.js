import { Scene } from 'phaser';
import { CONFIG, CONTROLS } from '../game/config.js';
import * as rules from '../game/rules.js';
import { Effects } from '../effects.js';
import { net } from '../net.js';
import { playEvents } from '../sound.js';
import { ballTexture, paddleTexture } from '../textures.js';
import { COLORS, css } from '../theme.js';
import { addBackground, addText, addMutedLabel, bindMuteKey } from '../ui.js';

// Runs one game: reads the keys, steps the rules, then moves the shapes to match.
// Online, the server steps the rules instead, and this scene draws what it sends.
export class Game extends Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.mode = data.mode;
    this.online = data.mode === 'online';
    this.seat = data.seat ?? 0; // online: 0 plays left, 1 plays right
    // Phaser reuses the scene object when a game restarts, so reset per-game flags
    this.ending = false;
  }

  create() {
    const { width, height, wall } = CONFIG;
    const { mode } = this;
    const onePaddle = mode === 'solo' || mode === 'aim';
    // Online starts from the same layout as a two-player game until the server's first update
    this.state = rules.createState(this.online ? 'versus' : mode);

    addBackground(this);
    // Walls are drawn as thin bars inside the space the rules give them
    const field = this.add.graphics().fillStyle(COLORS.line);
    field.fillRoundedRect(12, wall / 2 - 2, width - 24, 4, 2);
    field.fillRoundedRect(12, height - wall / 2 - 2, width - 24, 4, 2);
    if (mode === 'solo') {
      field.fillRoundedRect(width - wall / 2 - 2, 12, 4, height - 24, 2);
    } else if (mode !== 'aim') {
      for (let y = wall + 14; y < height - wall - 10; y += 28) field.fillRoundedRect(width / 2 - 2, y, 4, 12, 2);
    }

    const shown = onePaddle ? this.state.paddles.slice(0, 1) : this.state.paddles;
    // Paddles are positioned by their center, so they squash evenly on a hit
    const textures = mode === 'aim'
      ? [this.aimPaddleTexture()]
      : [paddleTexture(this, 'paddle-left', COLORS.left, COLORS.left), paddleTexture(this, 'paddle-right', COLORS.right, COLORS.right)];
    this.paddles = shown.map((p, i) => this.add.image(0, 0, textures[i]));
    this.ball = this.add.image(0, 0, ballTexture(this));
    this.effects = new Effects(this, this.paddles);

    // Scores are big and faint, behind the play
    const score = (x) => addText(this, x, 130, '0', 120, { weight: '800', alpha: 0.14 }).setDepth(-5);
    const hint = (x, label) => addText(this, x, height - 44, label, 15, { color: COLORS.muted, weight: '500' });
    if (mode === 'solo') {
      this.scoreTexts = [score(width / 2)];
      this.bestText = addText(this, width - 20, 46, '', 15, { color: COLORS.muted, originX: 1 });
    } else if (mode === 'aim') {
      this.scoreTexts = [];
      this.createAimGuide();
    } else {
      this.scoreTexts = [score(width / 4), score((width * 3) / 4)];
      const labels = {
        versus: ['W/S', '↑/↓'],
        cpu: ['W/S or ↑/↓', 'CPU'],
        online: this.seat === 0 ? ['You: W/S or ↑/↓', 'Them'] : ['Them', 'You: W/S or ↑/↓'],
      }[mode];
      this.serveHints = labels.map((label, i) => hint((width * (1 + 2 * i)) / 4, label));
    }

    this.keys = this.input.keyboard.addKeys('W,S,UP,DOWN');
    // P and Esc both pause. Online, the match can't stop, so the pause screen
    // just sits on top while play goes on.
    const pause = () => {
      if (this.ending || this.scene.isActive('Pause')) return;
      if (!this.online) {
        this.cameras.main.resetFX(); // don't freeze mid-shake
        this.scene.pause();
      }
      this.scene.launch('Pause', { online: this.online });
    };
    this.input.keyboard.on('keydown-P', pause);
    this.input.keyboard.on('keydown-ESC', pause);
    bindMuteKey(this);
    addMutedLabel(this);
    if (this.online) this.listenToServer();
    this.sync();
    this.cameras.main.fadeIn(250);
  }

  listenToServer() {
    this.lastDir = 0;
    this.serverEvents = [];
    net.listen(this, 'state', (message) => {
      this.state = message.state;
      this.serverEvents.push(...message.events);
    });
    net.listen(this, 'over', (message) => {
      this.ending = true;
      this.time.delayedCall(500, () => {
        this.scene.stop('Pause');
        this.scene.pause();
        this.scene.launch('GameOver', { mode: 'online', seat: this.seat, scores: message.scores });
      });
    });
    // The other player left: back to the room, which says so
    net.listen(this, 'room', (message) => {
      if (message.room.players.length < 2) this.backTo('OnlineRoom');
    });
    net.listen(this, 'disconnected', () => this.backTo('Lobby'));
  }

  backTo(sceneKey) {
    this.scene.stop('Pause');
    this.scene.stop('GameOver');
    this.scene.start(sceneKey);
  }

  update(time, delta) {
    // Cap the step so a slow frame doesn't fling the ball across the screen
    const dt = Math.min(delta / 1000, 1 / 30);
    const held = (names) => names.some((k) => this.keys[k].isDown);
    const dirs = CONTROLS[this.mode].map(({ up, down }) => (held(down) ? 1 : 0) - (held(up) ? 1 : 0));

    if (this.online) {
      // Only tell the server when the direction changes
      if (dirs[0] !== this.lastDir) net.send({ type: 'input', dir: dirs[0] });
      this.lastDir = dirs[0];
      const events = this.serverEvents.splice(0);
      playEvents(this.sound, events);
      this.effects.play(events, this.state);
      this.sync();
      return;
    }

    const events = rules.update(this.state, dirs, dt);
    playEvents(this.sound, events);
    this.effects.play(events, this.state);
    this.sync();

    // Wait a moment before the game over screen, so the last miss can be seen
    if (this.state.over && !this.ending) {
      this.ending = true;
      this.time.delayedCall(500, () => {
        this.scene.pause();
        this.scene.launch('GameOver', {
          mode: this.mode,
          scores: [...this.state.scores],
          best: this.registry.get('best'),
        });
      });
    }
  }

  // Moves the shapes and updates the text to match the game state
  sync() {
    const s = this.state;
    const { paddle: P } = CONFIG;
    this.paddles.forEach((shape, i) => shape.setPosition(s.paddles[i].x + P.width / 2, s.paddles[i].y + P.height / 2));
    this.ball.setPosition(s.ball.x + CONFIG.ball.size / 2, s.ball.y + CONFIG.ball.size / 2);
    this.scoreTexts.forEach((text, i) => {
      if (text.text === String(s.scores[i])) return;
      text.setText(s.scores[i]);
      this.effects.pop(text);
    });

    if (this.mode === 'solo') {
      // Best score lives in the registry so it survives between games
      const best = Math.max(this.registry.get('best') ?? 0, s.scores[0]);
      this.registry.set('best', best);
      this.bestText.setText(`Best ${best}`);
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
    return paddleTexture(this, 'paddle-aim', (ctx, top, height) => {
      const gradient = ctx.createLinearGradient(0, top, 0, top + height);
      gradient.addColorStop(0, css(COLORS.left));
      gradient.addColorStop(0.5, '#ffffff');
      gradient.addColorStop(1, css(COLORS.right));
      return gradient;
    }, COLORS.ball);
  }

  // Aim practice shows where the ball hit the paddle and the path it took after
  createAimGuide() {
    const { width, height } = CONFIG;
    this.aimText = addText(this, width / 2, 62, '', 22);
    addText(this, width / 2, height - 44, 'Hit with different parts of your paddle  ·  Esc to pause', 15, {
      color: COLORS.muted,
      weight: '500',
    });
    this.trail = this.add.graphics();
    this.trailPoints = [];
    this.hitMarker = this.add.circle(0, 0, 3, COLORS.ball).setOrigin(0, 0.5);
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
      this.trail.lineStyle(2, COLORS.accent, 0.6);
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
