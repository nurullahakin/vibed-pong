import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import { net } from '../net.js';
import { COLORS, css } from '../theme.js';
import { addBackground, addSelection, addText, addMutedLabel, bindMuteKey, pillButton } from '../ui.js';
import { createRoomCard, openNameCard, playerNameCard } from './NameCard.js';

// The room table: where it sits, its columns, and how many rows fit
const TABLE = { left: 80, width: 640, top: 140, rowsTop: 222, rowStep: 54, maxRows: 5 };
const COLUMNS = { room: TABLE.left + 32, players: TABLE.left + 320, status: TABLE.left + TABLE.width - 80 };
const TABLE_HEIGHT = TABLE.rowsTop - TABLE.top + TABLE.maxRows * TABLE.rowStep;

// Open rooms first, then full ones, then matches in progress
const ORDER = { Open: 0, Full: 1, Playing: 2 };
const statusOf = (room) => (room.status !== 'waiting' ? 'Playing' : room.players.length < 2 ? 'Open' : 'Full');

// Online: a table of rooms to join, or make a new one
export class Lobby extends Scene {
  constructor() {
    super('Lobby');
  }

  create() {
    const { width } = CONFIG;
    addBackground(this);
    addText(this, width / 2, 62, 'ONLINE', 44, { weight: '800', spacing: 8 });
    this.status = addText(this, width / 2, 106, 'Connecting…', 16, { color: COLORS.muted, weight: '500' });
    this.addTableFrame();
    this.menu = null;
    this.rowParts = [];
    this.selectedKey = null;
    this.showRooms(null);

    net.listen(this, 'rooms', (message) => this.showRooms(message.rooms, message.online));
    net.listen(this, 'room', () => this.scene.start('OnlineRoom'));
    net.listen(this, 'error', (message) => this.status.setText(message.message));
    net.listen(this, 'disconnected', () => {
      this.status.setText('Lost the connection to the server');
      this.showRooms(null);
    });
    net.connect()
      .then(() => net.send({ type: 'list' }))
      .catch((error) => this.status.setText(error.message));

    this.input.keyboard.on('keydown-ESC', () => this.back());
    bindMuteKey(this);
    addMutedLabel(this);
    this.cameras.main.fadeIn(300);
  }

  back() {
    net.close();
    this.scene.start('MainMenu');
  }

  // The card behind the table, and its column headings
  addTableFrame() {
    const { left, width, top } = TABLE;
    const frame = this.add.graphics();
    frame.fillStyle(COLORS.panel, 0.9).fillRoundedRect(left, top, width, TABLE_HEIGHT, 18);
    frame.lineStyle(1.5, COLORS.panelBorder).strokeRoundedRect(left, top, width, TABLE_HEIGHT, 18);
    frame.fillStyle(COLORS.panelBorder).fillRect(left + 20, top + 52, width - 40, 1);
    const heading = (x, label, originX = 0) =>
      addText(this, x, top + 28, label, 12, { color: COLORS.muted, weight: '700', spacing: 2, originX });
    heading(COLUMNS.room, 'ROOM');
    heading(COLUMNS.players, 'PLAYERS');
    heading(COLUMNS.status, 'STATUS', 0.5);
  }

  // rooms is null while not connected: the table stays empty and only Back is offered
  showRooms(rooms, online = 0) {
    this.menu?.destroy();
    this.rowParts.forEach((part) => part.destroy());
    this.rowParts = [];
    const entries = [];

    if (rooms) {
      this.status.setText(`You're ${net.name}  ·  ${online} ${online === 1 ? 'player' : 'players'} online`);
      const sorted = [...rooms].sort((a, b) => ORDER[statusOf(a)] - ORDER[statusOf(b)]);
      sorted.slice(0, TABLE.maxRows).forEach((room, i) => {
        const row = this.addRow(room, TABLE.rowsTop + i * TABLE.rowStep);
        if (row.zone) entries.push(row);
        else this.rowParts.push(...row.parts);
      });
      if (rooms.length === 0) this.addEmptyMessage();
      if (rooms.length > TABLE.maxRows) {
        const more = rooms.length - TABLE.maxRows;
        this.rowParts.push(addText(this, TABLE.left + TABLE.width - 24, TABLE.top + TABLE_HEIGHT - 16,
          `+${more} more`, 12, { color: COLORS.muted, originX: 1 }));
      }
    }

    const buttonsY = TABLE.top + TABLE_HEIGHT + 50;
    const { width } = CONFIG;
    if (rooms) {
      entries.push(pillButton(this, width / 2 - 210, buttonsY, 'Create room', () => openNameCard(this, createRoomCard()), 195));
      entries.push(pillButton(this, width / 2, buttonsY, 'Your name', () => openNameCard(this, playerNameCard()), 195));
    }
    entries.push(pillButton(this, rooms ? width / 2 + 210 : width / 2, buttonsY, 'Back', () => this.back(), 195));
    // Remember the highlight across refreshes, but not from before the list arrived,
    // when Back is the only button
    const onSelect = rooms ? (key) => { this.selectedKey = key; } : undefined;
    this.menu = addSelection(this, entries, { start: this.selectedKey, onSelect });
  }

  // One room in the table. Open rooms can be picked to join; the rest are shown dimmed.
  addRow(room, y) {
    const { left, width } = TABLE;
    const status = statusOf(room);
    const open = status === 'Open';
    const bg = this.add.graphics();
    const name = addText(this, COLUMNS.room, y, room.name, 17, { originX: 0, weight: '700' });
    const code = addText(this, COLUMNS.room + name.width + 10, y + 1, room.id, 13, { originX: 0, color: COLORS.muted });
    const players = addText(this, COLUMNS.players, y, room.players.join('  vs  '), 15, { originX: 0, weight: '500' });

    const pill = this.add.graphics();
    pill.fillStyle(open ? COLORS.accent : COLORS.panelBorder).fillRoundedRect(COLUMNS.status - 42, y - 13, 84, 26, 13);
    const pillText = addText(this, COLUMNS.status, y, status, 13, {
      weight: '700',
      color: open ? COLORS.accentText : COLORS.muted,
    });

    const parts = [bg, name, code, players, pill, pillText];
    if (!open) {
      parts.forEach((part) => part.setAlpha(0.55));
      return { parts };
    }
    return {
      key: room.id,
      zone: this.add.zone(left + width / 2, y, width - 24, 46),
      parts,
      pick: () => net.send({ type: 'join', room: room.id }),
      draw(on) {
        bg.clear();
        if (!on) return;
        bg.fillStyle(COLORS.panelHover).fillRoundedRect(left + 12, y - 23, width - 24, 46, 12);
        bg.lineStyle(1.5, COLORS.accent).strokeRoundedRect(left + 12, y - 23, width - 24, 46, 12);
        name.setColor(css(COLORS.text));
      },
    };
  }

  addEmptyMessage() {
    const { width } = CONFIG;
    const y = TABLE.rowsTop + 60;
    this.rowParts.push(
      addText(this, width / 2, y, 'No rooms yet', 20, { weight: '700' }),
      addText(this, width / 2, y + 32, 'Create one and tell a friend its name', 15, { color: COLORS.muted, weight: '500' }),
    );
  }
}
