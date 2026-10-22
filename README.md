# Vibed Pong

Classic Pong in the browser, vibe coded with an AI assistant one small version at a time.

## Play

Download or clone the repo and open `index.html` in a browser. There's nothing to install or build.

```sh
git clone https://github.com/nurullahakin/vibed-pong.git
```

## Modes

- **Solo:** keep the ball going against a wall and beat your best score
- **Two players:** two people on one keyboard, first to 11
- **Against the CPU:** play against the computer, first to 11

Controls and rules are in [HOW-TO-PLAY.md](HOW-TO-PLAY.md).

## Project

| File | What's in it |
|---|---|
| [SPEC.md](SPEC.md) | Scope, roadmap, progress and decisions |
| [HOW-TO-PLAY.md](HOW-TO-PLAY.md) | Player guide |
| [CLAUDE.md](CLAUDE.md) | Instructions for the AI, including the prompt that started the project |

It's plain JavaScript on an HTML5 canvas, with no dependencies. Sounds are generated in the browser, so there are no asset files. Speeds, sizes and CPU difficulty are in the `CONFIG` block at the top of [game.js](game.js).
