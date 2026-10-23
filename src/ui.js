// Small helpers shared by the scenes

import { CONFIG } from './game/config.js';

export function addText(scene, x, y, text, size, originX = 0.5) {
  return scene.add
    .text(x, y, text, { fontFamily: 'monospace', fontStyle: 'bold', fontSize: `${size}px`, color: '#ffffff' })
    .setOrigin(originX, 0.5);
}

// A column of buttons for the mouse or the keyboard. items: [[label, onClick], ...].
// ↑/↓ (or W/S) and hovering move the highlight. Enter, Space or a click picks.
export function addMenu(scene, x, y, spacing, items, size = 22) {
  let selected = 0;
  const select = (i) => {
    selected = (i + buttons.length) % buttons.length;
    buttons.forEach((b, n) => b.setColor(n === selected ? '#ffffff' : '#aaaaaa').setScale(n === selected ? 1.1 : 1));
  };
  const buttons = items.map(([label, onClick], i) => {
    const button = addText(scene, x, y + i * spacing, label, size).setPadding(24, 10);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => select(i));
    button.on('pointerup', onClick);
    return button;
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

// Dims whatever is underneath and shows lines of [text, size] in the middle
export function addOverlay(scene, lines) {
  const { width, height } = CONFIG;
  scene.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);
  lines.forEach(([text, size], i) => addText(scene, width / 2, height / 2 - 75 + i * 50, text, size));
}

// M mutes in every scene. Phaser's sound manager is shared by the whole game.
export function bindMuteKey(scene) {
  scene.input.keyboard.on('keydown-M', () => {
    scene.sound.mute = !scene.sound.mute;
  });
}

// "MUTED" in the top-left corner while sound is off
export function addMutedLabel(scene) {
  const label = addText(scene, 30, 39, 'MUTED', 18, 0).setVisible(scene.sound.mute);
  const onMute = (manager, muted) => label.setVisible(muted);
  scene.sound.on('mute', onMute);
  scene.events.once('shutdown', () => scene.sound.off('mute', onMute));
}
