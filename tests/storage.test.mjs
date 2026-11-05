import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_KEY, createSaveStore, normalizeSave, emptySave } from '../panel/storage.mjs';
import { create2048, isValid2048 } from '../panel/games/2048.mjs';
import { createSudoku, isValidSudoku } from '../panel/games/sudoku.mjs';

function journal() { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key,value) => map.set(key,value) }; }
const validators = { '2048': isValid2048, sudoku: isValidSudoku };

test('a corrupt game does not discard the other game', () => {
  const blocks = create2048();
  const value = { ...emptySave(), activeGame: 'sudoku', games: { '2048': blocks, sudoku: { values: [4] } } };
  const restored = normalizeSave(value, validators);
  assert.deepEqual(restored.save.games['2048'], blocks);
  assert.equal(restored.save.games.sudoku, null);
  assert.equal(restored.save.activeGame, null);
  assert.deepEqual(restored.recovered, ['sudoku']);
});

test('complete sessions round-trip with separate game progress', () => {
  const value = { ...emptySave(), activeGame: 'sudoku', games: { ...emptySave().games, '2048': create2048(), sudoku: createSudoku() } };
  assert.deepEqual(normalizeSave(JSON.parse(JSON.stringify(value)), validators).save, value);
  assert.deepEqual(normalizeSave({ version: 2, games: {} }, validators).save, emptySave());
});

test('slow writes are serialized and pending snapshots coalesce to the newest value', async () => {
  const calls = []; let release;
  const storage = { set: async (_key,value) => { calls.push(value); if (calls.length === 1) await new Promise(resolve => { release = resolve; }); } };
  const local = journal();
  const store = createSaveStore({ storage, journal: local });
  const value = emptySave();
  void store.save({ ...value, marker: 1 });
  await Promise.resolve();
  void store.save({ ...value, marker: 2 });
  void store.save({ ...value, marker: 3 });
  assert.equal(JSON.parse(local.getItem(SAVE_KEY)).marker, 3);
  release();
  await store.flush();
  assert.deepEqual(calls.map(value => value.marker), [1,3]);
  assert.ok(calls[1].updatedAt > calls[0].updatedAt);
});

test('a newer synchronous journal restores progress when the host write was interrupted', async () => {
  const local = journal();
  const primary = { ...emptySave(), updatedAt: 10, activeGame: null };
  const latest = { ...emptySave(), updatedAt: 11, activeGame: '2048', games: { '2048': create2048(), sudoku: null } };
  local.setItem(SAVE_KEY, JSON.stringify(latest));
  const store = createSaveStore({ storage: { get: async () => primary }, journal: local });
  assert.deepEqual(await store.load(), latest);
});

test('storage failures retain device progress and are reported, without unhandled rejection', async () => {
  const statuses = []; const local = journal();
  const store = createSaveStore({ storage: { set: async () => { throw new Error('Unavailable'); } }, journal: local, onStatus: value => statuses.push(value) });
  await store.save(emptySave());
  assert.equal(statuses.at(-1), 'local');
  assert.equal(JSON.parse(local.getItem(SAVE_KEY)).version, 1);
  const noStorage = createSaveStore({ onStatus: value => statuses.push(value) });
  await noStorage.save(emptySave());
  assert.equal(statuses.at(-1), 'error');
});

test('older saves gain new game slots without losing sound preferences or progress',()=> {
  const original={version:1,updatedAt:5,activeGame:'2048',games:{'2048':create2048(),sudoku:null}};
  const restored=normalizeSave(original,validators).save;assert.deepEqual(restored.games['2048'],original.games['2048']);assert.equal(restored.games.checkers,null);assert.deepEqual(restored.preferences,{sound:false,numberFirst:false});
  assert.deepEqual(normalizeSave({...original,preferences:{sound:true,numberFirst:true}},validators).save.preferences,{sound:true,numberFirst:true});
});
