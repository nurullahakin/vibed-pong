import { Scene } from 'phaser';
import { CONFIG, CONTROLS } from '../game/config.js';
import * as rules from '../game/rules.js';
import { Effects } from '../effects.js';
import { net } from '../net.js';
import { playEvents } from '../sound.js';
import { ballTexture, paddleTexture } from '../textures.js';
import { COLORS, SIDE_COLORS, css } from '../theme.js';
import { addBackground, addText, addMutedLabel, bindMuteKey } from '../ui.js';
import { OPPOSITE, viewFor } from '../view.js';

// Runs one game: reads the keys, steps the rules, then moves the shapes to match.
// Online, the server steps the rules instead, and this scene draws what it sends.
export class Game extends Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.mode = data.mode;
    this.options = data.options ?? {}; // e.g. { side: 'top', control: 'mouse' } for solo, { sides: 'topBottom' } for two players, { firstSide: 'right' } online
    this.control = this.options.control ?? 'keys'; // keys, mouse or both
    this.online = data.mode === 'online';
    this.seat = data.seat ?? 0; // online: 0 plays left, 1 plays right
    // Phaser reuses the scene object when a game restarts, so reset per-game flags
    this.ending = false;
    // With the mouse, the paddle waits until you point somewhere. With both,
    // whichever you used last is in charge.
    this.usingMouse = false;
  }

  create() {
    const { width, height, wall } = CONFIG;
    const { mode } = this;
    // The view turns the rules' field to put the players on the chosen sides:
    // solo on any side, two players on the left and right or the top and bottom
    this.view = viewFor(mode, this.options);
    const { side, sideways } = this.view;
    // Online starts from the same layout as a two-player game until the server's first update
    this.state = rules.createState(this.online ? 'versus' : mode, { sideways });

    addBackground(this);
    // Walls are thin bars inside the space the rules give them, drawn on the
    // rules' field and turned by the view
    const fieldShape = this.add.graphics().fillStyle(COLORS.line);
    const bar = (x, y, w, h) => {
      const a = this.view.point(x, y);
      const b = this.view.point(x + w, y + h);
      fieldShape.fillRoundedRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y), 2);
    };
    const field = this.state.field;
    bar(12, wall / 2 - 2, field.width - 24, 4);
    bar(12, field.height - wall / 2 - 2, field.width - 24, 4);
    if (mode === 'solo') {
      bar(field.width - wall / 2 - 2, 12, 4, field.height - 24); // the wall you play against
    } else if (mode !== 'aim') {
      for (let y = wall + 14; y < field.height - wall - 10; y += 28) bar(field.width / 2 - 2, y, 4, 12);
    }

    // Which of the rules' two paddles are drawn: just yours in solo and aim practice
    this.paddleIndexes = mode === 'aim' || mode === 'solo' ? [0] : [0, 1];
    // Every side has its own paddle color: in solo yours is your side's, and two
    // players on the top and bottom get those two
    const sideTexture = (name) => paddleTexture(this, `paddle-${name}`, SIDE_COLORS[name], SIDE_COLORS[name]);
    const paddleSides = mode === 'solo' || mode === 'aim' ? [side]
      : mode === 'cpu' || mode === 'online' ? [side, OPPOSITE[side]] // the first paddle, then the one across
        : sideways ? ['top', 'bottom'] : ['left', 'right'];
    const textures = mode === 'aim' ? [this.aimPaddleTexture()] : paddleSides.map(sideTexture);
    // Paddles are positioned by their center, so they squash evenly on a hit.
    // On the top or bottom they're turned to lie flat.
    // (turned counter-clockwise, so the paddle's top end lands where the view puts
    // the field's top: on the left. That keeps the aim paddle's colors the right way round.)
    this.paddles = this.paddleIndexes.map((index, n) => this.add.image(0, 0, textures[n]).setAngle(this.view.sideways ? -90 : 0));
    this.ball = this.add.image(0, 0, ballTexture(this));
    // Effects look paddles up by the rules' paddle number
    const byIndex = [];
    this.paddleIndexes.forEach((index, n) => { byIndex[index] = this.paddles[n]; });
    this.effects = new Effects(this, byIndex, this.view, paddleSides.map((name) => SIDE_COLORS[name]));

    // Scores are big and faint, behind the play
    const score = (x, y = 130) => addText(this, x, y, '0', 120, { weight: '800', alpha: 0.14 }).setDepth(-5);
    const hint = (x, label, y = height - 44) => addText(this, x, y, label, 15, { color: COLORS.muted, weight: '500' });
    if (mode === 'solo') {
      this.scoreTexts = [score(width / 2)];
      // On the top, your paddle runs along the top edge, so Best moves to the bottom
      const bestY = side === 'top' ? height - 30 : 46;
      this.bestText = addText(this, width - 20, bestY, '', 15, { color: COLORS.muted, originX: 1 });
    } else if (mode === 'aim') {
      this.scoreTexts = [];
      this.createAimGuide();
    } else {
      // Each paddle's score sits in that paddle's half of the screen, and its key
      // hint at that half's outer edge, whichever way the field is turned
      const half = (i) => this.view.point((this.state.field.width * (1 + 2 * i)) / 4, this.state.field.height / 2);
      this.scoreTexts = [0, 1].map((i) => (sideways ? score(width / 2, half(i).y) : score(half(i).x)));
      const keys = sideways ? 'A/D or ←/→' : 'W/S or ↑/↓';
      const labels = {
        versus: sideways ? ['A/D', '←/→'] : ['W/S', '↑/↓'],
        cpu: [{ keys, mouse: 'Mouse', both: `${keys} or mouse` }[this.control], 'CPU'],
        online: this.seat === 0 ? [`You: ${keys}`, 'Them'] : ['Them', `You: ${keys}`],
      }[mode];
      this.serveHints = labels.map((label, i) => (sideways
        ? hint(width / 2, label, half(i).y < height / 2 ? 64 : height - 64)
        : hint(half(i).x, label)));
    }

    this.keys = this.input.keyboard.addKeys('W,S,UP,DOWN,A,D,LEFT,RIGHT');
    if (this.control !== 'keys') this.input.on('pointermove', () => { this.usingMouse = true; });
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
    const controls = !this.view.sideways ? CONTROLS[this.mode] : this.mode === 'versus' ? CONTROLS.versusSideways : CONTROLS.oneSideways;
    const dirs = controls.map(({ up, down }) => (held(down) ? 1 : 0) - (held(up) ? 1 : 0));
    // With both, pressing a key takes over from the mouse until it moves again
    if (this.control === 'both' && dirs[0] !== 0) this.usingMouse = false;
    if (this.control === 'mouse' || this.usingMouse) {
      // Your paddle heads for the pointer as if you held the key that way
      const pointer = this.input.activePointer;
      const target = this.view.toField(pointer.x, pointer.y).y;
      dirs[0] = this.usingMouse ? rules.towardPointer(this.state.paddles[0], target) : 0;
    }

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
          options: this.options,
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
    this.paddles.forEach((shape, n) => {
      const p = s.paddles[this.paddleIndexes[n]];
      const at = this.view.point(p.x + P.width / 2, p.y + P.height / 2);
      shape.setPosition(at.x, at.y);
    });
    const ball = this.view.point(s.ball.x + CONFIG.ball.size / 2, s.ball.y + CONFIG.ball.size / 2);
    this.ball.setPosition(ball.x, ball.y);
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
  // Lying flat, blue is on the left and red on the right.
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
    // Keep the texts clear of your paddle when it runs along the top or bottom edge
    const hintY = this.view.side === 'bottom' ? height - 90 : height - 44;
    this.aimText = addText(this, width / 2, this.view.side === 'top' ? 92 : 62, '', 22);
    addText(this, width / 2, hintY, 'Hit with different parts of your paddle  ·  Esc to pause', 15, {
      color: COLORS.muted,
      weight: '500',
    });
    this.trail = this.add.graphics();
    this.trailPoints = [];
    this.hitMarker = this.add.circle(0, 0, 3, COLORS.ball);
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
      // The rules' "above" and "below" are the left and right once the field lies flat
      const { name } = rules.aimPattern(this.state);
      const sidewaysName = { 'from above': 'from the left', 'from below': 'from the right' }[name];
      this.aimText.setText(`Incoming: ${this.view.sideways && sidewaysName ? sidewaysName : name}`);
    } else {
      this.aimText.setText(describeHit(hit, this.view.sideways));
      // The marker rides along with the paddle, at the spot the ball touched
      const p = paddles[0];
      const marker = this.view.point(p.x + P.width + 5, p.y + P.height / 2 + (hit * P.height) / 2);
      this.hitMarker.setPosition(marker.x, marker.y);
      this.trailPoints.push(this.view.point(ball.x + B.size / 2, ball.y + B.size / 2));
    }

    this.trail.clear();
    if (this.trailPoints.length > 1) {
      this.trail.lineStyle(2, COLORS.accent, 0.6);
      this.trail.strokePoints(this.trailPoints);
    }
  }
}

// Puts a paddle hit into words, e.g. "Top edge → steep up, 54°".
// offset runs from -1 (top edge) to 1 (bottom edge). A paddle lying flat has a
// left and right edge instead, sending the ball left and right.
function describeHit(offset, sideways = false) {
  const size = Math.abs(offset);
  const degrees = Math.round((size * CONFIG.maxBounceAngle * 180) / Math.PI);
  if (size < 0.15) return `Middle → straight, ${degrees}°`;
  const [first, second] = sideways ? [['Left', 'left'], ['Right', 'right']] : [['Top', 'up'], ['Bottom', 'down']];
  const [side, dir] = offset < 0 ? first : second;
  return size > 0.7
    ? `${side} edge → steep ${dir}, ${degrees}°`
    : `${side} half → angled ${dir}, ${degrees}°`;
}
