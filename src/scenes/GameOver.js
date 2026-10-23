import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { addCard, addMenu, bindMuteKey } from '../ui.js';

// Shown on top of the finished Game scene
export class GameOver extends Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.result = data;
  }

  create() {
    const { width } = CONFIG;
    const { mode, scores: [left, right], best } = this.result;
    const names = mode === 'cpu' ? ['You win', 'The CPU wins'] : ['Left wins', 'Right wins'];
    // Starting Game again restarts it from scratch
    const playAgain = () => this.scene.start('Game', { mode });
    const toMenu = () => {
      this.scene.stop('Game');
      this.scene.start('MainMenu');
    };

    const top = mode === 'solo'
      ? addCard(this, 290, 'Game over', `Score ${left}  ·  Best ${best}`)
      : addCard(this, 290, left > right ? names[0] : names[1], `${left} – ${right}`);
    // Play again starts highlighted, so Space or Enter plays again straight away
    addMenu(this, width / 2, top + 165, 62, [['Play again', playAgain], ['Menu (Esc)', toMenu]]);

    this.input.keyboard.on('keydown-ESC', toMenu);
    bindMuteKey(this);
  }
}
