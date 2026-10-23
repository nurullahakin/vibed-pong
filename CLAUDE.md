# AI Guide

Read [SPEC.md](SPEC.md) first. It sets the scope.

## Original Prompt

> gonna vibe code a 2d pong game. will start simple and improve later (multiplayer, power-ups, etc.) write up a simple spec for now. wanna document the progress and scope

## Rules

- Build only the current version. Suggest anything beyond it; don't just build it.
- Keep the game playable after every change. Run `npm test` and `npm run build`, then check it in the browser with `npm run dev`.
- After finishing work, add a line at the top of Progress in SPEC.md (newest first), and one to Decisions if you made a non-obvious choice.
- If gameplay or controls change, update [HOW-TO-PLAY.md](HOW-TO-PLAY.md). It's for players, so keep it free of code terms.
- No dependencies without asking.
- Keep the game rules in `src/game/` free of Phaser, so the online server in `server/` can run them. Scenes handle drawing, input and sound.
- Take colors and the font from `src/theme.js` instead of writing new ones in place.
- The repo is public. Never commit local paths or personal info.
- Keep the docs short. They're for people too.
