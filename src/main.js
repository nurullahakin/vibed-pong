import Phaser from 'phaser';
import { CONFIG } from './game/config.js';
import { MainMenu } from './scenes/MainMenu.js';
import { Game } from './scenes/Game.js';
import { Pause } from './scenes/Pause.js';
import { GameOver } from './scenes/GameOver.js';

new Phaser.Game({
  type: Phaser.AUTO,
  width: CONFIG.width,
  height: CONFIG.height,
  parent: 'game-container',
  backgroundColor: '#000000',
  // Scale to fit the window while keeping the 4:3 game shape
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // The first scene starts automatically. Later ones draw on top of earlier ones.
  scene: [MainMenu, Game, Pause, GameOver],
});
