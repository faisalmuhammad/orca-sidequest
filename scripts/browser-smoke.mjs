// Integration checks through Orca's browser CLI. Run with the local preview server.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { create2048 } from '../panel/games/2048.mjs';
import { createSudoku } from '../panel/games/sudoku.mjs';
import { createCheckers } from '../panel/games/checkers.mjs';
import { createBlocks } from '../panel/games/blocks.mjs';
import { createMemory } from '../panel/games/memory.mjs';
import { emptySave, SAVE_KEY } from '../panel/storage.mjs';

const run = promisify(execFile);
const cli = process.env.ORCA_CLI_COMMAND ?? 'orca';
const url = 'http://127.0.0.1:4318/';
const output = fileURLToPath(new URL('../.orca/shots/', import.meta.url));
await mkdir(output, { recursive: true });
let page = process.argv[2];
let width = 320;
async function command(...args) {
  const { stdout } = await run(cli, [...args, '--json'], { maxBuffer: 2 ** 20, timeout: 60000 });
  const value = JSON.parse(stdout);
  if (!value.ok) throw new Error(JSON.stringify(value.error));
  if (value.result?.effects?.consoleErrors?.length) throw new Error(JSON.stringify(value.result.effects.consoleErrors));
  return value.result;
}
if (!page) page = (await command('tab','create','--url',url)).browserPageId;
console.log(`Testing browser page ${page}`);
const act = (...args) => command(...args, '--page', page);
async function evaluate(expression) {
  const result = await act('eval', '--expression', `JSON.stringify(${expression})`);
  const raw = result.result;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}
