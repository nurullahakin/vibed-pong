# How to Play Vibed Pong

Play at [nurullahakin.github.io/vibed-pong](https://nurullahakin.github.io/vibed-pong/). Pick a mode on the start screen:

- **1 — Solo:** keep the ball going against a wall
- **2 — Two players:** play against a friend on the same keyboard
- **3 — Against the CPU:** play against the computer
- **4 — Aim practice:** learn how to aim with your paddle

## Controls

| Key | What it does |
|---|---|
| `W` / `S` | Move the left paddle |
| `↑` / `↓` | Move the right paddle in two-player. In solo and against the CPU, they move your paddle too. |
| `P` | Pause and resume |
| `M` | Sound on and off |
| `Space` | Play again after a game ends |
| `Esc` | Back to the menu (when paused or after a game) |

Your paddle starts slow and speeds up while you hold the key. Tap for a small nudge, hold to get across fast. It stops as soon as you let go.

## Aiming

Your paddle doesn't just bounce the ball back. **Where the ball hits your paddle decides where it goes**, like in the original arcade Pong:

```
  ▐  top edge     →  goes back steeply upward
  ▐
  ▐  middle       →  goes back straight
  ▐
  ▐  bottom edge  →  goes back steeply downward
```

The farther from the middle, the steeper the angle, and it changes smoothly. Halfway between the middle and an edge gives half the steepest angle. The paddle's very edge gives the steepest shot, 60°.

Only that spot matters:

- **The incoming angle doesn't matter.** A ball that comes in steep and hits the middle goes back straight.
- **Moving the paddle doesn't add spin.** Hitting the ball while you're moving doesn't change its direction or speed.

Steep shots bounce off the top and bottom walls and are harder to reach, especially for the CPU.

To try it out, pick **Aim practice** on the start screen. See [Aim Practice](#aim-practice) below.

## How the Ball Moves

- **It gets faster.** Every paddle hit makes the ball a little faster, up to about 2½ times its starting speed. The paddle beep gets higher as the ball speeds up.
- **Walls just bounce it.** The ball bounces off the top and bottom walls, and off the back wall in solo. Only paddle hits change the angle or the speed.
- **Each serve starts fresh.** The ball starts from the center at its starting speed, heading off at a random angle.

## Solo

Every time you hit the ball back, you get a point. Miss once and the game is over. The first serve always goes toward the back wall, so you have a moment to get ready.

Your best score is shown in the top right. It's kept until you close or reload the page.

## Two Players

The left player uses `W`/`S` and the right player uses `↑`/`↓`. If the ball gets past your paddle, your opponent scores. **First to 11 wins.**

After each point, the ball waits a second at the center, then serves toward the player who just lost the point.

## Against the CPU

Same rules as two players: you're on the left, the computer is on the right, and first to 11 wins.

The CPU is good but not perfect. Its paddle never gets as fast as yours, and it reacts a moment late. It can't predict bounces, so steep shots off your paddle's edge are your best weapon (see [Aiming](#aiming)). It also doesn't always hit with the middle of its paddle, so watch for odd angles coming back.

## Aim Practice

Balls come at you one at a time: first straight, then from above, then from below, and around again. Each one heads for the middle of your paddle's line.

Your paddle is colored to show where it sends the ball: **blue** at the top sends it up, **white** in the middle sends it straight, and **red** at the bottom sends it down. The deeper the color, the steeper the shot.

Move your paddle so the ball hits a different part of it, and see what happens. After each hit:

- a line shows the path the ball took
- a small mark on your paddle shows where the ball touched it
- the top of the screen tells you what you did, for example "Top edge → steep up, 54°"

Try hitting all three balls with the same part of the paddle. They all go back the same way, whatever direction they came from.

There's no score and no game over. If you miss, the next ball comes. Press `P`, then `Esc` to go back to the menu.
