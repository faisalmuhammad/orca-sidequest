// Export the library's actual card artwork for the README. No image dependencies.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, copyFile } from 'node:fs/promises';
import { emptySave, SAVE_KEY } from '../panel/storage.mjs';

const run = promisify(execFile);
const cli = process.env.ORCA_CLI_COMMAND ?? 'orca';
const url = `http://127.0.0.1:${process.env.SIDEQUEST_PREVIEW_PORT ?? 4318}/`;
const output = new URL('../assets/games/', import.meta.url);
const requested = process.argv.includes('--games') ? new Set(process.argv[process.argv.indexOf('--games') + 1].split(',')) : null;
await mkdir(output, { recursive: true });
async function command(...args) {
  const { stdout } = await run(cli, [...args, '--json'], { maxBuffer: 2 ** 20, timeout: 60000 });
  const value = JSON.parse(stdout);
  if (!value.ok) throw new Error(JSON.stringify(value.error));
  if (value.result?.effects?.consoleErrors?.length) throw new Error(JSON.stringify(value.result.effects.consoleErrors));
  return value.result;
}
const page = (await command('tab', 'create', '--url', url)).browserPageId;
const act = (...args) => command(...args, '--page', page);
async function evaluate(expression) {
  const result = await act('eval', '--expression', `JSON.stringify(${expression})`);
  return typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
}
let original, capturedOriginal = false;
try {
  await act('wait', '--selector', '#app[aria-busy=false]');
  original = await evaluate(`localStorage.getItem(${JSON.stringify(SAVE_KEY)})`);
  capturedOriginal = true;
  const save = { ...emptySave(), preferences: { ...emptySave().preferences, libraryView: 'expanded' } };
  const raw = JSON.stringify(save);
  // Freeze old-document writes while loading the clean sample library.
  await evaluate(`(() => { const put = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { return put.call(this, key, key === ${JSON.stringify(SAVE_KEY)} ? ${JSON.stringify(raw)} : value); }; localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(raw)}); return true; })()`);
  await act('reload');
  await act('viewport', '--width', '400', '--height', '112');
  await act('wait', '--selector', '#game-library');
  const cards = await evaluate(`(() => {
    document.documentElement.className = 'dark';
    window.__galleryCards = [...document.querySelectorAll('.game-card')].map(card => ({ id: card.dataset.game, name: card.querySelector('.card-title').textContent, art: card.querySelector('.card-preview').cloneNode(true) }));
    document.getElementById('app').hidden = true;
    document.body.style.margin = '0';
    const frame = document.createElement('div'); frame.id = 'gallery-art'; frame.className = 'game-card';
    Object.assign(frame.style, { width: '400px', height: '112px', borderRadius: '14px', transform: 'none' });
    document.body.append(frame);
    return window.__galleryCards.map(({id, name}) => ({id, name}));
  })()`);
  if (!cards.length) throw new Error('No game cards were found.');
  if (requested) for (const id of requested) if (!cards.some(card => card.id === id)) throw new Error('Unknown game: ' + id);
  for (const { id, name } of cards.filter(card => !requested || requested.has(card.id))) {
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid game card id.');
    await evaluate(`(() => { const frame = document.getElementById('gallery-art'); frame.replaceChildren(window.__galleryCards.find(card => card.id === ${JSON.stringify(id)}).art); return true; })()`);
    const shot = await act('screenshot');
    await copyFile(shot.path, new URL(id + '.png', output));
    console.log('Captured ' + name);
  }
} finally {
  try {
    if (capturedOriginal) await evaluate(`(() => { const put = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key !== ${JSON.stringify(SAVE_KEY)}) return put.call(this, key, value); }; const raw = ${JSON.stringify(original)}; if (raw === null) localStorage.removeItem(${JSON.stringify(SAVE_KEY)}); else put.call(localStorage, ${JSON.stringify(SAVE_KEY)}, raw); return true; })()`);
  } finally { await command('tab', 'close', '--page', page); }
}
console.log('README game artwork created.');
