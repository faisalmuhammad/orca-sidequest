import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_KEY, createSaveStore, normalizeSave, emptySave } from '../panel/storage.mjs';
import { create2048, isValid2048 } from '../panel/games/2048.mjs';
import { createSudoku, isValidSudoku } from '../panel/games/sudoku.mjs';
import { createMinesweeper, revealMine, isValidMinesweeper } from '../panel/games/minesweeper.mjs';
import { createLights, moveLights, isValidLights } from '../panel/games/lights.mjs';
import { createNonogram, isValidNonogram } from '../panel/games/nonograms.mjs';
import { createCodebreaker, enterCode, isValidCodebreaker } from '../panel/games/codebreaker.mjs';
import { createSliding, isValidSliding } from '../panel/games/sliding.mjs';
import { createConnect, dropConnect, isValidConnect } from '../panel/games/connect.mjs';
import { createSokoban, moveSokoban, isValidSokoban } from '../panel/games/sokoban.mjs';

function journal() { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key,value) => map.set(key,value) }; }
const validators = { '2048': isValid2048, sudoku: isValidSudoku, minesweeper: isValidMinesweeper, lights: isValidLights, nonograms:isValidNonogram, codebreaker:isValidCodebreaker, sliding:isValidSliding, connect:isValidConnect, sokoban:isValidSokoban };

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
  const restored=normalizeSave(original,validators).save;assert.deepEqual(restored.games['2048'],original.games['2048']);assert.equal(restored.games.checkers,null);assert.equal(restored.games.minesweeper,null);assert.equal(restored.games.lights,null);assert.deepEqual(restored.preferences,{sound:false,numberFirst:false,libraryView:'compact',sortOrder:'recommended'});
  assert.deepEqual(normalizeSave({...original,preferences:{sound:true,numberFirst:true}},validators).save.preferences,{sound:true,numberFirst:true,libraryView:'compact',sortOrder:'recommended'});
});
test('new games and library density round-trip without disturbing existing saves',()=> {
  const value=emptySave(); value.activeGame='lights'; value.games['2048']=create2048();
  value.games.minesweeper=revealMine(createMinesweeper(),0); value.games.lights=moveLights(createLights(),0); value.preferences.libraryView='expanded';
  assert.deepEqual(normalizeSave(JSON.parse(JSON.stringify(value)),validators).save,value);
  assert.equal(normalizeSave({...value,preferences:{libraryView:'unknown'}},validators).save.preferences.libraryView,'compact');
  const corrupt={...value,games:{...value.games,lights:{...value.games.lights,size:99}}};
  const restored=normalizeSave(corrupt,validators); assert.deepEqual(restored.recovered,['lights']); assert.equal(restored.save.activeGame,null);
  assert.deepEqual(restored.save.games.minesweeper,value.games.minesweeper); assert.deepEqual(restored.save.games['2048'],value.games['2048']);
});
test('all later games round-trip and a corrupt replay resets only its own slot',()=>{
  const value=emptySave();value.activeGame='codebreaker';value.games.nonograms=createNonogram();value.games.codebreaker=enterCode(createCodebreaker(),0,2);value.games.sliding=createSliding();value.games.connect=dropConnect(createConnect(),3);
  assert.deepEqual(normalizeSave(JSON.parse(JSON.stringify(value)),validators).save,value);
  const restored=normalizeSave({...value,games:{...value.games,connect:{...value.games.connect,history:[]}}},validators);
  assert.deepEqual(restored.recovered,['connect']);assert.equal(restored.save.activeGame,'codebreaker');assert.deepEqual(restored.save.games.sliding,value.games.sliding);
});
test('Sokoban progress round-trips while older libraries migrate with an empty slot',()=>{
  const value=emptySave();value.games['2048']=create2048();value.games.sokoban=moveSokoban(createSokoban(),'right');value.activeGame='sokoban';
  assert.deepEqual(normalizeSave(JSON.parse(JSON.stringify(value)),validators).save,value);
  const older=structuredClone(value);delete older.games.sokoban;older.activeGame='2048';
  const migrated=normalizeSave(older,validators).save;assert.equal(migrated.games.sokoban,null);assert.deepEqual(migrated.games['2048'],value.games['2048']);
  const corrupt=normalizeSave({...value,games:{...value.games,sokoban:{...value.games.sokoban,player:0}}},validators);assert.deepEqual(corrupt.recovered,['sokoban']);assert.equal(corrupt.save.activeGame,null);assert.deepEqual(corrupt.save.games['2048'],value.games['2048']);
});
