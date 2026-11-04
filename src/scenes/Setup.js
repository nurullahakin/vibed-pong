import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { createState } from '../game/rules.js';
import { loadPref, savePref } from '../prefs.js';
import { COLORS, SIDE_COLORS, css } from '../theme.js';
import { addBackground, addSelection, addText, addMutedLabel, bindMuteKey, choiceButton, pillButton, SIDE_BUTTON_WIDTH, SIDE_CHOICES, sideButtonX } from '../ui.js';
import { OPPOSITE, viewFor } from '../view.js';

// The options each mode asks for before it starts. choices: [option value, label].
const SETUPS = {
  solo: {
    title: 'Solo against the wall',
    subtitle: 'Keep the ball going as long as you can',
    question: 'YOUR SIDE',
    option: 'side',
    choices: SIDE_CHOICES,
    keys: (sideways) => (sideways ? 'Move with A/D or ←/→' : 'Move with W/S or ↑/↓'),
  },
  cpu: {
    title: 'Against the CPU',
    subtitle: 'Beat the computer, first to 11',
    question: 'YOUR SIDE',
    option: 'side',
    choices: SIDE_CHOICES,
    keys: (sideways) => (sideways ? 'Move with A/D or ←/→  ·  The CPU is across from you' : 'Move with W/S or ↑/↓  ·  The CPU is across from you'),
  },
  aim: {
    title: 'Aim practice',
    subtitle: 'Learn how your paddle aims',
    question: 'YOUR SIDE',
    option: 'side',
    choices: SIDE_CHOICES,
    keys: (sideways) => (sideways ? 'Move with A/D or ←/→' : 'Move with W/S or ↑/↓'),
  },
  versus: {
    title: 'Two players',
    subtitle: 'Two people on one keyboard, first to 11',
    question: 'PLAY ON',
    option: 'sides',
    choices: [['leftRight', 'Left & Right'], ['topBottom', 'Top & Bottom']],
    keys: (sideways) => (sideways ? 'Top: A/D  ·  Bottom: ←/→' : 'Left: W/S  ·  Right: ↑/↓'),
  },
};

const PREVIEW = { scale: 0.3, y: 308 }; // a small copy of the screen: 240 × 180

// Options before a game, for modes that have them. data: { mode }
export class Setup extends Scene {
  constructor() {
    super('Setup');
  }

  init(data) {
    this.mode = data.mode;
    this.setup = SETUPS[data.mode];
  }

  create() {
    const { width } = CONFIG;
    const { title, subtitle, question, option, choices } = this.setup;
    // (solo sides used to be saved as soloSide)
    const saved = loadPref(`${this.mode}.${option}`) ?? (this.mode === 'solo' ? loadPref('soloSide') : null);
    this.choice = choices.some(([value]) => value === saved) ? saved : choices[0][0];

    addBackground(this);
    addText(this, width / 2, 66, title, 36, { weight: '800' });
    addText(this, width / 2, 106, subtitle, 17, { color: COLORS.muted, weight: '500' });
    addText(this, width / 2, 152, question, 12, { color: COLORS.muted, weight: '700', spacing: 2 });
    this.preview = this.add.graphics();
    this.previewLabels = [];
    this.keysHint = addText(this, width / 2, 424, '', 14, { color: COLORS.muted, weight: '500' });

    const start = () => {
      savePref(`${this.mode}.${option}`, this.choice);
      this.scene.start('Game', { mode: this.mode, options: { [option]: this.choice } });
    };
    const back = () => this.scene.start('MainMenu');
    // Two choices share a wide row; the four sides go in facing pairs
    const sidesRow = choices === SIDE_CHOICES;
    const buttonWidth = sidesRow ? SIDE_BUTTON_WIDTH : 632 / choices.length - 12;
    const buttonX = (i) => (sidesRow ? sideButtonX(width / 2, i) : width / 2 + (i - (choices.length - 1) / 2) * (buttonWidth + 12));
    const pickChoice = (value) => {
      this.choice = value;
      this.choiceButtons.forEach((button) => button.draw());
      this.showChoice();
    };
    this.choiceButtons = choices.map(([value, label], i) => choiceButton(
      this, buttonX(i), 194, buttonWidth, label,
      () => this.choice === value, () => pickChoice(value),
    ));
    // Start is highlighted first, so Enter plays straight away with the last choice
    addSelection(this, [
      ...this.choiceButtons,
      pillButton(this, width / 2, 478, 'Start', start),
      pillButton(this, width / 2, 538, 'Back', back),
    ], { start: 'Start' });
    this.input.keyboard.on('keydown-ESC', back);

    this.showChoice();
    bindMuteKey(this);
    addMutedLabel(this);
    this.cameras.main.fadeIn(300);
  }

