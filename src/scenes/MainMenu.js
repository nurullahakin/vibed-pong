import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { addText, addMutedLabel, bindMuteKey } from '../ui.js';

// Number key for each mode
const MODES = { ONE: 'solo', TWO: 'versus', THREE: 'cpu', FOUR: 'aim' };

export class MainMenu extends Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    const { width, height } = CONFIG;
    const lines = [
      ['VIBED PONG', 48],
      ['1  Solo against the wall', 22],
      ['2  Two players', 22],
      ['3  Against the CPU', 22],
      ['4  Aim practice', 22],
      ['P to pause · M to mute', 16],
    ];
    lines.forEach(([text, size], i) => addText(this, width / 2, height / 2 - 140 + i * 55, text, size));

    for (const [key, mode] of Object.entries(MODES)) {
      const start = () => this.scene.start('Game', { mode });
      this.input.keyboard.on(`keydown-${key}`, start);
      this.input.keyboard.on(`keydown-NUMPAD_${key}`, start);
    }
    bindMuteKey(this);
    addMutedLabel(this);
    this.cameras.main.fadeIn(300);
  }
}
