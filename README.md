# Vibed Pong

Classic Pong in the browser, vibe coded with an AI assistant one small version at a time.

**Play it at [nurullahakin.github.io/vibed-pong](https://nurullahakin.github.io/vibed-pong/).**

## Modes

- **Solo:** keep the ball going against a wall and beat your best score
- **Two players:** two people on one keyboard, first to 11
- **Against the CPU:** play against the computer, first to 11
- **Aim practice:** balls from three angles, to learn how your paddle aims

Your paddle aims: hit the ball with the edge to send it back at a steep angle. Controls, aiming and rules are in [HOW-TO-PLAY.md](HOW-TO-PLAY.md).

## Run It Yourself

You need [Node.js](https://nodejs.org) 22 or newer.

```sh
npm install
npm run dev     # play locally, reloads as you edit
npm test        # check the game rules
npm run build   # build the site into dist/
```

Every push to `main` is tested, built and published to GitHub Pages.

## Project

| Where | What's in it |
|---|---|
| [src/game/](src/game/) | Game rules and tuning values, in plain JavaScript with no Phaser |
| [src/scenes/](src/scenes/) | Phaser scenes: menu, game, pause, game over |
| [SPEC.md](SPEC.md) | Scope, roadmap, progress and decisions |
| [HOW-TO-PLAY.md](HOW-TO-PLAY.md) | Player guide |
| [CLAUDE.md](CLAUDE.md) | Instructions for the AI, including the prompt that started the project |

Built with [Phaser 4](https://phaser.io) and [Vite](https://vite.dev). Sounds are generated in the browser, so there are no asset files. Speeds, sizes and CPU difficulty are in [src/game/config.js](src/game/config.js).
