import Phaser from 'phaser';
import { CONFIG } from './game/config.js';
import { COLORS, css, shareWithCss } from './theme.js';
import { MainMenu } from './scenes/MainMenu.js';
import { Game } from './scenes/Game.js';
import { Pause } from './scenes/Pause.js';
import { GameOver } from './scenes/GameOver.js';
import { Stats } from './scenes/Stats.js';
import { Lobby } from './scenes/Lobby.js';
import { NameCard } from './scenes/NameCard.js';
import { OnlineRoom } from './scenes/OnlineRoom.js';

shareWithCss();

new Phaser.Game({
  type: Phaser.AUTO,
  width: CONFIG.width,
  height: CONFIG.height,
  parent: 'game-container',
  backgroundColor: css(COLORS.bgBottom),
  // Scale to fit the window while keeping the 4:3 game shape
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // Lets scenes place HTML elements over the game, like the room name box
  dom: { createContainer: true },
  // The first scene starts automatically. Later ones draw on top of earlier ones.
  scene: [MainMenu, Lobby, OnlineRoom, NameCard, Game, Pause, GameOver, Stats],
});
