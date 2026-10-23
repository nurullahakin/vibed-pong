import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { addCard, addMenu, bindMuteKey } from '../ui.js';

// Shown on top of the paused Game scene
export class Pause extends Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const { width } = CONFIG;
    const resume = () => {
      this.scene.stop();
      this.scene.resume('Game');
    };
    const toMenu = () => {
      this.scene.stop('Game');
      this.scene.start('MainMenu');
    };

    const top = addCard(this, 250, 'Paused');
    addMenu(this, width / 2, top + 125, 62, [['Resume (Esc)', resume], ['Menu', toMenu]]);

    // P and Esc both resume, the same keys that paused
    this.input.keyboard.on('keydown-P', resume);
    this.input.keyboard.on('keydown-ESC', resume);
    bindMuteKey(this);
  }
}
