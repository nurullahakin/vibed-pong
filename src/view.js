// Where the rules' field goes on the screen. In solo the rules always put you on
// the left of their own field; a view mirrors or turns that field so you can play
// on any side of the screen. Plain math with no Phaser, so it can be tested.

import { CONFIG } from './game/config.js';

// How each side turns the field: where the field's x and y directions point on screen
const TURNS = {
  left: { x: [1, 0], y: [0, 1] }, // as it is
  right: { x: [-1, 0], y: [0, 1] }, // mirrored
  top: { x: [0, 1], y: [1, 0] }, // the ball travels down the screen, paddles move across
  bottom: { x: [0, -1], y: [1, 0] }, // the ball travels up the screen
};

export const SIDES = Object.keys(TURNS);

export function makeView(side = 'left') {
  const turn = TURNS[side] ?? TURNS.left;
  const [xx, yx] = turn.x; // screen x and y for one step along the field's x
  const [xy, yy] = turn.y; // screen x and y for one step along the field's y
  const { width, height } = CONFIG;
  // Mirrored directions count from the far edge of the screen
  const offsetX = xx < 0 ? width : 0;
  const offsetY = yx < 0 ? height : 0;
  const flipped = xx * yy - xy * yx < 0; // mirror image, so angles turn the other way
  const baseAngle = (Math.atan2(yx, xx) * 180) / Math.PI;

  return {
    side,
    sideways: xy !== 0, // paddles lie flat and move left and right
    // A point on the field, as a point on the screen
    point(x, y) {
      return { x: xx * x + xy * y + offsetX, y: yx * x + yy * y + offsetY };
    },
    // A direction on the field in degrees (0 points along x), as one on screen.
    // Kept as a straight line rather than wrapped to ±180, so angle ranges stay ranges.
    angle(degrees) {
      return baseAngle + (flipped ? -degrees : degrees);
    },
  };
}
