import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { createState } from '../game/rules.js';
import { loadPref, savePref } from '../prefs.js';
import { COLORS, SIDE_COLORS, css } from '../theme.js';
import { addBackground, addSelection, addText, addMutedLabel, bindMuteKey, pillButton } from '../ui.js';
import { SIDES, makeView } from '../view.js';

const LABELS = { left: 'Left', top: 'Top', bottom: 'Bottom', right: 'Right' };
const ORDER = ['left', 'top', 'bottom', 'right'];
const PREVIEW = { scale: 0.3, y: 308 }; // a small copy of the screen: 240 × 180

// Options before a solo game. For now, which side you play on.
export class SoloSetup extends Scene {
  constructor() {
    super('SoloSetup');
  }

  create() {
    const { width } = CONFIG;
    const saved = loadPref('soloSide', 'left');
    this.side = SIDES.includes(saved) ? saved : 'left';

    addBackground(this);
    addText(this, width / 2, 66, 'Solo against the wall', 36, { weight: '800' });
    addText(this, width / 2, 106, 'Keep the ball going as long as you can', 17, { color: COLORS.muted, weight: '500' });
    addText(this, width / 2, 152, 'YOUR SIDE', 12, { color: COLORS.muted, weight: '700', spacing: 2 });
    this.preview = this.add.graphics();
    this.keysHint = addText(this, width / 2, 424, '', 14, { color: COLORS.muted, weight: '500' });

    const start = () => {
      savePref('soloSide', this.side);
      this.scene.start('Game', { mode: 'solo', options: { side: this.side } });
    };
    const back = () => this.scene.start('MainMenu');
    this.sideButtons = ORDER.map((side, i) => this.sideButton(width / 2 + (i - 1.5) * 158, 194, side));
    // Start is highlighted first, so Enter plays straight away with the last side used
    addSelection(this, [
      ...this.sideButtons,
      pillButton(this, width / 2, 478, 'Start', start),
      pillButton(this, width / 2, 538, 'Back', back),
    ], { start: 'Start' });
    this.input.keyboard.on('keydown-ESC', back);

    this.showSide();
    bindMuteKey(this);
    addMutedLabel(this);
    this.cameras.main.fadeIn(300);
  }

  // A choice button: filled in blue while highlighted, outlined in blue while chosen
  sideButton(x, y, side) {
    const w = 146;
    const h = 46;
    const label = LABELS[side];
    const bg = this.add.graphics({ x, y });
    const text = addText(this, x, y, label, 17);
    let highlighted = false;
    const draw = (on = highlighted) => {
      highlighted = on;
      const chosen = this.side === side;
      bg.clear();
      bg.fillStyle(on ? COLORS.accent : chosen ? COLORS.panelHover : COLORS.panel).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      if (!on) bg.lineStyle(chosen ? 2 : 1.5, chosen ? COLORS.accent : COLORS.panelBorder).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      text.setText(chosen ? `✓  ${label}` : label);
      text.setColor(css(on ? COLORS.accentText : chosen ? COLORS.accent : COLORS.text));
    };
    return {
      key: label,
      zone: this.add.zone(x, y, w, h),
      parts: [bg, text],
      draw,
      pick: () => {
        this.side = side;
        this.sideButtons.forEach((button) => button.draw());
        this.showSide();
      },
    };
  }

  showSide() {
    const sideways = makeView(this.side).sideways;
    this.keysHint.setText(sideways ? 'Move with A/D or ←/→' : 'Move with W/S or ↑/↓');
    this.drawPreview();
  }

  // A small copy of the screen, drawn through the same view as the game: your
  // paddle on the chosen side, the wall on the other
  drawPreview() {
    const { wall, paddle: P } = CONFIG;
    const { scale, y } = PREVIEW;
    const w = CONFIG.width * scale;
    const h = CONFIG.height * scale;
    const left = CONFIG.width / 2 - w / 2;
    const top = y - h / 2;
    const view = makeView(this.side);
    const { field, paddles } = createState('solo', { side: this.side });
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
    box(field.width - inset - 8, inset, 8, field.height - inset * 2, COLORS.muted);
    const color = SIDE_COLORS[this.side];
    box(paddles[0].x - 4, paddles[0].y, P.width + 8, P.height, color, 3);
    const ball = view.point(field.width * 0.55, field.height * 0.4);
    g.fillStyle(COLORS.ball).fillCircle(left + ball.x * scale, top + ball.y * scale, 4);
  }
}
