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

// Mouse and keyboard choice between any kind of entries, like buttons or table rows.
// Each entry is { key, zone, draw(highlighted), pick(), parts }: zone is where the
// mouse can point, and parts are the shapes to remove on destroy().
// ↑/↓ (or W/S, ←/→) and hovering move the highlight. Enter, Space or a click picks.
// options.start: the key of the entry to highlight first. options.onSelect(key):
// called when the highlight moves, so a list that refreshes can keep its place.
export function addSelection(scene, entries, options = {}) {
  let selected = Math.max(0, entries.findIndex((entry) => entry.key === options.start));
  const select = (i) => {
    selected = (i + entries.length) % entries.length;
    entries.forEach((entry, n) => entry.draw(n === selected));
    options.onSelect?.(entries[selected].key);
  };
  entries.forEach((entry, i) => {
    entry.zone.setInteractive({ useHandCursor: true });
    entry.zone.on('pointerover', () => select(i));
    entry.zone.on('pointerup', () => entry.pick());
  });
  if (entries.length) select(selected);

  // Ignore repeats from a held key. The game ends while you're often still
  // holding a paddle key, which would otherwise slide the highlight around.
  const listeners = [];
  const onPress = (key, action) => {
    const listener = (event) => {
      if (!event.repeat && entries.length) action();
    };
    scene.input.keyboard.on(`keydown-${key}`, listener);
    listeners.push([`keydown-${key}`, listener]);
  };
  for (const key of ['UP', 'W', 'LEFT']) onPress(key, () => select(selected - 1));
  for (const key of ['DOWN', 'S', 'RIGHT']) onPress(key, () => select(selected + 1));
  for (const key of ['ENTER', 'SPACE']) onPress(key, () => entries[selected].pick());

  // For menus that change, like the room list: remove this one before adding the next
  return {
    destroy() {
      entries.forEach((entry) => [entry.zone, ...entry.parts].forEach((part) => part.destroy()));
      listeners.forEach(([event, listener]) => scene.input.keyboard.off(event, listener));
    },
  };
}

// A pill button, for addSelection. It fills with the accent color when highlighted.
export function pillButton(scene, x, y, label, onPick, width = BUTTON.width) {
  const { height: h } = BUTTON;
  const bg = scene.add.graphics({ x, y });
  const text = addText(scene, x, y, label, 19);
  return {
    key: label,
    zone: scene.add.zone(x, y, width, h),
    parts: [bg, text],
    pick: onPick,
    draw(on) {
      bg.clear();
      bg.fillStyle(on ? COLORS.accent : COLORS.panel).fillRoundedRect(-width / 2, -h / 2, width, h, h / 2);
      if (!on) bg.lineStyle(1.5, COLORS.panelBorder).strokeRoundedRect(-width / 2, -h / 2, width, h, h / 2);
      text.setColor(css(on ? COLORS.accentText : COLORS.text));
      bg.setScale(on ? 1.04 : 1);
      text.setScale(on ? 1.04 : 1);
    },
  };
}

// A choice button, for addSelection: filled in blue while highlighted, outlined
// in blue with a ✓ while chosen. isChosen() is asked each time it's drawn.
export function choiceButton(scene, x, y, w, label, isChosen, onPick) {
  const h = 46;
  const bg = scene.add.graphics({ x, y });
  const text = addText(scene, x, y, label, 17);
  let highlighted = false;
  const draw = (on = highlighted) => {
    highlighted = on;
    const chosen = isChosen();
    bg.clear();
    bg.fillStyle(on ? COLORS.accent : chosen ? COLORS.panelHover : COLORS.panel).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    if (!on) bg.lineStyle(chosen ? 2 : 1.5, chosen ? COLORS.accent : COLORS.panelBorder).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    text.setText(chosen ? `✓  ${label}` : label);
    text.setColor(css(on ? COLORS.accentText : chosen ? COLORS.accent : COLORS.text));
  };
  return { key: label, zone: scene.add.zone(x, y, w, h), parts: [bg, text], draw, pick: onPick };
}

// The four sides you can pick, in pairs that face each other: (Left Right)  (Top Bottom)
export const SIDE_CHOICES = [['left', 'Left'], ['right', 'Right'], ['top', 'Top'], ['bottom', 'Bottom']];
export const SIDE_BUTTON_WIDTH = 140;

// Where side button i goes: each pair on its own side of the middle, with a
// wider gap between the pairs than inside them
export function sideButtonX(centerX, i) {
  const step = SIDE_BUTTON_WIDTH + 8;
  const inner = 24 + SIDE_BUTTON_WIDTH / 2;
  return centerX + [-inner - step, -inner, inner, inner + step][i];
}

// A choice that can't be picked right now: a faded pill with a dashed outline,
// the same size as choiceButton. Not clickable. Returns its parts to destroy.
export function disabledChoice(scene, x, y, w, label) {
  const h = 46;
  const r = h / 2;
  const bg = scene.add.graphics({ x, y }).setAlpha(0.45);
  const text = addText(scene, x, y, label, 17, { color: COLORS.muted });
  text.setAlpha(0.6);
  // The outline as a loop of points: top edge, right end, bottom edge, left end
  const straight = w - h;
  const arc = Math.PI * r;
  const perimeter = 2 * straight + 2 * arc;
  const at = (d) => {
    if (d < straight) return [-straight / 2 + d, -r];
    d -= straight;
    if (d < arc) { const a = -Math.PI / 2 + d / r; return [straight / 2 + r * Math.cos(a), r * Math.sin(a)]; }
    d -= arc;
    if (d < straight) return [straight / 2 - d, r];
    d -= straight;
    const a = Math.PI / 2 + d / r;
    return [-straight / 2 + r * Math.cos(a), r * Math.sin(a)];
  };
  bg.lineStyle(1.5, COLORS.panelBorder);
  const dash = 7;
  const gap = 5;
  for (let d = 0; d < perimeter; d += dash + gap) {
    bg.beginPath();
    for (let s = d; s <= Math.min(d + dash, perimeter); s += 1) {
      const [px, py] = at(s);
      if (s === d) bg.moveTo(px, py); else bg.lineTo(px, py);
    }
    bg.strokePath();
  }
  return [bg, text];
}

// A column of pill buttons. items: [[label, onClick], ...].
export function addMenu(scene, x, y, spacing, items) {
  return addSelection(scene, items.map(([label, onClick], i) => pillButton(scene, x, y + i * spacing, label, onClick)));
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
