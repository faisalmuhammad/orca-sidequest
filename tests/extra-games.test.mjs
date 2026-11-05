import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCheckers,
  checkersMoves,
  moveCheckers,
  undoCheckers,
  chooseCheckersMove,
  isValidCheckers,
} from '../panel/games/checkers.mjs';
import {
  createBlocks,
  blockCells,
  fitsBlock,
  translateBlock,
  rotateBlock,
  hardDropBlock,
  holdBlock,
  lockBlock,
  isValidBlocks,
} from '../panel/games/blocks.mjs';
import {
  createMemory,
  flipMemory,
  isValidMemory,
} from '../panel/games/memory.mjs';
const position = (pieces, other = {}) => ({
  ...createCheckers('local'),
  board: Array.from({ length: 64 }, (_, i) => pieces[i] ?? 0),
  ...other,
});
test('checkers forces captures, chains jumps, and undoes the whole turn', () => {
  const start = position({ 42: 1, 33: -1, 17: -1, 5: -1, 46: 1 });
  assert.deepEqual(checkersMoves(start), [{ from: 42, to: 24, capture: 33 }]);
  let s = moveCheckers(start, 42, 24);
  assert.equal(s.turn, 1);
  assert.equal(s.forced, 24);
  assert.equal(moveCheckers(s, 46, 37), s);
  s = moveCheckers(s, 24, 10);
  assert.equal(s.turn, -1);
  assert.equal(s.moves, 1);
  assert.equal(s.board[33], 0);
  assert.equal(s.board[17], 0);
  assert.deepEqual(undoCheckers(s), start);
  assert.ok(isValidCheckers(s));
});
test('checkers crowning ends the capture turn and detects a blocked opponent', () => {
  const s = moveCheckers(position({ 17: 1, 10: -1, 12: -1 }), 17, 3);
  assert.equal(s.board[3], 2);
  assert.equal(s.forced, null);
  assert.equal(s.turn, -1);
  assert.equal(moveCheckers(position({ 42: 1, 33: -1 }), 42, 24).result, 1);
  assert.equal(
    isValidCheckers({ ...createCheckers(), board: Array(64).fill(1) }),
    false,
  );
});
test('computer chooses legal moves, and undo returns control to the human', () => {
  let s = createCheckers();
  assert.ok(isValidCheckers(s));
  const human = checkersMoves(s)[0];
  s = moveCheckers(s, human.from, human.to);
  const ai = chooseCheckersMove(s, () => 0);
  assert.ok(checkersMoves(s).some((m) => m.from === ai.from && m.to === ai.to));
  s = moveCheckers(s, ai.from, ai.to);
  assert.deepEqual(undoCheckers(s), createCheckers());
});
test('falling blocks clears completed rows and preserves best score', () => {
  let s = {
    ...createBlocks(1000, () => 0),
    paused: false,
    active: { type: 'O', rotation: 0, x: 4, y: 18 },
  };
  for (let y = 18; y < 20; y++)
    for (let x = 0; x < 10; x++)
      if (x !== 4 && x !== 5) s.board[y * 10 + x] = 1;
  s = lockBlock(s, () => 0);
  assert.equal(s.lines, 2);
  assert.equal(s.score, 300);
  assert.equal(s.best, 1000);
  assert.equal(s.board.filter(Boolean).length, 0);
  assert.ok(isValidBlocks(s));
});
test('rotation kicks away from walls and hold is limited to once per piece', () => {
  let s = {
    ...createBlocks(0, () => 0),
    paused: false,
    active: { type: 'T', rotation: 1, x: -1, y: 3 },
  };
  assert.ok(fitsBlock(s.board, s.active));
  s = rotateBlock(s);
  assert.equal(s.active.rotation, 2);
  assert.ok(s.active.x >= 0);
  const original = s.active.type;
  s = holdBlock(s, () => 0);
  assert.equal(s.hold, original);
  assert.equal(holdBlock(s), s);
  s = hardDropBlock(s, () => 0);
  assert.equal(s.holdUsed, false);
  assert.equal(s.pieces, 1);
  assert.ok(isValidBlocks(s));
});
test('blocks pauses all inputs and ends when a piece locks above the board', () => {
  const s = createBlocks(0, () => 0);
  assert.equal(translateBlock(s, 1, 0), s);
  assert.equal(hardDropBlock(s), s);
  const over = lockBlock({
    ...s,
    paused: false,
    active: { type: 'O', x: 4, y: -2, rotation: 0 },
  });
  assert.equal(over.over, true);
  assert.equal(isValidBlocks({ ...s, active: { ...s.active, x: 100 } }), false);
  assert.equal(blockCells({ type: 'I', x: 3, y: 0, rotation: 1 }).length, 4);
});
test('memory ignores duplicate flips, counts guesses, and completes only matched pairs', () => {
  let s = {
    ...createMemory(null, () => 0),
    cards: [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7],
    phase: 'play',
  };
  s = flipMemory(s, 0);
  assert.equal(flipMemory(s, 0), s);
  s = flipMemory(s, 1);
  assert.equal(s.attempts, 1);
  assert.equal(s.matched.length, 0);
  assert.equal(flipMemory(s, 2), s);
  s = { ...s, open: [] };
  for (let i = 0; i < 8; i++) {
    s = flipMemory(s, i);
    s = flipMemory(s, i + 8);
  }
  assert.equal(s.phase, 'complete');
  assert.equal(s.attempts, 9);
  assert.equal(s.best, 9);
  assert.ok(isValidMemory(s));
  assert.equal(flipMemory(s, 0), s);
  assert.equal(isValidMemory({ ...s, matched: [0, 1] }), false);
});
