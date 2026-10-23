// Small helpers shared by the scenes

import { CONFIG } from './game/config.js';

export function addText(scene, x, y, text, size, originX = 0.5) {
  return scene.add
    .text(x, y, text, { fontFamily: 'monospace', fontStyle: 'bold', fontSize: `${size}px`, color: '#ffffff' })
    .setOrigin(originX, 0.5);
}

// Clickable text. It brightens and grows under the mouse.
export function addButton(scene, x, y, label, size, onClick) {
  const button = addText(scene, x, y, label, size).setPadding(24, 10).setColor('#aaaaaa');
  button.setInteractive({ useHandCursor: true });
  button.on('pointerover', () => button.setColor('#ffffff').setScale(1.1));
  button.on('pointerout', () => button.setColor('#aaaaaa').setScale(1));
  button.on('pointerup', onClick);
  return button;
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
