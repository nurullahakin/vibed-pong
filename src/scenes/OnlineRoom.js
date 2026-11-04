import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { net } from '../net.js';
import { COLORS, SIDE_COLORS, css } from '../theme.js';
import { addBackground, addSelection, addText, addMutedLabel, bindMuteKey, choiceButton, disabledChoice, pillButton, SIDE_BUTTON_WIDTH, SIDE_CHOICES, sideButtonX } from '../ui.js';
import { OPPOSITE } from '../view.js';
import { openNameCard, playerNameCard, roomNameCard } from './NameCard.js';

const SIDE_NAMES = Object.fromEntries(SIDE_CHOICES);
const CARD = { width: 260, height: 130, gap: 30, y: 290 };

// One room: who's in it, where it plays, ready-up, and the countdown before a match
export class OnlineRoom extends Scene {
  constructor() {
    super('OnlineRoom');
  }

  create() {
    const { width, height } = CONFIG;
    addBackground(this);
    this.title = addText(this, width / 2, 80, '', 44, { weight: '800', spacing: 2 });
    this.code = addText(this, width / 2, 118, '', 15, { color: COLORS.muted, weight: '600', spacing: 2 });
    addText(this, width / 2, 148, 'YOUR SIDE', 12, { color: COLORS.muted, weight: '700', spacing: 2 });
    this.seats = [0, 1].map((i) => this.addSeatCard(i));
    this.notice = addText(this, width / 2, 386, '', 17, { color: COLORS.muted, weight: '500' });
    this.countdown = addText(this, width / 2, height - 40, '', 26, { color: COLORS.accent, weight: '700' });
    this.menu = null;
    this.takenParts = []; // the dimmed button for the other player's side

    net.listen(this, 'room', (message) => this.show(message));
    net.listen(this, 'countdown', (message) => this.countdown.setText(`Starting in ${message.seconds}…`));
    net.listen(this, 'start', (message) => {
      this.scene.stop('NameCard'); // a name card left open would cover the match
      this.scene.start('Game', { mode: 'online', seat: message.seat, options: { firstSide: message.firstSide } });
    });
    net.listen(this, 'disconnected', () => this.scene.start('Lobby'));

    this.input.keyboard.on('keydown-ESC', () => this.leave());
    bindMuteKey(this);
    addMutedLabel(this);
    this.show(net.last.room);
    this.cameras.main.fadeIn(300);
  }

  // A card for one seat, with a strip in that seat's paddle color
  addSeatCard(i) {
    const { width: w, height: h, gap, y } = CARD;
    const x = CONFIG.width / 2 + (i === 0 ? -1 : 1) * (w + gap) / 2;
    const card = this.add.graphics();
    card.fillStyle(COLORS.panel).fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    card.lineStyle(1.5, COLORS.panelBorder).strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    return {
      strip: this.add.graphics(),
      // The strip's color changes with the layout, so it's drawn by show()
      drawStrip(color) {
        this.strip.clear().fillStyle(color).fillRoundedRect(x - w / 2 + 20, y - h / 2, w - 40, 4, 2);
      },
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
    // The first seat's side, and the second seat across from it
    const first = room.firstSide ?? 'left';
    const sides = [first, OPPOSITE[first]];
    const mySide = sides[seat];
    // The other player's side can't be picked, so it's shown dimmed instead of as a button
    const theirSide = room.players[1 - seat] ? sides[1 - seat] : null;
    this.title.setText(room.name);
    this.code.setText(`ROOM ${room.id}`);
    this.seats.forEach((card, i) => {
      const player = room.players[i];
      card.drawStrip(SIDE_COLORS[sides[i]]);
      card.side.setText(i === seat ? `${SIDE_NAMES[sides[i]]}  ·  You` : SIDE_NAMES[sides[i]]);
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

    // Your side (picking one moves the other player across), then Ready, then the name buttons and Leave
    const { width } = CONFIG;
    // Keep the highlight where it was. The ready button swaps between Ready and
    // Not ready, for example when a side change un-readies you, so follow it.
    const readyLabel = me.ready ? 'Not ready' : 'Ready';
    const startKey = !this.selectedKey || ['Ready', 'Not ready'].includes(this.selectedKey) ? readyLabel : this.selectedKey;
    this.menu?.destroy();
    this.takenParts.forEach((part) => part.destroy());
    this.takenParts = [];
    const sideButtons = [];
    SIDE_CHOICES.forEach(([value, label], i) => {
      const x = sideButtonX(width / 2, i);
      if (value === theirSide) {
        this.takenParts.push(...disabledChoice(this, x, 184, SIDE_BUTTON_WIDTH, label));
      } else {
        sideButtons.push(choiceButton(this, x, 184, SIDE_BUTTON_WIDTH, label, () => mySide === value, () => net.send({ type: 'set-side', side: value })));
      }
    });
    this.menu = addSelection(this, [
      ...sideButtons,
      pillButton(this, width / 2, 440, me.ready ? 'Not ready' : 'Ready', () => net.send({ type: 'ready', ready: !me.ready })),
      pillButton(this, width / 2 - 210, 502, 'Room name', () => openNameCard(this, roomNameCard(room.name)), 195),
      pillButton(this, width / 2, 502, 'Your name', () => openNameCard(this, playerNameCard()), 195),
      pillButton(this, width / 2 + 210, 502, 'Leave', () => this.leave(), 195),
    ], { start: startKey, onSelect: (key) => { this.selectedKey = key; } });
  }
}
