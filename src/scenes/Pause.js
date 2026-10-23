import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { addMenu, addOverlay, bindMuteKey } from '../ui.js';

// Shown on top of the paused Game scene
export class Pause extends Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const { width, height } = CONFIG;
    const resume = () => {
      this.scene.stop();
      this.scene.resume('Game');
    };
    const toMenu = () => {
      this.scene.stop('Game');
      this.scene.start('MainMenu');
    };

    addOverlay(this, [['PAUSED', 48]]);
    addMenu(this, width / 2, height / 2 - 5, 55, [['Resume (Esc)', resume], ['Menu', toMenu]]);

    // P and Esc both resume, the same keys that paused
    this.input.keyboard.on('keydown-P', resume);
    this.input.keyboard.on('keydown-ESC', resume);
    bindMuteKey(this);
  }
}
