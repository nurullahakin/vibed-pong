import { Scene } from 'phaser';
import { CONFIG, CONTROLS } from '../game/config.js';
import * as rules from '../game/rules.js';
import { playEvents } from '../sound.js';
import { addText, addMutedLabel, bindMuteKey } from '../ui.js';

const WHITE = 0xffffff;

// Runs one game: reads the keys, steps the rules, then moves the shapes to match
export class Game extends Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.mode = data.mode;
  }

  create() {
    const { width, height, wall, paddle: P, ball: B } = CONFIG;
    const solo = this.mode === 'solo';
    this.state = rules.createState(this.mode);

    this.add.rectangle(0, 0, width, wall, WHITE).setOrigin(0);
    this.add.rectangle(0, height - wall, width, wall, WHITE).setOrigin(0);
    if (solo) {
      this.add.rectangle(width - wall, 0, wall, height, WHITE).setOrigin(0);
    } else {
      for (let y = wall + 10; y < height - wall; y += 30) {
        this.add.rectangle(width / 2 - 2, y, 4, 15, WHITE).setOrigin(0);
      }
    }

    const shown = solo ? this.state.paddles.slice(0, 1) : this.state.paddles;
    this.paddles = shown.map((p) => this.add.rectangle(p.x, p.y, P.width, P.height, WHITE).setOrigin(0));
    this.ball = this.add.rectangle(0, 0, B.size, B.size, WHITE).setOrigin(0);

    if (solo) {
      this.scoreTexts = [addText(this, width / 2, 62, '0', 48)];
      this.bestText = addText(this, width - 30, 39, '', 18, 1);
    } else {
      this.scoreTexts = [addText(this, width / 4, 62, '0', 48), addText(this, (width * 3) / 4, 62, '0', 48)];
      const cpu = this.mode === 'cpu';
      this.serveHints = [
        addText(this, width / 4, height - 40, cpu ? 'W/S or ↑/↓' : 'W/S', 16),
        addText(this, (width * 3) / 4, height - 40, cpu ? 'CPU' : '↑/↓', 16),
      ];
    }

    this.keys = this.input.keyboard.addKeys('W,S,UP,DOWN');
    this.input.keyboard.on('keydown-P', () => {
      this.scene.pause();
      this.scene.launch('Pause');
    });
    bindMuteKey(this);
    addMutedLabel(this);
    this.sync();
  }

  update(time, delta) {
    // Cap the step so a slow frame doesn't fling the ball across the screen
    const dt = Math.min(delta / 1000, 1 / 30);
    const held = (names) => names.some((k) => this.keys[k].isDown);
    const dirs = CONTROLS[this.mode].map(({ up, down }) => (held(down) ? 1 : 0) - (held(up) ? 1 : 0));

    playEvents(this.sound, rules.update(this.state, dirs, dt));
    this.sync();

    if (this.state.over) {
      this.scene.pause();
      this.scene.launch('GameOver', {
        mode: this.mode,
        scores: [...this.state.scores],
        best: this.registry.get('best'),
      });
    }
  }

  // Moves the shapes and updates the text to match the game state
  sync() {
    const s = this.state;
    this.paddles.forEach((rect, i) => rect.setPosition(s.paddles[i].x, s.paddles[i].y));
    this.ball.setPosition(s.ball.x, s.ball.y);
    this.scoreTexts.forEach((text, i) => text.setText(s.scores[i]));

    if (this.mode === 'solo') {
      // Best score lives in the registry so it survives between games
      const best = Math.max(this.registry.get('best') ?? 0, s.scores[0]);
      this.registry.set('best', best);
      this.bestText.setText(`BEST ${best}`);
    } else {
      this.serveHints.forEach((text) => text.setVisible(s.serveTimer > 0));
    }
  }
}
