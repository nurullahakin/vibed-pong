# Vibed Pong

A 2D Pong game in the browser. Start small, add features later.

Built with plain JavaScript and an HTML5 canvas. Open `index.html` to play.

## v0.1 — Wall Practice (now)

Like juggling a football: keep the ball going as long as you can.

- One paddle on the left, moved with `W`/`S` or `↑`/`↓`
- The other three sides are walls the ball bounces off
- Where the ball hits the paddle sets its angle, and it gets a bit faster each hit
- Each return scores a point. Miss once and the game is over.
- Best score is kept for the session
- Start screen, pause (`P`), and game over screen with restart

**Done when** it's fun to try to beat your best score.

## Later

1. Sound
2. Two players on one keyboard
3. CPU opponent
4. Visual polish
5. Power-ups
6. Online multiplayer

## Progress

- **2026-10-21** — v0.1 built.
- **2026-10-21** — Spec written. v0.1 changed to single-player against a wall. No code yet.

## Decisions

- No framework or build step to keep it simple. Revisit if multiplayer needs one.
- v0.1 is single-player against a wall: there's only one paddle to build, and it's a quick way to tune the ball physics before adding a second player.
