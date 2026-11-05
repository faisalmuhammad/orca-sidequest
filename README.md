# Sidequest for Orca

Refresh your mind with a quick game while your agents work.

A home for small games inside [Orca](https://onorca.dev), with one compact sidebar, a quick picker, and separate saved progress. Take a break and pick up where you left off whenever you return.

[![Orca 1.4.248+](https://img.shields.io/badge/Orca-1.4.248%2B-49c4a7)](https://onorca.dev) [![Light and Dark](https://img.shields.io/badge/appearance-light%20%26%20dark-263c40)](#previews) [![MIT license](https://img.shields.io/badge/license-MIT-17b877)](LICENSE)

![Sidequest puzzle emblem and the message: Refresh your mind with a quick game while your agents work](assets/cover.png)

## Install

Requires **Orca desktop 1.4.248 or newer**.

1. Open **Settings → Plugins**.
2. Choose **Add plugin → From a Git URL…** and enter:

   ```text
   https://github.com/faisalmuhammad/orca-sidequest#v0.1.0
   ```

   Keep `#v0.1.0` at the end. Orca requires a release tag or commit hash to install from Git.
3. Review and approve the requested access: a **sandboxed panel** and **plugin-owned storage** for saved progress.
4. Select **Sidequest** using the puzzle icon in the right sidebar, then pick a game. **All games** returns to the picker; the selector switches games directly.

All runtime assets are included. Installation requires no Node.js, dependencies, or build step.

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
| Keyboard and touch | Controls and shortcuts appear within each game |
| Optional sound | Turn sound on or off using the speaker button; your choice is saved |
| Thoughtful motion | Smooth transitions, with reduced-motion support |
| Light and dark | Styling follows Orca’s appearance |
| Compact layout | Works in narrow sidebars; real-time play pauses when you leave |

The status-bar puzzle icon toggles the right sidebar. If another panel is selected, choose Sidequest’s puzzle tab. Orca’s current plugin API cannot select a specific panel or report which panel is active, so the status-bar icon cannot reflect Sidequest’s active state yet.

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

Game rules live in `panel/games/`; panel modules handle rendering and controls; `panel/storage.mjs` handles persistence. Keep new games self-contained, keyboard and touch accessible, compact, and dependency-free. Register their creator and validator, add a picker entry, and test rules, save recovery, and interaction.

Validated on macOS with Orca **1.4.250**: **30** rules, sound, and save tests; full browser checks at **320px** and **240px**; Orca validation/checks; and native panel captures without runtime errors.

The manifest references release images in `assets/`. Vector sources and original captures are retained under `assets/source/`. Run `scripts/release-art.mjs` to render artwork and `scripts/release-shots.mjs` with the preview running to capture the interface. These optional image tools use Sharp; set `SHARP_MODULE` to its ESM module path outside this plugin workspace. Sharp is not a runtime dependency.

Exclude `node_modules/` and `.orca/` from Git and release uploads.

</details>

## Attribution and license

An independent community plugin, maintained by [faisalmuhammad](https://github.com/faisalmuhammad). Sidequest is not affiliated with Orca.

Plugin code and original artwork use [MIT](LICENSE). The shared puzzle glyph comes from [Lucide](https://lucide.dev), matching Orca’s built-in icon. Its ISC license and upstream notices are preserved in [LICENSE-LUCIDE](LICENSE-LUCIDE).
