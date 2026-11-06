import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOOD_DIFFICULTIES, FLOOD_COLORS, floodRegion,
  createFlood, pickFlood, isValidFlood,
} from '../panel/games/flood.mjs';

const random = seed => () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };

test('createFlood generates a board matching the difficulty', () => {
  const s = createFlood(null, 'quick', random(1));
  assert.equal(s.size, 10);
  assert.equal(s.board.length, 100);
  assert.equal(s.maxMoves, 20);
  assert.equal(s.difficulty, 'quick');
  assert.equal(s.moves, 0);
  assert.equal(s.result, null);
  assert.deepEqual(s.best, { quick: null, classic: null });
  assert.ok(s.board.every(c => c >= 0 && c <= 5));
  assert.ok(isValidFlood(s));
});

test('createFlood defaults to classic', () => {
  const s = createFlood(null, undefined, random(2));
  assert.equal(s.size, 14);
  assert.equal(s.maxMoves, 25);
  assert.equal(s.difficulty, 'classic');
  assert.ok(isValidFlood(s));
});

test('createFlood carries best from previous game', () => {
  const old = { best: { quick: 15, classic: null }, difficulty: 'quick' };
  const s = createFlood(old, undefined, random(3));
  assert.equal(s.difficulty, 'quick'); // carries old difficulty
  assert.deepEqual(s.best, { quick: 15, classic: null });
  assert.ok(isValidFlood(s));
});

test('createFlood never generates a solved board', () => {
  // Use a random seed and check many boards
  for (let seed = 0; seed < 50; seed++) {
    const s = createFlood(null, 'quick', random(seed));
    assert.ok(!s.board.every(c => c === s.board[0]), `Seed ${seed} produced a solved board`);
  }
});

test('floodRegion finds the connected region from index 0', () => {
  // 3×3 board: top-left 2×2 is color 0, rest is color 1
  const board = [0,0,1, 0,0,1, 1,1,1];
  const region = floodRegion(board, 3);
  assert.deepEqual(region, new Set([0, 1, 3, 4]));
});

test('floodRegion single cell', () => {
  const board = [0,1,1, 1,1,1, 1,1,1];
  const region = floodRegion(board, 3);
  assert.deepEqual(region, new Set([0]));
});

test('floodRegion whole board same color', () => {
  const board = Array(9).fill(3);
  const region = floodRegion(board, 3);
  assert.equal(region.size, 9);
});

test('pickFlood fills the flood region with the new color', () => {
  const s = createFlood(null, 'quick', random(10));
  const oldColor = s.board[0];
  // Find a color different from the current one
  const newColor = (oldColor + 1) % 6;
  const next = pickFlood(s, newColor);
  assert.notEqual(next, s);
  assert.equal(next.moves, 1);
  assert.equal(next.board[0], newColor);
  // All cells that were in the flood region now have the new color
  const oldRegion = floodRegion(s.board, s.size);
  for (const i of oldRegion) assert.equal(next.board[i], newColor);
  assert.ok(isValidFlood(next));
});

test('pickFlood returns same ref when picking the current flood color', () => {
  const s = createFlood(null, 'quick', random(11));
  assert.equal(pickFlood(s, s.board[0]), s);
});

test('pickFlood returns same ref after game over', () => {
  let s = createFlood(null, 'quick', random(12));
  s = { ...s, result: 'won' };
  assert.equal(pickFlood(s, 0), s);
  s = { ...s, result: 'lost' };
  assert.equal(pickFlood(s, 0), s);
});

test('pickFlood rejects invalid color indices', () => {
  const s = createFlood(null, 'quick', random(13));
  assert.equal(pickFlood(s, -1), s);
  assert.equal(pickFlood(s, 6), s);
  assert.equal(pickFlood(s, 1.5), s);
  assert.equal(pickFlood(s, 'red'), s);
});

