// Small helpers shared by the scenes: text, the background, buttons and cards

import { CONFIG } from './game/config.js';
import { COLORS, FONT, css } from './theme.js';
import { backgroundTexture } from './textures.js';

const BUTTON = { width: 320, height: 50 };

// options: color (0xrrggbb), weight ('400' to '800'), alpha, originX, spacing (letter spacing)
export function addText(scene, x, y, text, size, options = {}) {
  const { color = COLORS.text, weight = '600', alpha = 1, originX = 0.5, spacing = 0 } = options;
  return scene.add
    .text(x, y, text, {
      fontFamily: FONT,
      fontStyle: weight,
      fontSize: `${size}px`,
      color: css(color),
      resolution: 2, // stays sharp when the game is scaled up
    })
    .setOrigin(originX, 0.5)
    .setAlpha(alpha)
    .setLetterSpacing(spacing);
}

// The soft gradient behind every scene
export function addBackground(scene) {
  return scene.add.image(0, 0, backgroundTexture(scene)).setOrigin(0).setDepth(-10);
}

// A column of pill buttons for the mouse or the keyboard. items: [[label, onClick], ...].
// ↑/↓ (or W/S) and hovering move the highlight. Enter, Space or a click picks.
export function addMenu(scene, x, y, spacing, items) {
  let selected = 0;
  const draw = ({ bg, text }, on) => {
    const { width: w, height: h } = BUTTON;
    bg.clear();
    bg.fillStyle(on ? COLORS.accent : COLORS.panel).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    if (!on) bg.lineStyle(1.5, COLORS.panelBorder).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    text.setColor(css(on ? COLORS.accentText : COLORS.text));
    bg.setScale(on ? 1.04 : 1);
    text.setScale(on ? 1.04 : 1);
  };
  const select = (i) => {
    selected = (i + buttons.length) % buttons.length;
    buttons.forEach((button, n) => draw(button, n === selected));
  };

  const buttons = items.map(([label, onClick], i) => {
    const by = y + i * spacing;
    const bg = scene.add.graphics({ x, y: by });
    const text = addText(scene, x, by, label, 19);
    const zone = scene.add.zone(x, by, BUTTON.width, BUTTON.height).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => select(i));
    zone.on('pointerup', onClick);
    return { bg, text, zone };
  });
  select(0);

  // Ignore repeats from a held key. The game ends while you're often still
  // holding a paddle key, which would otherwise slide the highlight around.
  const onPress = (key, action) => scene.input.keyboard.on(`keydown-${key}`, (event) => {
    if (!event.repeat) action();
  });
  for (const key of ['UP', 'W']) onPress(key, () => select(selected - 1));
  for (const key of ['DOWN', 'S']) onPress(key, () => select(selected + 1));
  for (const key of ['ENTER', 'SPACE']) onPress(key, () => items[selected][1]());
}

// Dims the scene underneath and puts a card in the middle with a title and an
// optional line under it. Returns the card's top edge, for placing buttons.
export function addCard(scene, cardHeight, title, subtitle) {
  const { width, height } = CONFIG;
  const cardWidth = 420;
  const top = (height - cardHeight) / 2;
  scene.add.rectangle(0, 0, width, height, COLORS.bgBottom, 0.7).setOrigin(0);
  const card = scene.add.graphics();
  card.fillStyle(COLORS.panel, 0.97).fillRoundedRect((width - cardWidth) / 2, top, cardWidth, cardHeight, 20);
  card.lineStyle(1.5, COLORS.panelBorder).strokeRoundedRect((width - cardWidth) / 2, top, cardWidth, cardHeight, 20);
  addText(scene, width / 2, top + 50, title, 34, { weight: '700' });
  if (subtitle) addText(scene, width / 2, top + 90, subtitle, 18, { color: COLORS.muted, weight: '500' });
  return top;
}

// M mutes in every scene. Phaser's sound manager is shared by the whole game.
export function bindMuteKey(scene) {
  scene.input.keyboard.on('keydown-M', () => {
    scene.sound.mute = !scene.sound.mute;
  });
}

// "Sound off" in the top-left corner while sound is muted
export function addMutedLabel(scene) {
  const label = addText(scene, 24, 30, 'Sound off · M', 14, { color: COLORS.muted, originX: 0 })
    .setVisible(scene.sound.mute);
  const onMute = (manager, muted) => label.setVisible(muted);
  scene.sound.on('mute', onMute);
  scene.events.once('shutdown', () => scene.sound.off('mute', onMute));
}
