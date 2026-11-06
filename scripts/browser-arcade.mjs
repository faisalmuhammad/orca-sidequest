// Browser regressions for the six games introduced in 0.5.0.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { emptySave, SAVE_KEY } from '../panel/storage.mjs';
import { createSnake } from '../panel/games/snake.mjs';
import { createPipes, rotateMask, pipeNetwork } from '../panel/games/pipes.mjs';
import { createBubbles } from '../panel/games/bubbles.mjs';
import { createReversi } from '../panel/games/reversi.mjs';
import { createBreakout } from '../panel/games/breakout.mjs';
import { createFlow, isFlowComplete } from '../panel/games/flow.mjs';
import { ARCADE_NAMES } from '../panel/arcade-cards.mjs';
import { ARCADE_VALIDATORS } from '../panel/arcade-games.mjs';
const rng = initial => { let seed = initial; return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; }; };
export async function runArcadeSmoke({ game = null } = {}) {
  assert.ok(game === null || Object.hasOwn(ARCADE_NAMES, game), 'Unknown game: ' + game);
  const run = promisify(execFile), cli = process.env.ORCA_CLI_COMMAND ?? 'orca', output = new URL('../.orca/shots/', import.meta.url);
  const journal = JSON.stringify(SAVE_KEY), url = 'http://127.0.0.1:' + (process.env.SIDEQUEST_PREVIEW_PORT ?? 4318) + '/';
  await mkdir(output, { recursive: true });
  async function command(...args) { const { stdout } = await run(cli, [...args, '--json'], { maxBuffer: 2 ** 20, timeout: 60000 }); const r = JSON.parse(stdout); assert.ok(r.ok, JSON.stringify(r.error)); assert.ok(!r.result?.effects?.consoleErrors?.length, JSON.stringify(r.result?.effects?.consoleErrors)); return r.result; }
  const page = (await command('tab', 'create', '--url', url)).browserPageId, act = (...args) => command(...args, '--page', page);
  async function evaluate(expression) { const r = await act('eval', '--expression', 'JSON.stringify(' + expression + ')'); return typeof r.result === 'string' ? JSON.parse(r.result) : r.result; }
  const key = value => act('keypress', '--key', value);
  async function control(role, name, action, ...args) { const refs = (await act('snapshot', '--interactive')).refs, ref = Object.entries(refs).find(([, n]) => n.role === role && n.name === name)?.[0]; assert.ok(ref, 'Missing ' + role + ': ' + name); await act(action, '--element', '@' + ref, ...args); }
  const click = name => control('button', name, 'click'), read = id => evaluate('JSON.parse(localStorage.getItem(' + journal + ')).games[' + JSON.stringify(id) + ']');
  const header = () => evaluate('(() => {document.getElementById("sound-button").focus();return true;})()');
  const focusCell = index => evaluate('(() => {document.querySelector(' + JSON.stringify('[data-arcade-cell="' + index + '"]') + ').focus();return true;})()');
  async function seed(id, s) {
    const save = emptySave(); save.activeGame = id; save.games[id] = s; const raw = JSON.stringify(JSON.stringify(save));
    await evaluate('(() => {const put=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){return put.call(this,key,key===' + journal + '?' + raw + ':value);};localStorage.setItem(' + journal + ',' + raw + ');return true;})()');
    await act('reload'); await act('viewport', '--width', '320', '--height', '860'); await act('wait', '--selector', '#app[aria-busy=false]');
    assert.equal(await evaluate('document.getElementById("app").dataset.game'), id); assert.ok(ARCADE_VALIDATORS[id](await read(id)), id + ' fixture must survive restoration');
  }
  async function waitFor(id, check) { const deadline = Date.now() + 5000; while (Date.now() < deadline) { const s = await read(id); if (check(s)) return s; await new Promise(resolve => setTimeout(resolve, 80)); } throw new Error('Timed out waiting for ' + id); }
  async function hints() { return evaluate('Array.from(document.querySelectorAll(".reversi-cell.playable"),n=>Number(n.dataset.arcadeCell))'); }
  async function screenshot(id, theme, width = 320) {
    await act('viewport', '--width', String(width), '--height', '860'); await evaluate('(() => {document.documentElement.className=' + JSON.stringify(theme) + ';return true;})()');
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, id + ' must fit at ' + width + 'px');
    const shot = await act('screenshot'); await copyFile(shot.path, new URL('arcade-' + id + '-' + theme + '.png', output));
  }
  const snake = createSnake(null, 'relaxed', rng(3)); snake.food = snake.body[0] + 1;
  const pipes = createPipes(null, 'quick', rng(8)); pipes.tiles = [...pipes.solution]; pipes.tiles[pipes.source] = rotateMask(pipes.tiles[pipes.source]);
  const board = Array(88).fill(null); board[3] = board[4] = 0; board[10] = 1;
  const bubbles = { ...createBubbles(), board, current: 0, next: 1 };
  const flow = createFlow(null, 'quick', rng(7)); flow.paths = flow.solution.map((path, i) => i === flow.solution.length - 1 ? [] : [...path]); flow.moves = 4;
  const fixtures = { snake, pipes, bubbles, reversi: createReversi(null, 'local'), breakout: createBreakout(null, 'relaxed'), flow };
  const checks = {
    async snake() {
      assert.equal((await read('snake')).paused, true); await click('Start'); await waitFor('snake', s => s.score === 10); await key('p'); assert.equal((await read('snake')).paused, true);
      await header(); await key('ArrowUp'); assert.equal((await read('snake')).queue[0], 'up'); const before = (await read('snake')).body[0];
      await key('Enter'); await waitFor('snake', s => s.body[0] === before - 16); await key('p'); assert.equal((await read('snake')).paused, true);
      const saved = await read('snake'); await act('reload'); await act('wait', '--selector', '#arcade-canvas'); assert.deepEqual((await read('snake')).body, saved.body); assert.equal((await read('snake')).paused, true);
      await screenshot('snake', 'dark'); await screenshot('snake', 'light', 240);
    },
    async pipes() {
      await focusCell(pipes.source); await key('Shift+Enter'); assert.ok(pipeNetwork(await read('pipes')).won); assert.equal((await read('pipes')).best.quick, 1);
      await header(); await key('Control+z'); assert.ok(!pipeNetwork(await read('pipes')).won); await click('Hint'); assert.ok(pipeNetwork(await read('pipes')).won); assert.equal((await read('pipes')).hints, 1);
      await control('combobox', 'Pipe Connect difficulty', 'select', '--value', 'classic'); assert.equal((await read('pipes')).size, 6);
      await focusCell(0); await key('Enter'); await click('New'); await act('wait', '--selector', '#confirm-dialog[open]'); const saved = await read('pipes'); await key('ArrowRight'); assert.deepEqual(await read('pipes'), saved); await key('Escape');
      await screenshot('pipes', 'dark'); await screenshot('pipes', 'light', 240);
    },
    async bubbles() {
      await key('Enter'); assert.equal((await read('bubbles')).shots, 1); await act('wait', '--text', 'Board cleared!'); assert.equal((await read('bubbles')).score, 50);
      await header(); await key('Control+z'); assert.equal((await read('bubbles')).shots, 0); await key('ArrowRight'); assert.equal((await read('bubbles')).aim, 3); await key('x'); assert.equal((await read('bubbles')).current, 1);
      await seed('bubbles', createBubbles(null, undefined, rng(7)));
      // A delayed or absent animation frame must never block keyboard gameplay.
      await evaluate('(() => {window.requestAnimationFrame=()=>1;document.getElementById("arcade-canvas").focus();return true;})()');
      await key('Enter'); assert.equal((await read('bubbles')).shots, 1); await act('wait', '--selector', '#arcade-fire:not(:disabled)');
      await key('Space'); assert.equal((await read('bubbles')).shots, 2); await act('wait', '--selector', '#arcade-fire:not(:disabled)');
      await seed('bubbles', bubbles); const box = await evaluate('(() => {const b=document.getElementById("arcade-canvas").getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height*.45};})()');
      await act('mouse', 'move', '--x', String(box.x), '--y', String(box.y)); await act('mouse', 'down', '--button', 'left'); await act('mouse', 'up', '--button', 'left'); assert.equal((await read('bubbles')).shots, 1); await act('wait', '--text', 'Board cleared!');
      await seed('bubbles', createBubbles(null, undefined, rng(7))); await evaluate('(() => {document.getElementById("arcade-canvas").focus();document.getElementById("arcade-canvas").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true,cancelable:true}));const select=document.getElementById("game-select");select.value="snake";select.dispatchEvent(new Event("change",{bubbles:true}));return true;})()');
      assert.equal((await read('bubbles')).shots, 1, 'Switching games must preserve a fired shot');
      await seed('bubbles', createBubbles(null, undefined, rng(7))); await screenshot('bubbles', 'dark'); await screenshot('bubbles', 'light', 240);
    },
    async reversi() {
      assert.deepEqual(await hints(), [19, 26, 37, 44]); await key('Enter'); assert.equal((await read('reversi')).moves, 1); assert.equal((await read('reversi')).board[27], 1);
      await header(); await key('Control+z'); assert.equal((await read('reversi')).moves, 0); await key('ArrowRight'); assert.equal(await evaluate('Number(document.activeElement.dataset.arcadeCell)'), 20);
      await seed('reversi', createReversi()); await key('Enter'); await waitFor('reversi', s => s.moves >= 2 && s.turn === 1); await click('Undo'); assert.equal((await read('reversi')).moves, 0);
      const board = Array(64).fill(1); board[0] = board[62] = 0; board[1] = board[61] = -1;
      await seed('reversi', { ...createReversi(null, 'local'), board, moves: 58, lastMove: 2 }); await focusCell(0); await key('Enter'); assert.equal((await read('reversi')).passed, -1); await focusCell(62); await key('Enter'); assert.equal((await read('reversi')).result, 1); await click('Undo'); assert.equal((await read('reversi')).result, null);
      await seed('reversi', fixtures.reversi); await screenshot('reversi', 'dark'); await screenshot('reversi', 'light', 240);
    },
    async breakout() {
      const before = (await read('breakout')).paddle; await header(); await key('ArrowLeft'); assert.ok((await read('breakout')).paddle < before);
      await key('Enter'); await waitFor('breakout', s => s.phase === 'playing' && !s.paused); await key('p'); assert.equal((await read('breakout')).paused, true);
      const saved = await read('breakout'); await act('reload'); await act('wait', '--selector', '#arcade-canvas'); assert.deepEqual((await read('breakout')).ball, saved.ball); assert.equal((await read('breakout')).paused, true);
      await seed('breakout', { ...createBreakout(), phase: 'playing', paused: true, ball: { x: 12, y: 446, vx: 0, vy: 200 } }); await key('Enter'); await waitFor('breakout', s => s.lives === 2 && s.phase === 'ready'); assert.equal((await read('breakout')).paused, true);
      await screenshot('breakout', 'dark'); await screenshot('breakout', 'light', 240);
    },
    async flow() {
      const path = flow.solution.at(-1), size = flow.size; await focusCell(path[0]); await key('Enter');
      for (let i = 1; i < path.length; i++) await key(path[i] === path[i - 1] + 1 ? 'ArrowRight' : path[i] === path[i - 1] - 1 ? 'ArrowLeft' : path[i] > path[i - 1] ? 'ArrowDown' : 'ArrowUp');
      assert.ok(isFlowComplete(await read('flow'))); assert.equal((await read('flow')).best.quick, 5); assert.equal((await read('flow')).active, null);
      await header(); await key('Control+z'); assert.ok(!isFlowComplete(await read('flow'))); assert.deepEqual((await read('flow')).paths.at(-1), []);
      await focusCell(path[0]); await key('Enter'); await key(path[1] === path[0] + 1 ? 'ArrowRight' : path[1] === path[0] - 1 ? 'ArrowLeft' : path[1] > path[0] ? 'ArrowDown' : 'ArrowUp'); await key('Escape'); assert.deepEqual((await read('flow')).paths.at(-1), []);
      const points = await evaluate('(() => {const b=document.getElementById("flow-board").getBoundingClientRect();return ' + JSON.stringify(path) + '.map(i=>({x:b.x+(i%' + size + '+.5)*b.width/' + size + ',y:b.y+(Math.floor(i/' + size + ')+.5)*b.height/' + size + '}));})()');
      await act('mouse', 'move', '--x', String(points[0].x), '--y', String(points[0].y)); await act('mouse', 'down', '--button', 'left'); for (const p of points.slice(1)) await act('mouse', 'move', '--x', String(p.x), '--y', String(p.y)); await act('mouse', 'up', '--button', 'left'); assert.ok(isFlowComplete(await read('flow')));
      await seed('flow', createFlow(null, 'quick', rng(7))); await click('Hint'); assert.equal((await read('flow')).hints, 1); await screenshot('flow', 'dark'); await screenshot('flow', 'light', 240);
    }
  };
  let original, captured = false; const passed = [];
  try {
    await act('wait', '--selector', '#app[aria-busy=false]'); original = await evaluate('localStorage.getItem(' + journal + ')'); captured = true;
    for (const id of Object.keys(fixtures).filter(id => game === null || id === game)) { await seed(id, fixtures[id]); await checks[id](); assert.ok(ARCADE_VALIDATORS[id](await read(id)), id + ' must remain a valid save'); passed.push(id); console.log('Passed: ' + ARCADE_NAMES[id] + ' — keys, input, saves, and narrow light/dark layouts'); }
    await click('All games'); assert.equal(await evaluate('document.querySelectorAll(".game-card").length'), Object.keys(emptySave().games).length);
    await control('combobox', 'Sort games', 'select', '--value', 'category'); assert.equal(await evaluate('document.querySelectorAll(".game-card").length'), 21);
    await control('combobox', 'Sort games', 'select', '--value', 'alpha'); assert.equal(await evaluate('document.querySelectorAll(".game-card").length'), 21);
    const browserConsole = await act('console', '--limit', '100'); assert.deepEqual(browserConsole.entries, []); await writeFile(new URL('browser-arcade.json', output), JSON.stringify({ passed, browserConsole }, null, 2));
  } finally {
    try { if (captured) await evaluate('(() => {const put=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key!==' + journal + ')return put.call(this,key,value);};const raw=' + JSON.stringify(original) + ';if(raw===null)localStorage.removeItem(' + journal + ');else put.call(localStorage,' + journal + ',raw);return true;})()'); }
    finally { await command('tab', 'close', '--page', page); }
  }
  console.log('Passed new-game checks; preview save restored.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runArcadeSmoke({ game: process.argv.includes('--game') ? process.argv[process.argv.indexOf('--game') + 1] : null });
