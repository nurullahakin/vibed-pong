# Vibed Pong

A 2D Pong game in the browser. Start small, add features later.

Built with Phaser 4 and Vite, and published on GitHub Pages.

## v0.6 — Aim Practice (now)

- `4` on the start screen opens a practice mode for aiming
- Balls come one at a time, aimed at the middle of your paddle: straight, from above, from below, then again
- After a hit, the ball flies for a moment showing its path, then the next one comes. A label says where you hit and what it did, for example "Top edge → steep up, 54°".
- No score and no game over. A miss just brings the next ball.

## v0.5 — Phaser Port (done)

- The same game, rebuilt on Phaser 4. The menu, game, pause and game over screens are each a scene.
- The game rules live in `src/game/` with no Phaser, so a multiplayer server can reuse them
- Every push to `main` is tested, built and published to GitHub Pages
- `npm test` plays the rules without a browser

## v0.4 — CPU Opponent (done)

- `3` on the start screen plays against the computer, which controls the right paddle
- Same rules as two players. You can move with `W`/`S` or `↑`/`↓`.
- The CPU is beatable: it moves slower than you, reacts a little late, doesn't predict bounces and doesn't always aim with the middle of its paddle

## v0.3 — Game Modes (done)

- The start screen has a mode choice: `1` for Solo (wall practice), `2` for Two players
- Two players: left uses `W`/`S`, right uses `↑`/`↓`. Miss the ball and your opponent scores. First to 11 wins.
- After each point the ball waits a second, then serves toward whoever conceded
- `Esc` goes back to the menu from the pause or game over screen

## v0.2 — Sound (done)

- Beeps when the ball hits the paddle or a wall, and a low buzz when you miss
- The paddle beep gets higher as the ball speeds up
- `M` mutes and unmutes

## v0.1 — Wall Practice (done)

Like juggling a football: keep the ball going as long as you can.

- One paddle on the left, moved with `W`/`S` or `↑`/`↓`
- The other three sides are walls the ball bounces off
- Where the ball hits the paddle sets its angle: straight from the middle, up to 60° from the edge. The incoming angle and paddle movement don't matter.
- The ball gets a bit faster each hit
- Each return scores a point. Miss once and the game is over.
- Best score is kept for the session
- Start screen, pause (`P`), and game over screen with restart

**Done when** it's fun to try to beat your best score.

## Later

1. Visual polish
2. Power-ups
3. Online multiplayer

## Progress

- **2026-10-22** — v0.6 built. Also fixed the hit spot on the paddle: it was measured up to a frame late, so angled and fast balls bounced slightly off from where they hit.
- **2026-10-22** — v0.5 built.
- **2026-10-21** — v0.4 built.
- **2026-10-21** — v0.3 built.
- **2026-10-21** — v0.2 built.
- **2026-10-21** — v0.1 built.
- **2026-10-21** — Spec written. v0.1 changed to single-player against a wall. No code yet.

## Decisions

- v0.1–v0.4 used no framework, to keep things simple. v0.5 moved to Phaser 4 for structure and for its polish tools (particles, tweens, camera effects). It uses Vite, the setup Phaser's own starter tool uses.
- Ball and paddle collisions use our own code. Phaser's built-in physics only checks for overlaps once per frame, so a fast ball could pass through a thin paddle.
- v0.1 is single-player against a wall: there's only one paddle to build, and it's a quick way to tune the ball physics before adding a second player.
- Sounds are generated in the browser instead of loaded from audio files, so there's nothing extra to download or license.
- Aim practice balls all arrive at the paddle's middle line, so the only thing that changes the shot is where you put your paddle. That's the lesson.
- The CPU has one difficulty, tuned by simulation so an average player wins about 60–75% of games. Difficulty levels can come later if one level isn't enough.
