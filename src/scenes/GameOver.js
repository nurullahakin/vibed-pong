import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { net } from '../net.js';
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
    const { mode, seat, scores: [left, right], best } = this.result;

    if (mode === 'online') {
      const won = this.result.scores[seat] > this.result.scores[1 - seat];
      // The room is waiting again, with both players not ready
      const backToRoom = () => {
        this.scene.stop('Game');
        this.scene.start('OnlineRoom');
      };
      const leave = () => {
        net.send({ type: 'leave' });
        this.scene.stop('Game');
        this.scene.start('Lobby');
      };
      const top = addCard(this, 290, won ? 'You win' : 'You lose', `${left} – ${right}`);
      addMenu(this, width / 2, top + 165, 62, [['Back to the room', backToRoom], ['Leave', leave]]);
      this.input.keyboard.on('keydown-ESC', leave);
      bindMuteKey(this);
      return;
    }

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
    addMenu(this, width / 2, top + 165, 62, [['Play again', playAgain], ['Menu', toMenu]]);

    this.input.keyboard.on('keydown-ESC', toMenu);
    bindMuteKey(this);
  }
}
