# Vibed Pong

A 2D Pong game in the browser. Start small, add features later.

Built with Phaser 4 and Vite, and published on GitHub Pages. Online play runs on a small Node server.

## v0.9 — Online Multiplayer (now)

- **Online** on the start screen opens the lobby: a table of rooms with friendly names (like "Swift Comet"), who's in each one and whether it's open, full or playing, plus how many players are online. Join an open room, or create your own.
- In a room, both players press **Ready**. After a 3-second countdown, the match starts: normal two-player rules, first to 11.
- Each player uses `W`/`S` or `↑`/`↓` for their own paddle. `Esc` opens a menu, but the match keeps going.
- After a match, both go back to the room to ready up again. If someone leaves, the other is told and goes back to the room.

## v0.8 — Fresh Look (done)

A slightly modern look, instead of retro black and white.

- A dark slate background with a soft fade, instead of pitch black
- The system's own clean font, with no font download
- Pill-shaped buttons, with the highlighted one filled in blue. Pause and game over are cards over the dimmed game.
- Rounded, glowing paddles (blue on the left, coral on the right) and a round, glowing ball
- Big faint scores behind the play, thin subtle walls, and sparks colored by what the ball hit

## v0.7 — Visual Polish (done)

The same game with more feel.

- A fading trail behind the ball, longer as it speeds up
- Sparks where the ball hits a paddle or wall, more when it's faster
- Paddles squash for a moment on each hit, and scores pop when they change
- A short screen shake on a miss, skipped if your system asks for reduced motion
- Menu and games fade in. The game over screen waits half a second so you see the miss.

## v0.6 — Aim Practice (done)

- `4` on the start screen opens a practice mode for aiming
- Balls come one at a time, aimed at the middle of your paddle: straight, from above, from below, then again
- After a hit, the ball flies for a moment showing its path, then the next one comes. A label says where you hit and what it did, for example "Top edge → steep up, 54°".
- No score and no game over. A miss just brings the next ball.
- The paddle has a color gradient, blue at the top through white to red at the bottom, matching how the angle changes along it

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

1. Power-ups
2. Smoother online play: move your own paddle right away instead of waiting for the server

## Progress

- **2026-10-23** — Buttons no longer say "(Esc)". Esc still works everywhere it did.
- **2026-10-23** — The room name and your own name can also be changed from inside a room.
- **2026-10-23** — Players can pick their own name in the lobby. It's remembered in the browser.
- **2026-10-23** — Rooms can be named. Create room asks for a name, starting with a random suggestion.
- **2026-10-23** — The lobby is now a table of named rooms, with their players, their status and how many players are online.
- **2026-10-23** — v0.9 built. Tested locally with two browsers; the server isn't deployed yet.
- **2026-10-23** — v0.8 built: a fresh, slightly modern look.
- **2026-10-23** — The game is now just called "Pong" on screen. "Vibed" stays only in the repo name.
- **2026-10-23** — `Esc` pauses and resumes during a game, like `P`. On the game over screen it still goes to the menu.
- **2026-10-23** — Menus use the mouse or the keyboard (`↑`/`↓` and `Enter`) instead of number keys. Pause and game over screens have buttons too.
- **2026-10-22** — v0.7 built.
- **2026-10-22** — Paddles now start slow and speed up while a key is held, for finer control. Made the CPU easier to keep the balance.
- **2026-10-22** — v0.6 built. Also fixed the hit spot on the paddle: it was measured up to a frame late, so angled and fast balls bounced slightly off from where they hit.
- **2026-10-22** — v0.5 built.
- **2026-10-21** — v0.4 built.
- **2026-10-21** — v0.3 built.
- **2026-10-21** — v0.2 built.
- **2026-10-21** — v0.1 built.
- **2026-10-21** — Spec written. v0.1 changed to single-player against a wall. No code yet.

## Decisions

- v0.1–v0.4 used no framework, to keep things simple. v0.5 moved to Phaser 4 for structure and for its polish tools (particles, tweens, camera effects). It uses Vite, the setup Phaser's own starter tool uses.
- Online play uses a plain Node server with the `ws` package. The server runs the same rules as local play and is the only one that decides what happens. Players only send which way they're pressing, and get the game state 60 times a second.
- The room name box is a real HTML input over the game, not text drawn by Phaser, so typing, the cursor, copy and paste and every language's letters work. While it has focus, the game's own keys are switched off, and so is Phaser's blocking of `W`, `S` and the arrows, which otherwise lasts after any game.
- Your player name is remembered in the browser's local storage and sent again on every connect. If storage is blocked, as in some private windows, you just start as "Player N" again.
- Either player in a room can rename it, since a room is just two friends with no host. Renaming is blocked mid-match.
- Room and player names are cleaned on the server: trimmed, invisible characters removed, and cut to 24 characters for rooms or 16 for players. An empty room name gets a random one; an empty player name is ignored.
- Online has no prediction yet, so your own paddle lags by your round trip to the server. Fine on a good connection, and simple to start with.
- All colors and the font live in `src/theme.js`, and the game draws its own images in `src/textures.js`, so the look can change in one place and there are still no asset files.
- Effects only react to events from the rules and never change the game, so they can be tuned or turned off freely. They live in `src/effects.js`.
- Ball and paddle collisions use our own code. Phaser's built-in physics only checks for overlaps once per frame, so a fast ball could pass through a thin paddle.
- v0.1 is single-player against a wall: there's only one paddle to build, and it's a quick way to tune the ball physics before adding a second player.
- Sounds are generated in the browser instead of loaded from audio files, so there's nothing extra to download or license.
- Aim practice balls all arrive at the paddle's middle line, so the only thing that changes the shot is where you put your paddle. That's the lesson.
- The CPU has one difficulty, tuned by simulation so an average player wins about 60–75% of games. Difficulty levels can come later if one level isn't enough. It was retuned when paddle acceleration made players slower to react.
- Player paddles speed up from 120 to 520 px/s in about a fifth of a second, and stop the moment the key is released, so there's no sliding past the target. The CPU's paddle keeps a steady speed.