test('pickFlood detects a win when the entire board is one color', () => {
  // Create a board that's almost solved: all one color except one cell
  const board = Array(100).fill(0);
  board[99] = 1;
  const s = { board, size: 10, moves: 0, maxMoves: 20, difficulty: 'quick', result: null, best: { quick: null, classic: null } };
  // Picking color 1 should NOT win — only the flood region (all 0s connected to index 0) gets painted
  // Actually, cell 99 is color 1 and not connected to the 0-region, so picking 1 paints region to 1
  // Then the region is all of 0..98 (all color 0), painting to 1 makes entire board 1 → win
  const next = pickFlood(s, 1);
  assert.equal(next.result, 'won');
  assert.equal(next.best.quick, 1);
  assert.ok(isValidFlood(next));
});

test('pickFlood detects a loss when maxMoves is reached', () => {
  // Board with 2 non-adjacent colors, 1 move left
  const board = [0,1,0,1, 1,0,1,0, 0,1,0,1, 1,0,1,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
    0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
  const s = { board, size: 10, moves: 19, maxMoves: 20, difficulty: 'quick', result: null, best: { quick: null, classic: null } };
  // Pick color 1 — won't solve it (checkerboard in top rows)
  const next = pickFlood(s, 1);
  assert.equal(next.moves, 20);
  // The board won't be uniform, so it should be a loss
  assert.equal(next.result, 'lost');
  assert.ok(isValidFlood(next));
});

test('best updates only on win and improves', () => {
  // Manual win scenario
  const board = Array(100).fill(0);
  board[99] = 1;
  const s = { board, size: 10, moves: 5, maxMoves: 20, difficulty: 'quick', result: null, best: { quick: null, classic: null } };
  const next = pickFlood(s, 1);
  assert.equal(next.best.quick, 6); // 5 + 1

  // Second win with more moves — best stays
  const board2 = Array(100).fill(0);
  board2[99] = 2;
  const s2 = { board: board2, size: 10, moves: 10, maxMoves: 20, difficulty: 'quick', result: null, best: { quick: 6, classic: null } };
  const next2 = pickFlood(s2, 2);
  assert.equal(next2.best.quick, 6); // 11 is worse than 6

  // Third win with fewer moves — best improves
  const board3 = Array(100).fill(0);
  board3[99] = 3;
  const s3 = { board: board3, size: 10, moves: 2, maxMoves: 20, difficulty: 'quick', result: null, best: { quick: 6, classic: null } };
  const next3 = pickFlood(s3, 3);
  assert.equal(next3.best.quick, 3);
});

test('FLOOD_COLORS has 6 entries', () => {
  assert.equal(FLOOD_COLORS.length, 6);
});

test('FLOOD_DIFFICULTIES has quick and classic', () => {
  assert.ok(FLOOD_DIFFICULTIES.quick);
  assert.ok(FLOOD_DIFFICULTIES.classic);
  assert.equal(FLOOD_DIFFICULTIES.quick.size, 10);
  assert.equal(FLOOD_DIFFICULTIES.classic.size, 14);
});

test('isValidFlood rejects tampered states', () => {
  const s = createFlood(null, 'quick', random(20));
  assert.ok(isValidFlood(s));
  // Bad difficulty
  assert.ok(!isValidFlood({ ...s, difficulty: 'hard' }));
  // Bad board length
  assert.ok(!isValidFlood({ ...s, board: [0, 1, 2] }));
  // Bad board value
  assert.ok(!isValidFlood({ ...s, board: s.board.map(() => 7) }));
  // Bad size
  assert.ok(!isValidFlood({ ...s, size: 8 }));
  // Bad moves
  assert.ok(!isValidFlood({ ...s, moves: -1 }));
  assert.ok(!isValidFlood({ ...s, moves: 21 })); // > maxMoves for quick
  // Bad result
  assert.ok(!isValidFlood({ ...s, result: 'draw' }));
  // Won but board not uniform
  assert.ok(!isValidFlood({ ...s, result: 'won' }));
  // Bad best
  assert.ok(!isValidFlood({ ...s, best: null }));
  assert.ok(!isValidFlood({ ...s, best: { quick: -5, classic: null } }));
  // Null
  assert.ok(!isValidFlood(null));
  assert.ok(!isValidFlood(42));
});
