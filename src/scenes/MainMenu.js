import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { addMenu, addText, addMutedLabel, bindMuteKey } from '../ui.js';

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
    const top = height / 2 - 140;
    addText(this, width / 2, top, 'PONG', 48);
    addMenu(this, width / 2, top + 75, 55, MODES.map(([label, mode]) => [label, () => this.scene.start('Game', { mode })]));
    addText(this, width / 2, top + 75 + MODES.length * 55 + 10, 'Click, or ↑/↓ and Enter · In game, Esc to pause · M to mute', 16);

    bindMuteKey(this);
    addMutedLabel(this);
    this.cameras.main.fadeIn(300);
  }
}
