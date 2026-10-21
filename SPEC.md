# Vibed Pong

A 2D Pong game in the browser. Start small, add features later.

Built with plain JavaScript and an HTML5 canvas. Open `index.html` to play.

## v0.2 — Sound (now)

- Beeps when the ball hits the paddle or a wall, and a low buzz when you miss
- The paddle beep gets higher as the ball speeds up
- `M` mutes and unmutes

## v0.1 — Wall Practice (done)

Like juggling a football: keep the ball going as long as you can.

- One paddle on the left, moved with `W`/`S` or `↑`/`↓`
- The other three sides are walls the ball bounces off
- Where the ball hits the paddle sets its angle, and it gets a bit faster each hit
- Each return scores a point. Miss once and the game is over.
- Best score is kept for the session
- Start screen, pause (`P`), and game over screen with restart

**Done when** it's fun to try to beat your best score.

## Later

1. Two players on one keyboard
2. CPU opponent
3. Visual polish
4. Power-ups
5. Online multiplayer

## Progress

- **2026-10-21** — v0.2 built.
- **2026-10-21** — v0.1 built.
- **2026-10-21** — Spec written. v0.1 changed to single-player against a wall. No code yet.

## Decisions

- No framework or build step to keep it simple. Revisit if multiplayer needs one.
- v0.1 is single-player against a wall: there's only one paddle to build, and it's a quick way to tune the ball physics before adding a second player.
- Sounds are generated in the browser instead of loaded from audio files, so there's nothing extra to download or license.
