import test from 'node:test';
import assert from 'node:assert/strict';
import { slideLine, slideBoard, spawnTile, create2048, move2048, undo2048, is2048Over, isValid2048 } from '../panel/games/2048.mjs';

test('tiles merge once per move, in travel order, and skip empty cells', () => {
  assert.deepEqual(slideLine([2,2,2,2]), { line: [4,4,0,0], score: 8, merged: [0,1] });
  assert.deepEqual(slideLine([2,2,4,0]).line, [4,4,0,0]);
  assert.deepEqual(slideLine([0,4,0,4]), { line: [8,0,0,0], score: 8, merged: [0] });
  assert.deepEqual(slideLine([4,4,4,0]).line, [8,4,0,0]);
});

test('all four directions merge toward the requested edge without crossing rows', () => {
  const board = [2,2,0,0, 2,4,0,0, 0,0,8,0, 0,0,8,0];
  assert.deepEqual(slideBoard(board, 'left').board, [4,0,0,0, 2,4,0,0, 8,0,0,0, 8,0,0,0]);
  assert.deepEqual(slideBoard(board, 'right').board, [0,0,0,4, 0,0,2,4, 0,0,0,8, 0,0,0,8]);
  assert.deepEqual(slideBoard(board, 'up').board, [4,2,16,0, 0,4,0,0, 0,0,0,0, 0,0,0,0]);
  assert.deepEqual(slideBoard(board, 'down').board, [0,0,0,0, 0,0,0,0, 0,2,0,0, 4,4,16,0]);
  assert.equal(slideBoard(board, 'up').score, 20);
  assert.deepEqual(board, [2,2,0,0, 2,4,0,0, 0,0,8,0, 0,0,8,0]);
});

test('legal moves add exactly one tile, invalid moves consume no randomness', () => {
  const state = { ...create2048(20, () => 0), board: [2,...Array(15).fill(0)] };
  const invalid = move2048(state, 'left', () => { throw new Error('Must not spawn'); });
  assert.equal(invalid.state, state);
  assert.equal(invalid.changed, false);
  const result = move2048(state, 'right', () => 0);
  assert.equal(result.state.board.reduce((sum, value) => sum + value), 4);
  assert.equal(result.state.board.filter(Boolean).length, 2);
  assert.equal(result.state.moves, 1);
  assert.equal(result.state.best, 20);
  assert.equal(isValid2048(result.state), true);
});

test('undo restores score and board, preserves personal best, and cannot be repeated', () => {
  const state = { ...create2048(0, () => 0), board: [2,2,...Array(14).fill(0)] };
  const moved = move2048(state, 'left', () => 0).state;
  assert.equal(moved.score, 4);
  const undone = undo2048(moved);
  assert.deepEqual(undone.board, state.board);
  assert.equal(undone.score, 0);
  assert.equal(undone.best, 4);
  assert.equal(undo2048(undone), undone);
});

test('game over requires a full board with no horizontal or vertical merge', () => {
  const board = [2,4,2,4, 4,2,4,2, 2,4,2,4, 4,2,4,2];
  assert.equal(is2048Over(board), true);
  assert.equal(is2048Over(board.with(0, 0)), false);
  assert.equal(is2048Over(board.with(1, 2)), false);
  assert.equal(is2048Over(board.with(4, 2)), false);
  assert.equal(spawnTile(board).spawned, -1);
});

test('saved boards reject corrupt tiles and counters', () => {
  const state = create2048(0, () => 0);
  assert.equal(isValid2048(state), true);
  for (const value of [1,3,-2,NaN,Infinity]) assert.equal(isValid2048({ ...state, board: state.board.with(0, value) }), false);
  assert.equal(isValid2048({ ...state, score: -1 }), false);
  assert.equal(isValid2048({ ...state, previous: {} }), false);
});

test('sliding conserves tile mass over many board configurations', () => {
  let seed = 17;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let trial = 0; trial < 150; trial++) {
    const board = Array.from({ length: 16 }, () => random() < .35 ? 0 : 2 ** (1 + Math.floor(random() * 8)));
    for (const direction of ['left','right','up','down']) {
      const result = slideBoard(board, direction);
      assert.equal(result.board.reduce((a,b) => a+b), board.reduce((a,b) => a+b));
      assert.ok(result.board.filter(Boolean).length <= board.filter(Boolean).length);
    }
  }
});

test('animation traces include both merge sources and preserve travel direction',()=> {
  const board=[2,0,2,4,...Array(12).fill(0)];
  const result=slideBoard(board,'right');
  assert.deepEqual(result.movements.map(m=>[m.from,m.to]),[[3,3],[2,2],[0,2]]);
  assert.equal(result.movements.filter(m=>m.to===2&&m.merge).length,2);
});
