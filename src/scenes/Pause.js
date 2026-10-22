import { Scene } from 'phaser';
import { addOverlay, bindMuteKey } from '../ui.js';

// Shown on top of the paused Game scene
export class Pause extends Scene {
  constructor() {
    super('Pause');
  }

  create() {
    addOverlay(this, [['PAUSED', 48], ['Press P to resume', 22], ['Esc for menu', 16]]);

    this.input.keyboard.on('keydown-P', () => {
      this.scene.stop();
      this.scene.resume('Game');
    });
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.stop('Game');
      this.scene.start('MainMenu');
    });
    bindMuteKey(this);
  }
}
