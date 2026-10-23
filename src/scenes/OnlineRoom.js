import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { net } from '../net.js';
import { COLORS, css } from '../theme.js';
import { addBackground, addSelection, addText, addMutedLabel, bindMuteKey, pillButton } from '../ui.js';
import { openNameCard, playerNameCard, roomNameCard } from './NameCard.js';

const SIDES = ['Left', 'Right'];
const CARD = { width: 260, height: 130, gap: 30, y: 245 };

// One room: who's in it, ready-up, and the countdown before a match
export class OnlineRoom extends Scene {
  constructor() {
    super('OnlineRoom');
  }

  create() {
    const { width, height } = CONFIG;
    addBackground(this);
    this.title = addText(this, width / 2, 92, '', 44, { weight: '800', spacing: 2 });
    this.code = addText(this, width / 2, 136, '', 15, { color: COLORS.muted, weight: '600', spacing: 2 });
    this.seats = [0, 1].map((i) => this.addSeatCard(i));
    this.notice = addText(this, width / 2, 345, '', 17, { color: COLORS.muted, weight: '500' });
    this.countdown = addText(this, width / 2, height - 60, '', 28, { color: COLORS.accent, weight: '700' });
    this.menu = null;

    net.listen(this, 'room', (message) => this.show(message));
    net.listen(this, 'countdown', (message) => this.countdown.setText(`Starting in ${message.seconds}…`));
    net.listen(this, 'start', (message) => {
      this.scene.stop('NameCard'); // a name card left open would cover the match
      this.scene.start('Game', { mode: 'online', seat: message.seat });
    });
    net.listen(this, 'disconnected', () => this.scene.start('Lobby'));

    this.input.keyboard.on('keydown-ESC', () => this.leave());
    bindMuteKey(this);
    addMutedLabel(this);
    this.show(net.last.room);
    this.cameras.main.fadeIn(300);
  }

  // A card for one side of the table, with a strip in that side's paddle color
  addSeatCard(i) {
    const { width: w, height: h, gap, y } = CARD;
    const x = CONFIG.width / 2 + (i === 0 ? -1 : 1) * (w + gap) / 2;
    const card = this.add.graphics();
    card.fillStyle(COLORS.panel).fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    card.lineStyle(1.5, COLORS.panelBorder).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    card.fillStyle(i === 0 ? COLORS.left : COLORS.right).fillRoundedRect(x - w / 2 + 20, y - h / 2, w - 40, 4, 2);
    return {
      side: addText(this, x, y - 34, '', 14, { color: COLORS.muted, weight: '600' }),
      name: addText(this, x, y - 2, '', 22, { weight: '700' }),
      status: addText(this, x, y + 32, '', 15, { weight: '600' }),
    };
  }

  leave() {
    net.send({ type: 'leave' });
    this.scene.start('Lobby');
  }

  show({ room, seat }) {
    this.title.setText(room.name);
    this.code.setText(`ROOM ${room.id}`);
    this.seats.forEach((card, i) => {
      const player = room.players[i];
      card.side.setText(i === seat ? `${SIDES[i]}  ·  You` : SIDES[i]);
      card.name.setText(player ? player.name : 'Waiting…').setColor(css(player ? COLORS.text : COLORS.muted));
      card.status
        .setText(player ? (player.ready ? 'Ready' : 'Not ready') : '')
        .setColor(css(player?.ready ? COLORS.accent : COLORS.muted));
    });

    const me = room.players[seat];
    if (room.notice) this.notice.setText(room.notice);
    else if (room.players.length < 2) this.notice.setText(`Tell a friend to join ${room.name}`);
    else if (room.players.every((p) => p.ready)) this.notice.setText('Both ready!');
    else this.notice.setText(me.ready ? 'Waiting for the other player…' : 'Press Ready when you are');
    if (room.status === 'waiting') this.countdown.setText('');

    // Ready on its own row, then the name buttons and Leave
    const { width } = CONFIG;
    this.menu?.destroy();
    this.menu = addSelection(this, [
      pillButton(this, width / 2, 412, me.ready ? 'Not ready' : 'Ready', () => net.send({ type: 'ready', ready: !me.ready })),
      pillButton(this, width / 2 - 210, 478, 'Room name', () => openNameCard(this, roomNameCard(room.name)), 195),
      pillButton(this, width / 2, 478, 'Your name', () => openNameCard(this, playerNameCard()), 195),
      pillButton(this, width / 2 + 210, 478, 'Leave', () => this.leave(), 195),
    ], { start: this.selectedKey, onSelect: (key) => { this.selectedKey = key; } });
  }
}