  get options() {
    return { [this.setup.option]: this.choice };
  }

  showChoice() {
    this.keysHint.setText(this.setup.keys(viewFor(this.mode, this.options).sideways));
    this.drawPreview();
  }

  // A small copy of the screen, drawn through the same view as the game
  drawPreview() {
    const { wall, paddle: P } = CONFIG;
    const { scale, y } = PREVIEW;
    const w = CONFIG.width * scale;
    const h = CONFIG.height * scale;
    const left = CONFIG.width / 2 - w / 2;
    const top = y - h / 2;
    const view = viewFor(this.mode, this.options);
    const { field, paddles } = createState(this.mode, { sideways: view.sideways });
    const g = this.preview.clear();
    // A box on the field, shrunk into the preview
    const box = (x, yy, bw, bh, color, radius = 1) => {
      const a = view.point(x, yy);
      const b = view.point(x + bw, yy + bh);
      g.fillStyle(color).fillRoundedRect(
        left + Math.min(a.x, b.x) * scale, top + Math.min(a.y, b.y) * scale,
        Math.abs(b.x - a.x) * scale, Math.abs(b.y - a.y) * scale, radius,
      );
    };

    g.fillStyle(COLORS.panel, 0.9).fillRoundedRect(left, top, w, h, 12);
    g.lineStyle(1.5, COLORS.panelBorder).strokeRoundedRect(left, top, w, h, 12);
    // Walls a little inside the card's edge and brighter than in the game, so they
    // still show at this size
    const inset = 30;
    box(inset, inset, field.width - inset * 2, 8, COLORS.muted);
    box(inset, field.height - inset - 8, field.width - inset * 2, 8, COLORS.muted);
    const solo = this.mode === 'solo';
    if (solo) {
      box(field.width - inset - 8, inset, 8, field.height - inset * 2, COLORS.muted);
    } else if (this.mode !== 'aim') {
      for (let d = inset + 20; d < field.height - inset - 20; d += 60) box(field.width / 2 - 4, d, 8, 30, COLORS.line);
    }
    // Paddles in their sides' colors
    const aim = this.mode === 'aim';
    const sides = solo || aim ? [view.side]
      : this.mode === 'cpu' ? [view.side, OPPOSITE[view.side]]
        : view.sideways ? ['top', 'bottom'] : ['left', 'right'];
    if (aim) {
      // The aim paddle's colors, top to bottom: blue, white, coral
      const third = P.height / 3;
      [COLORS.left, COLORS.ball, COLORS.right].forEach((color, i) => box(paddles[0].x - 4, paddles[0].y + i * third, P.width + 8, third, color));
    } else {
      sides.forEach((name, i) => box(paddles[i].x - 4, paddles[i].y, P.width + 8, P.height, SIDE_COLORS[name], 3));
    }

    // Against the CPU, say which paddle is whose: left and right look alike otherwise
    this.previewLabels.forEach((label) => label.destroy());
    this.previewLabels = this.mode !== 'cpu' ? [] : ['You', 'CPU'].map((text, i) => {
      // A spot a little in from each paddle, toward the middle
      const at = view.point(i === 0 ? paddles[0].x + 120 : paddles[1].x - 110, field.height / 2);
      return addText(this, left + at.x * scale, top + at.y * scale, text, 12, { color: SIDE_COLORS[sides[i]], weight: '700' });
    });
    const ball = view.point(field.width * 0.55, field.height * 0.4);
    g.fillStyle(COLORS.ball).fillCircle(left + ball.x * scale, top + ball.y * scale, 4);
  }
}
