import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { loadPref, savePref } from '../prefs.js';
import { COLORS, css } from '../theme.js';
import { addBackground, addSelection, addText, addMutedLabel, bindMuteKey, pillButton } from '../ui.js';

const SIDES = [['Left', 'left'], ['Right', 'right']];
const PREVIEW = { width: 240, height: 130, y: 345 };

// Options before a solo game. For now, which side you play on.
export class SoloSetup extends Scene {
  constructor() {
    super('SoloSetup');
  }

  create() {
    const { width } = CONFIG;
    this.side = loadPref('soloSide', 'left') === 'right' ? 'right' : 'left';

    addBackground(this);
    addText(this, width / 2, 82, 'Solo against the wall', 36, { weight: '800' });
    addText(this, width / 2, 126, 'Keep the ball going as long as you can', 17, { color: COLORS.muted, weight: '500' });
    addText(this, width / 2, 182, 'YOUR SIDE', 12, { color: COLORS.muted, weight: '700', spacing: 2 });
    this.preview = this.add.graphics();

    const start = () => {
      savePref('soloSide', this.side);
      this.scene.start('Game', { mode: 'solo', options: { side: this.side } });
    };
    const back = () => this.scene.start('MainMenu');
    this.sideButtons = SIDES.map(([label, side], i) => this.sideButton(width / 2 + (i === 0 ? -110 : 110), 228, label, side));
    // Start is highlighted first, so Enter plays straight away with the last side used
    addSelection(this, [
      ...this.sideButtons,
      pillButton(this, width / 2, 455, 'Start', start),
      pillButton(this, width / 2, 517, 'Back', back),
    ], { start: 'Start' });
    this.input.keyboard.on('keydown-ESC', back);

    this.drawPreview();
    bindMuteKey(this);
    addMutedLabel(this);
    this.cameras.main.fadeIn(300);
  }

  // A choice button: filled in blue while highlighted, outlined in blue while chosen
  sideButton(x, y, label, side) {
    const w = 200;
    const h = 46;
    const bg = this.add.graphics({ x, y });
    const text = addText(this, x, y, label, 18);
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
        this.drawPreview();
      },
    };
  }

  // A small field: your paddle on the chosen side, the wall on the other
  drawPreview() {
    const { width: w, height: h, y } = PREVIEW;
    const left = CONFIG.width / 2 - w / 2;
    const top = y - h / 2;
    const right = this.side === 'right';
    const g = this.preview.clear();
    g.fillStyle(COLORS.panel, 0.9).fillRoundedRect(left, top, w, h, 12);
    g.lineStyle(1.5, COLORS.panelBorder).strokeRoundedRect(left, top, w, h, 12);
    g.fillStyle(COLORS.line);
    g.fillRect(left + 10, top + 8, w - 20, 3);
    g.fillRect(left + 10, top + h - 11, w - 20, 3);
    g.fillRect(right ? left + 8 : left + w - 11, top + 10, 3, h - 20);
    g.fillStyle(right ? COLORS.right : COLORS.left);
    g.fillRoundedRect(right ? left + w - 20 : left + 14, y - 18, 6, 36, 3);
    g.fillStyle(COLORS.ball).fillCircle(CONFIG.width / 2 + (right ? -24 : 24), y - 10, 4);
  }
}
