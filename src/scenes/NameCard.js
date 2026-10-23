import { Scene } from 'phaser';
import { CONFIG } from '../game/config.js';
import {
  MAX_PLAYER_NAME, MAX_ROOM_NAME, cleanPlayerName, cleanRoomName, randomPlayerName, randomRoomName,
} from '../game/names.js';
import { net } from '../net.js';
import { addCard, addMenu } from '../ui.js';

// Opens a name card over a scene, pausing it until the card closes
export function openNameCard(scene, options) {
  scene.scene.pause();
  scene.scene.launch('NameCard', { over: scene.scene.key, ...options });
}

// The cards the lobby and the room use

export const createRoomCard = () => ({
  title: 'Create a room',
  subtitle: 'Type a name, or keep this one',
  value: randomRoomName(),
  maxLength: MAX_ROOM_NAME,
  random: randomRoomName,
  action: 'Create',
  onSubmit: (name) => net.send({ type: 'create', name: cleanRoomName(name) }),
});

export const roomNameCard = (current) => ({
  title: 'Room name',
  subtitle: 'Both players see this name',
  value: current,
  maxLength: MAX_ROOM_NAME,
  random: randomRoomName,
  action: 'Save',
  onSubmit: (name) => {
    const clean = cleanRoomName(name);
    if (clean) net.send({ type: 'rename-room', name: clean });
  },
});

export const playerNameCard = () => ({
  title: 'Your name',
  subtitle: 'Other players see this name',
  value: net.name,
  maxLength: MAX_PLAYER_NAME,
  random: randomPlayerName,
  action: 'Save',
  onSubmit: (name) => {
    const clean = cleanPlayerName(name);
    if (clean) net.setName(clean);
  },
});

// The name box is a real HTML input over the game, so typing, the cursor,
// copy and paste and every language's letters just work. Styled in style.css.
const nameBox = (maxLength) => `
  <div class="name-box">
    <input name="name" type="text" maxlength="${maxLength}" spellcheck="false" autocomplete="off" aria-label="Name">
    <button name="shuffle" type="button" title="New random name" aria-label="New random name">⟳</button>
  </div>`;

// A card over another scene (which it pauses) that asks for a name: a room's or
// your own. data: { over, title, subtitle, value, maxLength, random(), action, onSubmit(name) }
export class NameCard extends Scene {
  constructor() {
    super('NameCard');
  }

  init(data) {
    this.options = data;
  }

  create() {
    const { width } = CONFIG;
    const { title, subtitle, value, maxLength, random, action, onSubmit } = this.options;
    const top = addCard(this, 340, title, subtitle);
    const box = this.add.dom(width / 2, top + 145).createFromHTML(nameBox(maxLength));
    const input = box.getChildByName('name');
    const shuffle = box.getChildByName('shuffle');

    const submit = () => {
      onSubmit(input.value);
      this.close();
    };
    const cancel = () => this.close();
    addMenu(this, width / 2, top + 222, 62, [[action, submit], ['Cancel', cancel]]);
    this.input.keyboard.on('keydown-ESC', cancel);

    const fill = (name) => {
      input.value = name;
      input.focus();
      input.select();
    };
    shuffle.addEventListener('click', () => fill(random()));
    input.addEventListener('keydown', (event) => {
      event.stopPropagation(); // keep typing away from the game's own key handling
      if (event.key === 'Enter') submit();
      if (event.key === 'Escape') cancel();
    });
    // While typing, the game's keys must not react (W and S move the highlight,
    // M mutes), and Phaser must not block W, S and the arrows, which it captures
    // for the paddles even after a game has ended
    const keyboard = this.input.keyboard;
    input.addEventListener('focus', () => {
      keyboard.enabled = false;
      keyboard.disableGlobalCapture();
    });
    input.addEventListener('blur', () => {
      keyboard.enabled = true;
      keyboard.enableGlobalCapture();
    });
    this.events.once('shutdown', () => keyboard.enableGlobalCapture());

    // Start with the given name, selected, so typing replaces it
    this.time.delayedCall(50, () => fill(value));
  }

  close() {
    this.scene.stop();
    this.scene.resume(this.options.over);
  }
}
