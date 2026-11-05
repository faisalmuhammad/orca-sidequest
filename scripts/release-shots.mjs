// Capture real UI with sample saves in the standalone preview, never native saves.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { create2048 } from '../panel/games/2048.mjs';
import { createSudoku, candidates } from '../panel/games/sudoku.mjs';
import {
  createCheckers,
  checkersMoves,
  moveCheckers,
} from '../panel/games/checkers.mjs';
import { createBlocks } from '../panel/games/blocks.mjs';
import { createMemory } from '../panel/games/memory.mjs';
import { emptySave, SAVE_KEY } from '../panel/storage.mjs';
const run = promisify(execFile),
  cli = process.env.ORCA_CLI_COMMAND ?? 'orca';
const output = new URL('../assets/', import.meta.url),
  capture = new URL('source/captures/', output);
await mkdir(capture, { recursive: true });
async function command(...args) {
  const { stdout } = await run(cli, [...args, '--json'], {
    maxBuffer: 2 ** 20,
    timeout: 60000,
  });
  const r = JSON.parse(stdout);
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.result;
}
let page =
  process.argv[2] ??
  (await command('tab', 'create', '--url', 'http://127.0.0.1:4318/'))
    .browserPageId;
console.log('Release capture page ' + page);
const act = (...args) => command(...args, '--page', page);
const evaluate = (expression) => act('eval', '--expression', expression);
async function seed(id, game, theme) {
  const value = {
    ...emptySave(),
    activeGame: id,
    games: { ...emptySave().games, [id]: game },
  };
  await evaluate(
    '(()=>{const put=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){return put.call(this,key,key===' +
      JSON.stringify(SAVE_KEY) +
      '?' +
      JSON.stringify(JSON.stringify(value)) +
      ':value);};localStorage.setItem(' +
      JSON.stringify(SAVE_KEY) +
      ',' +
      JSON.stringify(JSON.stringify(value)) +
      ');return true;})()',
  );
  await act('reload');
  await act('viewport', '--width', '320', '--height', '860', '--mobile');
  await act('wait', '--selector', '#app[aria-busy="false"]');
  await evaluate('document.documentElement.className=' + JSON.stringify(theme));
}
async function click(name) {
  const refs = (await act('snapshot', '--interactive')).refs;
  const ref = Object.entries(refs).find(
    ([, n]) => n.role === 'button' && n.name === name,
  )?.[0];
  if (!ref) throw new Error('Button missing: ' + name);
  await act('click', '--element', '@' + ref);
}
function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}
const random = rng(42),
  sudoku = createSudoku('easy', random);
let added = 0;
for (let i = 0; i < 81; i++)
  if (!sudoku.values[i] && added++ < 9) sudoku.values[i] = sudoku.solution[i];
const note = sudoku.values.findIndex((v) => !v);
sudoku.notes[note] = candidates(sudoku.values, note).reduce(
  (m, v) => m | (1 << v),
  0,
);
sudoku.elapsedMs = 157000;
let checkers = createCheckers('local');
for (let turn = 0; turn < 12;) {
  const moves = checkersMoves(checkers);
  if (!moves.length) break;
  const m = moves[Math.floor(random() * moves.length)];
  const next = moveCheckers(checkers, m.from, m.to);
  if (next.turn !== checkers.turn) turn++;
  checkers = next;
}
const blocks = createBlocks(8200, random);
Object.assign(blocks, {
  lines: 12,
  pieces: 24,
  score: 2460,
  active: { type: 'T', rotation: 1, x: 4, y: 6 },
});
const heights = [3, 4, 2, 5, 4, 2, 3, 4, 5, 3];
for (let x = 0; x < 10; x++)
  for (let y = 20 - heights[x]; y < 20; y++)
    if (!(y === 19 && x === 5))
      blocks.board[y * 10 + x] = 1 + ((x + Math.floor(y / 2)) % 7);
const memory = createMemory(11, random);
memory.phase = 'play';
memory.attempts = 5;
memory.matched = memory.cards.flatMap((v, i) => (v < 2 ? [i] : []));
memory.open = [memory.cards.findIndex((v) => v === 4)];
const fixtures = {
  2048: {
    ...create2048(),
    board: [2, 4, 16, 0, 8, 32, 64, 2, 16, 128, 256, 4, 2, 8, 32, 0],
    score: 1644,
    best: 4096,
    moves: 112,
  },
  sudoku,
  checkers,
  blocks,
  memory,
};
for (const theme of ['dark', 'light'])
  for (const [id, game] of Object.entries(fixtures)) {
    await seed(id, game, theme);
    if (id === 'blocks') await click('Resume');
    if (id === 'checkers') {
      const m = checkersMoves(game)[0];
      await click(
        'Row ' +
          (Math.floor(m.from / 8) + 1) +
          ', column ' +
          ((m.from % 8) + 1) +
          ': ' +
          (game.turn === 1 ? 'coral' : 'ink') +
          ' ' +
          (Math.abs(game.board[m.from]) === 2 ? 'king' : 'piece') +
          ', can move',
      );
    }
    const shot = await act('screenshot');
    await copyFile(shot.path, new URL(theme + '-' + id + '.png', capture));
    console.log('Captured ' + theme + ' ' + id);
  }
const sharp = (await import(process.env.SHARP_MODULE ?? 'sharp')).default;
for (const theme of ['dark', 'light']) {
  const dark = theme === 'dark',
    bg = dark ? '#17242d' : '#eef2ec',
    fg = dark ? '#edf5ee' : '#20382f',
    quiet = dark ? '#9ebbb0' : '#647e70';
  const art =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="' +
    bg +
    '"/><text x="58" y="90" font-family="Arial, sans-serif" font-size="50" font-weight="700" fill="' +
    fg +
    '">Sidequest<tspan fill="#39b697">.</tspan></text><text x="60" y="139" font-family="Arial, sans-serif" font-size="23" fill="' +
    quiet +
    '">Quick games in one compact sidebar.</text><path d="M60 929h1480" stroke="' +
    quiet +
    '" opacity=".25"/><text x="60" y="967" font-family="Arial, sans-serif" font-size="18" fill="' +
    quiet +
    '">Keyboard and touch controls · Separate saved progress · Pick up where you left off</text></svg>';
  const composites = [];
  let i = 0;
  for (const id of Object.keys(fixtures)) {
    composites.push({
      input: await sharp(new URL(theme + '-' + id + '.png', capture).pathname)
        .resize(280, 752)
        .png()
        .toBuffer(),
      left: 58 + i++ * 300,
      top: 165,
    });
  }
  await writeFile(new URL('source/screenshot-' + theme + '.svg', output), art);
  await sharp(Buffer.from(art))
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(new URL('screenshot-' + theme + '.png', output).pathname);
}
console.log('Release screenshots created.');