async function click(name) {
  const snapshot = await act('snapshot','--interactive');
  const ref = Object.entries(snapshot.refs).find(([, value]) => value.role === 'button' && value.name === name)?.[0];
  assert.ok(ref, `Button not found: ${name}`);
  await act('click','--element',`@${ref}`);
}
async function select(name, value) {
  const snapshot = await act('snapshot','--interactive');
  const ref = Object.entries(snapshot.refs).find(([, node]) => node.name === name && node.role === 'combobox')?.[0];
  assert.ok(ref, `Selector not found: ${name}`);
  await act('select','--element',`@${ref}`,'--value',value);
}
const readSave = () => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)}))`);
const key = value => act('keypress','--key',value);
async function seed(value) {
  // Freeze this test-only journal until navigation: blur, visibility and pagehide
  // can all flush the old document's state while a reload is under way.
  await evaluate(`(() => { const put = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { return put.call(this, key, key === ${JSON.stringify(SAVE_KEY)} ? ${JSON.stringify(JSON.stringify(value))} : value); }; localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(value))}); return true; })()`);
  await reload();
  await act('wait','--selector','#app[aria-busy="false"]');
  if (value.activeGame) assert.equal(await evaluate(`!!document.getElementById(${JSON.stringify({ '2048':'board-2048', sudoku:'sudoku-board', checkers:'checkers-board', blocks:'blocks-board', memory:'memory-board' }[value.activeGame])})`), true, JSON.stringify(await evaluate(`({ save: JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)})), text: document.body.innerText })`)));
}
async function reload() {
  await act('reload');
  // Navigation resets Orca's device emulation. Reapply it after every load.
  await act('viewport','--width',String(width),'--height','760','--mobile');
}
async function layout(label) {
  const result = await evaluate(`({ width: innerWidth, scroll: document.documentElement.scrollWidth, title: document.title, cells: document.querySelectorAll('.sudoku-cell').length, tiles: document.querySelectorAll('.tile').length })`);
  assert.equal(result.title, 'Sidequest');
  assert.equal(result.width, width, 'Browser viewport emulation was not applied');
  assert.ok(result.scroll <= result.width, `${label} overflows: ${JSON.stringify(result)}`);
  const board = await evaluate(`(() => { const board = document.getElementById('board-2048'); if (!board) return null; const b=board.getBoundingClientRect(),cells=[...board.querySelectorAll('.board-cell')],tiles=[...board.querySelectorAll('.tile')]; return {width:b.width,height:b.height,cells:cells.length,valid:tiles.every(tile=>{const cell=cells[Number(tile.dataset.index)].getBoundingClientRect(),rect=tile.getBoundingClientRect();return rect.width>20&&rect.height>20&&Math.abs(rect.x-cell.x)<1&&Math.abs(rect.y-cell.y)<1&&Math.abs(rect.width-cell.width)<1&&Math.abs(rect.height-cell.height)<1;})}; })()`);
  if(board){assert.equal(board.cells,16);assert.ok(Math.abs(board.width-board.height)<1, JSON.stringify(board));assert.ok(board.valid, 'Tiles must align with their background cells');}
  console.log(`Passed: ${label} layout (${result.width}px)`);
}
async function screenshot(name) {
  const result = await act('screenshot');
  assert.ok(result.path, JSON.stringify(result));
  await copyFile(result.path, `${output}${name}.png`);
}

await act('goto','--url',url);
if (!process.argv.includes('--extras')) {
await seed(emptySave());
await layout('game picker');
await screenshot('picker-preview');

const blocks = { ...create2048(), board: [2,2,...Array(14).fill(0)] };
await seed({ ...emptySave(), activeGame: '2048', games: { '2048': blocks, sudoku: null } });
await evaluate(`(() => { document.getElementById('board-2048').focus(); return true; })()`);
await key('ArrowLeft');
assert.equal((await readSave()).games['2048'].score, 4);
assert.equal((await readSave()).games['2048'].moves, 1);
await click('Undo');
assert.deepEqual((await readSave()).games['2048'].board, blocks.board);
assert.equal((await readSave()).games['2048'].best, 4);
await key('ArrowRight');
const beforeReload = (await readSave()).games['2048'];
await reload();
await act('wait','--selector','#board-2048');
assert.deepEqual((await readSave()).games['2048'], beforeReload);
await layout('2048');
await screenshot('2048-preview');
console.log('Passed: 2048 keyboard moves, undo, personal best and reload recovery');

await select('Switch game', 'sudoku');
assert.equal(await evaluate(`document.querySelectorAll('.sudoku-cell').length`), 81);
const start = (await readSave()).games.sudoku;
const index = start.values.findIndex(value => !value);
await key('n');
await key('1');
let current = (await readSave()).games.sudoku;
assert.equal(current.notes[index], 2);
assert.equal(current.values[index], 0);
await key('n');
await key('2');
assert.equal((await readSave()).games.sudoku.values[index], 2);
await click('Undo');
current = (await readSave()).games.sudoku;
assert.equal(current.notes[index], 2);
assert.equal(current.values[index], 0);
await click('Hint');
current = (await readSave()).games.sudoku;
assert.equal(current.values[index], current.solution[index]);
assert.equal(current.hintsUsed, 1);
await click('Check');
assert.match(await evaluate(`document.getElementById('feedback').textContent`), /look good/);
await click('Pause timer');
assert.equal((await readSave()).games.sudoku.paused, true);
assert.equal(await evaluate(`document.getElementById('overlay-sudoku').hidden`), false);
const pausedTime = (await readSave()).games.sudoku.elapsedMs;
await new Promise(resolve => setTimeout(resolve, 1150));
assert.equal((await readSave()).games.sudoku.elapsedMs, pausedTime);
await click('Resume');
await select('Switch game','2048');
assert.deepEqual((await readSave()).games['2048'], beforeReload);
await select('Switch game','sudoku');
assert.equal((await readSave()).games.sudoku.notes[index], 0);
assert.equal((await readSave()).games.sudoku.values[index], current.solution[index]);
await reload();
await act('wait','--selector','#sudoku-board');
assert.equal((await readSave()).games.sudoku.hintsUsed, 1);
await layout('Sudoku');
await screenshot('sudoku-preview');
console.log('Passed: Sudoku notes, entry, undo, hints, check, pause and independent resume');

await click('New');
assert.equal(await evaluate(`document.getElementById('confirm-dialog').open`), true);
await click('Keep playing');
assert.equal((await readSave()).games.sudoku.hintsUsed, 1);
await click('New');
await click('Start new');
await act('wait','--selector','#undo-sudoku:disabled');
assert.equal((await readSave()).games.sudoku.hintsUsed, 0);
console.log('Passed: confirmation protects in-progress puzzles');

width = 240;
await act('viewport','--width',String(width),'--height','760','--mobile');
await layout('very narrow Sudoku');
width = 320;
await act('viewport','--width',String(width),'--height','760','--mobile');
await evaluate(`(() => { document.documentElement.className = 'light'; return true; })()`);
await screenshot('sudoku-light-preview');
await evaluate(`(() => { document.documentElement.className = 'dark'; return true; })()`);
await screenshot('sudoku-dark-preview');

const winning = { ...create2048(), board: [1024,1024,...Array(14).fill(0)] };
await seed({ ...emptySave(), activeGame: '2048', games: { '2048': winning, sudoku: null } });
await evaluate(`(() => { document.getElementById('board-2048').focus(); return true; })()`);
await key('ArrowLeft');
await act('wait','--text','You made 2048');
assert.match(await evaluate(`document.getElementById('overlay-2048').textContent`), /You made 2048/);
await click('Keep going');
assert.equal((await readSave()).games['2048'].winAcknowledged, true);
console.log('Passed: 2048 win and continue flow');

const puzzle = createSudoku();
const finalCell = puzzle.puzzle.findIndex(value => !value);
puzzle.values = [...puzzle.solution]; puzzle.values[finalCell] = 0;
await seed({ ...emptySave(), activeGame: 'sudoku', games: { '2048': winning, sudoku: puzzle } });
await evaluate(`(() => { document.querySelector('[data-cell="${finalCell}"]').focus(); return true; })()`);
await key(String(puzzle.solution[finalCell]));
assert.match(await evaluate(`document.getElementById('overlay-sudoku').textContent`), /Everything fits/);
await click('Next puzzle');
await act('wait','--selector','#undo-sudoku:disabled');
assert.equal((await readSave()).games.sudoku.history.length, 0);
console.log('Passed: Sudoku completion and next puzzle flow');
}

// Candidate helpers and number-first input must cooperate with undo and saves.
await seed({ ...emptySave(), activeGame:'sudoku', games:{ ...emptySave().games, sudoku:createSudoku() } });
await click('Auto notes');
assert.ok((await readSave()).games.sudoku.notes.some(Boolean));
await click('Undo');
assert.ok((await readSave()).games.sudoku.notes.every(n=>n===0));
await click('Number first');
const numberState=(await readSave()).games.sudoku;
const editable=numberState.puzzle.findIndex(v=>!v);
await click('Enter '+numberState.solution[editable]+', '+(9-numberState.values.filter(v=>v===numberState.solution[editable]).length)+' remaining');
await click('Row '+(Math.floor(editable/9)+1)+', column '+(editable%9+1)+': empty');
assert.equal((await readSave()).games.sudoku.values[editable],numberState.solution[editable]);
console.log('Passed: auto notes, undo and number-first input');

const checkers={...createCheckers('local'),board:Array.from({length:64},(_,i)=>({42:1,33:-1,17:-1,5:-1,46:1})[i]??0)};
await seed({...emptySave(),activeGame:'checkers',games:{...emptySave().games,checkers}});
await click('Row 6, column 3: coral piece, can move');
await click('Row 4, column 1: legal destination');
await act('wait','--text','Keep jumping');
assert.equal((await readSave()).games.checkers.forced,24);
await click('Row 2, column 3: legal destination');
assert.equal((await readSave()).games.checkers.turn,-1);
await click('Undo');
assert.deepEqual((await readSave()).games.checkers.board,checkers.board);
await layout('Checkers');
await screenshot('checkers-preview');
await seed({...emptySave(),activeGame:'checkers',games:{...emptySave().games,checkers:createCheckers()}});
await click('Row 6, column 1: coral piece, can move');
await click('Row 5, column 2: legal destination');
await act('wait','--text','Coral to move');
assert.equal((await readSave()).games.checkers.moves,2);
await click('Undo');
assert.equal((await readSave()).games.checkers.moves,0);
console.log('Passed: mandatory captures, chained jumps, computer opponent and turn undo');

await select('Switch game','blocks');
await click('Start');
await key('c');
assert.equal((await readSave()).games.blocks.holdUsed,true);
await key('ArrowUp');
await key('Space');
assert.equal((await readSave()).games.blocks.pieces,1);
await click('Pause game');
assert.equal((await readSave()).games.blocks.paused,true);
await layout('Falling Blocks');
await screenshot('blocks-preview');
await reload();await act('wait','--selector','#blocks-board');
assert.equal((await readSave()).games.blocks.pieces,1);
assert.equal((await readSave()).games.blocks.paused,true);
console.log('Passed: piece rotation, hold, drop, pause and resume recovery');

await select('Switch game','memory');
await click('Start');
assert.equal((await readSave()).games.memory.phase,'study');
await act('wait','--text','Choose a card.');
const memory=(await readSave()).games.memory;
const first=0,match=memory.cards.findIndex((v,i)=>i!==first&&v===memory.cards[first]);
await click('Card 1: face down');
await click('Card '+(match+1)+': face down');
assert.equal((await readSave()).games.memory.matched.length,2);
assert.equal((await readSave()).games.memory.attempts,1);
await layout('Memory');await screenshot('memory-preview');
console.log('Passed: study phase, card matching and progress');

for(const id of ['2048','sudoku','checkers','blocks','memory']) {
  width=240;await act('viewport','--width','240','--height','760','--mobile');
  await select('Switch game',id);await layout('narrow '+id);
}
width=320;await act('viewport','--width','320','--height','760','--mobile');

await seed(emptySave());
// Measure the real Web Audio waveform; no microphone or system-volume changes.
await evaluate(`(() => { const Audio=window.AudioContext; window.__audioPeak=0;window.AudioContext=class extends Audio { constructor(){super();window.__soundContext=this;const analyser=this.createAnalyser();const gain=this.createGain.bind(this);this.createGain=()=>{const node=gain();node.connect(analyser);return node;};const samples=new Float32Array(analyser.fftSize);const timer=setInterval(()=>{analyser.getFloatTimeDomainData(samples);window.__audioPeak=Math.max(window.__audioPeak,...samples.map(Math.abs));},5);setTimeout(()=>clearInterval(timer),1200);}};return true; })()`);
await click('Turn sound on');
const audio=await evaluate(`({state:window.__soundContext?.state,peak:window.__audioPeak})`);
assert.equal(audio.state,'running');assert.ok(audio.peak>.01,JSON.stringify(audio));
await click('Turn sound off');
assert.equal((await readSave()).preferences.sound,false);
assert.equal(await evaluate(`document.querySelectorAll('a').length`),0,'Promotional footer was removed');
console.log('Passed: audible audio waveform, mute preference and no promotional footer');
const browserConsole = await act('console','--limit','100');
await writeFile(`${output}browser-smoke.json`, JSON.stringify({ passed: true, page, browserConsole }, null, 2));
console.log(`All browser checks passed. Screenshots: ${output}`);
