import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { net } from '../net.js';
import { COLORS, css } from '../theme.js';
import { addText } from '../ui.js';

const REFRESH = 500; // milliseconds between updates, so the numbers are readable
const LOW_FPS = 50;
const HIGH_PING = 150; // milliseconds

// Frames per second, and the ping to the server while online, in the top-right
// corner of every screen. Runs from the start, on top of all other scenes.
export class Stats extends Scene {
  constructor() {
    super({ key: 'Stats', active: true });
  }

  create() {
    const { width } = CONFIG;
    const style = { color: COLORS.muted, weight: '600', originX: 1 };
    this.ping = addText(this, width - 20, 20, '', 12, style);
    this.fps = addText(this, width - 20, 20, '', 12, style);
    this.time.addEvent({ delay: REFRESH, loop: true, callback: () => this.refresh() });
    this.refresh();
  }

  // Ping sits to the left of FPS when connected: "42 ms · 60 FPS"
  refresh() {
    const fps = Math.round(this.game.loop.actualFps);
    this.fps.setText(`${fps} FPS`).setColor(css(fps < LOW_FPS ? COLORS.warn : COLORS.muted));

    const { ping } = net;
    this.ping.setVisible(ping !== null);
    if (ping !== null) {
      this.ping
        .setText(`${ping} ms  ·  `)
        .setColor(css(ping > HIGH_PING ? COLORS.warn : COLORS.muted))
        .setX(this.fps.x - this.fps.width);
    }
  }
}
