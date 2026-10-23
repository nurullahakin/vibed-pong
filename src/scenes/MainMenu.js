import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { COLORS } from '../theme.js';
import { addBackground, addMenu, addText, addMutedLabel, bindMuteKey } from '../ui.js';

const MODES = [
  ['Solo against the wall', 'solo'],
  ['Two players', 'versus'],
  ['Against the CPU', 'cpu'],
  ['Aim practice', 'aim'],
];

export class MainMenu extends Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    const { width, height } = CONFIG;
    addBackground(this);
    addText(this, width / 2, 118, 'PONG', 72, { weight: '800', spacing: 14 });
    addText(this, width / 2, 172, 'Pick a mode', 18, { color: COLORS.muted, weight: '500' });
    const items = MODES.map(([label, mode]) => [label, () => this.scene.start('Game', { mode })]);
    items.splice(3, 0, ['Online', () => this.scene.start('Lobby')]); // after Against the CPU
    addMenu(this, width / 2, 232, 60, items);
    addText(this, width / 2, height - 48, 'Click, or ↑/↓ and Enter  ·  In game, Esc to pause  ·  M to mute', 14, {
      color: COLORS.muted,
      weight: '500',
    });

    bindMuteKey(this);
    addMutedLabel(this);
    this.cameras.main.fadeIn(300);
  }
}
