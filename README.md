# Sidequest - Quick Games in Orca

Refresh your mind with a quick game while your agents work.

A home for small games inside [Orca](https://onorca.dev), with one compact sidebar, a quick picker, and separate saved progress. Take a break and pick up where you left off whenever you return.

[![Orca 1.4.248+](https://img.shields.io/badge/Orca-1.4.248%2B-49c4a7)](https://onorca.dev) [![Light and Dark](https://img.shields.io/badge/appearance-light%20%26%20dark-263c40)](#previews) [![MIT license](https://img.shields.io/badge/license-MIT-17b877)](LICENSE)

![Sidequest puzzle emblem and the message: Refresh your mind with a quick game while your agents work](assets/cover.png)

## Install

Requires **Orca desktop 1.4.248 or newer**.

1. Open **Settings → Plugins**.
2. Choose **Add plugin → From a Git URL…** and enter:

   ```text
   https://github.com/faisalmuhammad/orca-sidequest#v0.5.0
   ```

   Keep `#v0.5.0` at the end. Orca requires a release tag or commit hash to install from Git.
3. Review and approve the requested access: a **sandboxed panel** and **plugin-owned storage** for saved progress.
4. Select **Sidequest** using the puzzle icon in the right sidebar, then pick a game. **All games** returns to the picker; the selector switches games directly.

All runtime assets are included. Installation requires no Node.js, dependencies, or build step.

## Games

Pick a quick game from the library. Each keeps its own progress, and the artwork below matches the cards in Sidequest’s main panel.

<table>
  <tr>
    <td width="33%" align="center"><img src="assets/games/2048.png" alt="2048 card artwork: colorful numbered tiles" width="240"><br><strong>2048</strong></td>
    <td width="33%" align="center"><img src="assets/games/sudoku.png" alt="Sudoku card artwork: an indigo number grid" width="240"><br><strong>Sudoku</strong></td>
    <td width="33%" align="center"><img src="assets/games/checkers.png" alt="Checkers card artwork: coral and ink pieces on a board" width="240"><br><strong>Checkers</strong></td>
  </tr>
  <tr>
    <td align="center"><img src="assets/games/blocks.png" alt="Falling Blocks card artwork: colorful stacked pieces" width="240"><br><strong>Falling Blocks</strong></td>
    <td align="center"><img src="assets/games/memory.png" alt="Memory card artwork: matching symbol cards" width="240"><br><strong>Memory</strong></td>
    <td align="center"><img src="assets/games/minesweeper.png" alt="Minesweeper card artwork: numbered squares and flags" width="240"><br><strong>Minesweeper</strong></td>
  </tr>
  <tr>
    <td align="center"><img src="assets/games/lights.png" alt="Lights Out card artwork: glowing amber tiles" width="240"><br><strong>Lights Out</strong></td>
    <td align="center"><img src="assets/games/nonograms.png" alt="Nonograms card artwork: a green pixel picture" width="240"><br><strong>Nonograms</strong></td>
    <td align="center"><img src="assets/games/codebreaker.png" alt="Codebreaker card artwork: a colorful symbol sequence" width="240"><br><strong>Codebreaker</strong></td>
  </tr>
  <tr>
    <td align="center"><img src="assets/games/sliding.png" alt="Sliding Puzzle card artwork: numbered tiles around an empty space" width="240"><br><strong>Sliding Puzzle</strong></td>
    <td align="center"><img src="assets/games/connect.png" alt="Connect Four card artwork: coral and mint pieces in a grid" width="240"><br><strong>Connect Four</strong></td>
    <td align="center"><img src="assets/games/sokoban.png" alt="Sokoban card artwork: a crate, player, and glowing target in a small room" width="240"><br><strong>Sokoban</strong></td>
  </tr>
  <tr>
    <td align="center"><img src="assets/games/wordle.png" alt="Wordle card artwork: green and yellow letter tiles" width="240"><br><strong>Wordle</strong></td>
    <td align="center"><img src="assets/games/simon.png" alt="Simon card artwork: four colored pads in a circle" width="240"><br><strong>Simon</strong></td>
    <td align="center"><img src="assets/games/flood.png" alt="Flood Fill card artwork: a multicolored grid" width="240"><br><strong>Flood Fill</strong></td>
  </tr>
  <tr>
    <td align="center"><img src="assets/games/snake.png" alt="Snake card artwork: mint square tiles on a green board" width="240"><br><strong>Snake</strong></td>
    <td align="center"><img src="assets/games/pipes.png" alt="Pipe Connect card artwork: connected pipe tiles" width="240"><br><strong>Pipe Connect</strong></td>
    <td align="center"><img src="assets/games/bubbles.png" alt="Bubble Shooter card artwork: colored bubbles in a violet frame" width="240"><br><strong>Bubble Shooter</strong></td>
  </tr>
  <tr>
    <td align="center"><img src="assets/games/reversi.png" alt="Reversi card artwork: ink and pearl discs on a green board" width="240"><br><strong>Reversi</strong></td>
    <td align="center"><img src="assets/games/breakout.png" alt="Brick Breaker card artwork: colorful bricks, a ball and mint paddle" width="240"><br><strong>Brick Breaker</strong></td>
    <td align="center"><img src="assets/games/flow.png" alt="Flow Connect card artwork: mint and violet paths joining endpoints" width="240"><br><strong>Flow Connect</strong></td>
  </tr>
</table>

## Previews

| Dark | Light |
| --- | --- |
| ![Sidequest interfaces in the dark theme](assets/screenshot-dark.png) | ![Sidequest interfaces in the light theme](assets/screenshot-light.png) |

The previews combine **actual interface captures from Orca’s embedded browser**, using sample saved progress in a standalone preview. The cover is vector artwork using Sidequest’s shared puzzle identity. The local preview and native plugin keep separate save data.

## Features

| Feature | Behavior |
| --- | --- |
| One game picker | Switch games inside the same sidebar |
| Saved progress | Each game keeps its own round and personal records |
| Keyboard and touch | Each game accepts its shortcuts while the panel is focused; arrows also navigate Checkers and Memory |
| Optional sound | Turn sound on or off using the speaker button; your choice is saved |
| Thoughtful motion | Smooth transitions, with reduced-motion support |
| Light and dark | Styling follows Orca’s appearance |
| Library views | Switch between compact tiles and expanded cards with the header button beside sound; your choice is saved |
| Fresh puzzles | Connection puzzles generate solvable boards locally |
| Sidebar layout | Works in narrow sidebars; real-time play pauses when you leave |

## Progress and access

Games save automatically. Reopening resumes your selection, and starting a new game asks before replacing a round in progress.

The header shows **Saved**, **Saving**, **Device save** (Orca storage is unavailable), or **Not saved**. Writes are serialized, with a synchronous device journal to recover recent progress if the panel closes during a save. Invalid game data resets independently.

The only capability is **storage:own**, for private game saves. Runtime code runs in Orca’s isolated panel, without a Node worker or network requests. Sound starts after a click or key press.

<details>
<summary>Local development and validation</summary>

To work on the plugin locally, clone this repository and add its root through **Settings → Plugins → Development folders…**. Approve the sandboxed panel and plugin-owned storage, then select Sidequest’s puzzle tab.

Plain HTML, CSS, and JavaScript modules, with no build step. Requires Node.js 22+ for tooling.

~~~sh
npm test
orca plugin test . --json
orca plugin validate . --json
orca plugin check . --json
~~~

For a standalone preview:

~~~sh
npm run preview
~~~

Open http://127.0.0.1:4318. Set `SIDEQUEST_PREVIEW_PORT` to change the port. With the preview running and Orca open, run `npm run test:browser` to check real input, game switching, save recovery, narrow layouts, and audio output. Diagnostic captures are saved under `.orca/shots/`.

Run `npm run test:browser:keyboard` to check physical keyboard input in all 21 games, including restored panels, toolbar focus, undo, pause, and game switching. It restores the preview’s previous saved progress. Use `npm run test:browser:keyboard -- --game sliding` to check Sliding Puzzle’s tile directions, edges, completion, undo, and focus on both board sizes.

Run `npm run test:browser:arcade` for the six games introduced in 0.5.0, including keyboard firing, animation fallback, generated puzzles, pointer paths, and automatic pauses. Use `-- --game snake` (or another game id) to focus on one.

Run `npm run test:browser:wordle` for focused keyboard checks: restored panels, board clicks, toolbar focus, text editing, dialogs, replay, and switching games. These checks restore the standalone preview’s previous save.

Game rules live in `panel/games/`; panel modules handle rendering and controls; `panel/storage.mjs` handles persistence. Keep new games self-contained, keyboard and touch accessible, compact, and dependency-free. Register their creator and validator, add a picker entry, and test rules, save recovery, and interaction.

Validated on macOS with Orca **1.4.250**: **137** rules, sound, and save tests; browser checks at **320px** and **240px**, including all 21 games’ keyboard controls and the full Sokoban campaign; Orca validation/checks; and native panel captures without runtime errors.

The manifest references release images in `assets/`. Vector sources and original captures are retained under `assets/source/`. Run `scripts/release-art.mjs` to render artwork and `scripts/release-shots.mjs` with the preview running to capture the interface. These optional image tools use Sharp. Install it locally with `npm install --no-save --package-lock=false sharp`, or set `SHARP_MODULE` to an installed ESM module. Sharp is not a runtime dependency.

Run `node scripts/release-gallery.mjs` with the preview running and Orca open to refresh the README’s game artwork in `assets/games/`. It captures the panel’s own card previews, restores the preview’s previous saved progress, and needs no image dependencies. Use `--games snake,pipes,bubbles,reversi,breakout,flow` to refresh just the new thumbnails.

Exclude `node_modules/` and `.orca/` from Git and release uploads.

</details>

## Attribution and license

An independent community plugin, maintained by [faisalmuhammad](https://github.com/faisalmuhammad). Sidequest is not affiliated with Orca.

Plugin code and original artwork use [MIT](LICENSE). The new games use original code, visuals, and generated puzzles. Brick Breaker is Sidequest’s paddle-and-brick game; no original Breakout artwork, code, or branding is included. The shared puzzle glyph comes from [Lucide](https://lucide.dev), matching Orca’s built-in icon. Its ISC license and upstream notices are preserved in [LICENSE-LUCIDE](LICENSE-LUCIDE).
