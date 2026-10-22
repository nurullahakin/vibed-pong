# How to Play Vibed Pong

Play at [nurullahakin.github.io/vibed-pong](https://nurullahakin.github.io/vibed-pong/). Pick a mode on the start screen:

- **1 — Solo:** keep the ball going against a wall
- **2 — Two players:** play against a friend on the same keyboard
- **3 — Against the CPU:** play against the computer

## Controls

| Key | What it does |
|---|---|
| `W` / `S` | Move the left paddle |
| `↑` / `↓` | Move the right paddle in two-player. In solo and against the CPU, they move your paddle too. |
| `P` | Pause and resume |
| `M` | Sound on and off |
| `Space` | Play again after a game ends |
| `Esc` | Back to the menu (when paused or after a game) |

## Aiming

Your paddle doesn't just bounce the ball back. **Where the ball hits your paddle decides where it goes**, like in the original arcade Pong:

```
  ▐  top edge     →  goes back steeply upward
  ▐
  ▐  middle       →  goes back straight
  ▐
  ▐  bottom edge  →  goes back steeply downward
```

The farther from the middle, the steeper the angle. The paddle's very edge gives the steepest shot.

Only that spot matters:

- **The incoming angle doesn't matter.** A ball that comes in steep and hits the middle goes back straight.
- **Moving the paddle doesn't add spin.** Hitting the ball while you're moving doesn't change its direction or speed.

Steep shots bounce off the top and bottom walls and are harder to reach, especially for the CPU.

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

The CPU is good but not perfect. Its paddle is slower than yours and it reacts a moment late. It can't predict bounces, so steep shots off your paddle's edge are your best weapon (see [Aiming](#aiming)). It also doesn't always hit with the middle of its paddle, so watch for odd angles coming back.
