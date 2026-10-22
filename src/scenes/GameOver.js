import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { addText, addOverlay, bindMuteKey } from '../ui.js';

// Shown on top of the finished Game scene
export class GameOver extends Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.result = data;
  }

  create() {
    const { width, height } = CONFIG;
    const { mode, scores: [left, right], best } = this.result;
    const names = mode === 'cpu' ? ['YOU WIN', 'CPU WINS'] : ['LEFT WINS', 'RIGHT WINS'];

    addOverlay(this, mode === 'solo'
      ? [['GAME OVER', 48], [`Score ${left} · Best ${best}`, 22]]
      : [[left > right ? names[0] : names[1], 48], [`${left} – ${right}`, 22]]);
    addText(this, width / 2, height / 2 + 30, 'Space to play again · Esc for menu', 16);

    // Starting Game again restarts it from scratch
    this.input.keyboard.on('keydown-SPACE', () => this.scene.start('Game', { mode }));
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.stop('Game');
      this.scene.start('MainMenu');
    });
    bindMuteKey(this);
  }
}
