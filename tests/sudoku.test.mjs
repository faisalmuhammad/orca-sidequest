import test from 'node:test';
import assert from 'node:assert/strict';
import { countSolutions, createSudoku, peers, sudokuConflicts, enterSudoku, hintSudoku, undoSudoku, isSudokuComplete, isValidSudoku } from '../panel/games/sudoku.mjs';

function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; }; }
const known = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'.split('').map(Number);

test('solver distinguishes unique, impossible and ambiguous puzzles', () => {
  assert.equal(countSolutions(known), 1);
  assert.equal(countSolutions(known.with(1, 5)), 0);
  assert.equal(countSolutions(Array(81).fill(0)), 2);
  assert.equal(countSolutions([0]), 0);
});

test('every generated difficulty has one solution and consistent fixed clues', () => {
  const puzzles = new Set();
  for (const difficulty of ['easy','medium','hard']) {
    for (let seed = 1; seed <= 12; seed++) {
      const state = createSudoku(difficulty, rng(seed));
      assert.equal(countSolutions(state.puzzle), 1, `${difficulty} seed ${seed}`);
      assert.equal(countSolutions(state.solution), 1);
      assert.equal(isValidSudoku(state), true);
      assert.ok(state.puzzle.filter(Boolean).length >= { easy: 40, medium: 34, hard: 28 }[difficulty]);
      assert.ok(state.puzzle.filter(Boolean).length < 50);
      assert.deepEqual(state.values, state.puzzle);
      state.puzzle.forEach((value,i) => { if (value) assert.equal(value, state.solution[i]); });
      puzzles.add(state.puzzle.join(''));
    }
  }
  assert.equal(puzzles.size, 36);
});

test('pencil notes toggle, entries remove matching peer notes, undo restores both', () => {
  let state = createSudoku('hard', rng(5));
  const index = state.values.findIndex((value,i) => !value && peers(i).some(j => !state.values[j]));
  const peer = peers(index).find(i => !state.values[i]);
  const value = state.solution[index];
  state = enterSudoku(state, peer, value, true);
  assert.equal(state.notes[peer], 1 << value);
  const before = state;
  state = enterSudoku(state, index, value);
  assert.equal(state.values[index], value);
  assert.equal(state.notes[peer] & (1 << value), 0);
  const undone = undoSudoku(state);
  assert.deepEqual(undone.values, before.values);
  assert.deepEqual(undone.notes, before.notes);
  state = enterSudoku(before, peer, value, true);
  assert.equal(state.notes[peer], 0);
});

test('fixed clues and complete puzzles cannot be changed by entries', () => {
  const state = createSudoku('easy', rng(3));
  const fixed = state.puzzle.findIndex(Boolean);
  assert.equal(enterSudoku(state, fixed, 0), state);
  assert.equal(enterSudoku(state, -1, 4), state);
  assert.equal(enterSudoku(state, 81, 4), state);
  assert.equal(enterSudoku(state, 0, 10), state);
  const solved = { ...state, values: [...state.solution] };
  assert.equal(isSudokuComplete(solved), true);
  assert.equal(enterSudoku(solved, state.puzzle.findIndex(value => !value), 0), solved);
});

test('hints correct the selected editable cell and can be undone', () => {
  let state = createSudoku('medium', rng(2));
  const index = state.puzzle.findIndex(value => !value);
  state = enterSudoku(state, index, state.solution[index] === 9 ? 1 : 9);
  const hint = hintSudoku(state, index);
  assert.equal(hint.index, index);
  assert.equal(hint.state.values[index], state.solution[index]);
  assert.equal(hint.state.hintsUsed, 1);
  const undone = undoSudoku(hint.state);
  assert.deepEqual(undone.values, state.values);
  assert.equal(undone.hintsUsed, 0);
  assert.equal(isValidSudoku(hint.state), true);
});

test('duplicate entries are marked, and malformed saves are rejected', () => {
  const state = createSudoku('easy', rng(7));
  assert.ok(sudokuConflicts(Array(81).fill(1)).size === 81);
  assert.equal(sudokuConflicts(state.solution).size, 0);
  const fixed = state.puzzle.findIndex(Boolean);
  assert.equal(isValidSudoku({ ...state, values: state.values.with(fixed, 0) }), false);
  assert.equal(isValidSudoku({ ...state, notes: state.notes.with(0, 2 ** 32) }), false);
  assert.equal(isValidSudoku({ ...state, solution: Array(81).fill(1) }), false);
  assert.equal(isValidSudoku({ ...state, elapsedMs: -1 }), false);
});

test('candidate notes undo cleanly, and hints explain only supported deductions',async()=> {
  const {candidates,autoNotesSudoku,hintExplanation,newlyCompletedCells}=await import('../panel/games/sudoku.mjs');
  const s=createSudoku('medium',rng(8)),index=s.values.findIndex(v=>!v);
  const noted=autoNotesSudoku(s);assert.ok(noted.notes.some(Boolean));assert.deepEqual(undoSudoku(noted).notes,s.notes);
  assert.deepEqual(candidates(s.values,index),[1,2,3,4,5,6,7,8,9].filter(v=>!peers(index).some(i=>s.values[i]===v)));
  assert.equal(autoNotesSudoku({...s,paused:true}).notes,s.notes);
  const almost={...s,values:s.solution.with(index,0)};
  assert.match(hintExplanation(almost,index),/Only/);
  assert.match(hintExplanation({...s,values:Array(81).fill(0)},index),/revealed number/);
  const completed=newlyCompletedCells(almost.values,s.solution,s.solution);
  assert.ok(completed.includes(index));assert.ok(completed.length>=9);
  assert.deepEqual(newlyCompletedCells(s.solution,s.solution,s.solution),[]);
});
