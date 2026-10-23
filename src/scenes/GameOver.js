import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { addButton, addOverlay, bindMuteKey } from '../ui.js';

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
    // Starting Game again restarts it from scratch
    const playAgain = () => this.scene.start('Game', { mode });
    const toMenu = () => {
      this.scene.stop('Game');
      this.scene.start('MainMenu');
    };

    addOverlay(this, mode === 'solo'
      ? [['GAME OVER', 48], [`Score ${left} · Best ${best}`, 22]]
      : [[left > right ? names[0] : names[1], 48], [`${left} – ${right}`, 22]]);
    addButton(this, width / 2, height / 2 + 40, 'Play again (Space)', 22, playAgain);
    addButton(this, width / 2, height / 2 + 95, 'Menu (Esc)', 22, toMenu);

    this.input.keyboard.on('keydown-SPACE', playAgain);
    this.input.keyboard.on('keydown-ESC', toMenu);
    bindMuteKey(this);
  }
}
