import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { net } from '../net.js';
import { addCard, addMenu, bindMuteKey } from '../ui.js';

// Shown on top of the paused Game scene. Online, the match keeps going underneath.
export class Pause extends Scene {
  constructor() {
    super('Pause');
  }

  init(data) {
    this.online = data?.online ?? false;
  }

  create() {
    const { width } = CONFIG;
    const resume = () => {
      this.scene.stop();
      if (!this.online) this.scene.resume('Game');
    };
    const toMenu = () => {
      this.scene.stop('Game');
      this.scene.start('MainMenu');
    };
    const leaveMatch = () => {
      net.send({ type: 'leave' });
      this.scene.stop('Game');
      this.scene.start('Lobby');
    };

    if (this.online) {
      const top = addCard(this, 290, 'Menu', "The match keeps going while you're here");
      addMenu(this, width / 2, top + 165, 62, [['Back to the game', resume], ['Leave the match', leaveMatch]]);
    } else {
      const top = addCard(this, 250, 'Paused');
      addMenu(this, width / 2, top + 125, 62, [['Resume', resume], ['Menu', toMenu]]);
    }

    // P and Esc both resume, the same keys that paused
    this.input.keyboard.on('keydown-P', resume);
    this.input.keyboard.on('keydown-ESC', resume);
    bindMuteKey(this);
  }
}
