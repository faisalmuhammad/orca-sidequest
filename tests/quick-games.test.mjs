import test from 'node:test';
import assert from 'node:assert/strict';
import { MINE_DIFFICULTIES, createMinesweeper, revealMine, flagMine, chordMine, mineNeighbors, mineCountAt, isValidMinesweeper } from '../panel/games/minesweeper.mjs';
import { createLights, moveLights, undoLights, solveLights, isLightsComplete, isValidLights } from '../panel/games/lights.mjs';
const random = seed => () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };

test('Minesweeper protects the first reveal and all its neighbors at every difficulty', () => {
  for (const difficulty of Object.keys(MINE_DIFFICULTIES)) for (const index of [0, 7, MINE_DIFFICULTIES[difficulty].size ** 2 - 1]) {
    const initial = createMinesweeper(null, difficulty), s = revealMine(initial, index, random(index + 10));
    assert.equal(s.mines.filter(Boolean).length, s.mineCount);
    assert.ok([index, ...mineNeighbors(index, s.size)].every(i => s.mines[i] === 0 && s.revealed[i]));
    assert.notEqual(s.result, 'lost'); assert.ok(isValidMinesweeper(s));
    assert.equal(initial.started, false);
  }
});
test('flags work before planting, block reveals, and can be removed', () => {
  const s = createMinesweeper(), flagged = flagMine(s, 0);
  assert.equal(flagged.flags[0], true); assert.equal(flagged.started, false);
  assert.equal(revealMine(flagged, 0), flagged); assert.ok(isValidMinesweeper(flagged));
  assert.deepEqual(flagMine(flagged, 0), s);
  const open = revealMine(s, 0, random(5));
  assert.equal(flagMine(open, 0), open);
  assert.equal(revealMine(s, -1), s); assert.equal(flagMine(s, 64), s);
});
test('Minesweeper numbers do not wrap across board edges', () => {
  const s = createMinesweeper(null, 'quick'); s.mines[5] = 1; s.mines[6] = 1;
  assert.equal(mineCountAt(s, 0), 1); assert.equal(mineCountAt(s, 4), 1);
  assert.deepEqual(mineNeighbors(0, 6).sort((a,b) => a-b), [1,6,7]);
});
test('Minesweeper flood reveal stops at numbers and preserves flags', () => {
  let s = revealMine(createMinesweeper(), 0, random(19));
  const coveredSafe = s.revealed.findIndex((open,i) => !open && !s.mines[i]);
  s = flagMine(s, coveredSafe);
  for (let i = 0; i < s.mines.length; i++) if (!s.mines[i] && !s.revealed[i] && i !== coveredSafe) s = revealMine(s, i);
  assert.equal(s.revealed[coveredSafe], false); assert.equal(s.result, null);
  s = revealMine(flagMine(s, coveredSafe), coveredSafe);
  assert.equal(s.result, 'won'); assert.ok(isValidMinesweeper(s));
});
test('Minesweeper chords open safe neighbors only when the flag count matches', () => {
  let s = revealMine(createMinesweeper(), 0, random(7));
  const index = s.revealed.findIndex((open,i) => open && mineCountAt(s,i) > 0 && mineNeighbors(i,s.size).some(j => !s.revealed[j] && !s.mines[j]));
  assert.ok(index >= 0); assert.equal(chordMine(s, index), s);
  for (const i of mineNeighbors(index,s.size)) if (s.mines[i]) s = flagMine(s,i);
  const next = chordMine(s,index);
  assert.ok(next.revealed.filter(Boolean).length > s.revealed.filter(Boolean).length);
  assert.notEqual(next.result,'lost'); assert.ok(isValidMinesweeper(next));
});
test('an incorrect but matching flag count can lose a Minesweeper chord', () => {
  let s = revealMine(createMinesweeper(), 0, random(7));
  const index = s.revealed.findIndex((open,i) => open && mineCountAt(s,i) === 1 && mineNeighbors(i,s.size).some(j => !s.revealed[j] && !s.mines[j]));
  const wrong = mineNeighbors(index,s.size).find(i => !s.revealed[i] && !s.mines[i]);
  s = chordMine(flagMine(s,wrong),index);
  assert.equal(s.result,'lost'); assert.ok(isValidMinesweeper(s));
  assert.equal(revealMine(s,0),s);
});
test('Minesweeper tracks independent difficulty records and rejects corrupt saves', () => {
  let s = { ...revealMine(createMinesweeper(null,'quick'),0,random(22)), elapsedMs: 12345 };
  for (let i = 0; i < s.mines.length; i++) if (!s.mines[i]) s = revealMine(s,i);
  assert.equal(s.result,'won'); assert.equal(s.best.quick,12345);
  const next = createMinesweeper(s,'classic'); assert.equal(next.best.quick,12345); assert.equal(next.best.classic,null);
  assert.ok(isValidMinesweeper(JSON.parse(JSON.stringify(s))));
  assert.equal(isValidMinesweeper({...s,mines:Array(36).fill(0)}),false);
  assert.equal(isValidMinesweeper({...s,result:null}),false);
  assert.equal(isValidMinesweeper({...next,elapsedMs:-1}),false);
});
test('Minesweeper records loss and preserves the best score on replay', () => {
  const s = revealMine(createMinesweeper(),0,random(31)), mine = s.mines.findIndex(Boolean);
  const lost = revealMine(s,mine);
  assert.equal(lost.result,'lost'); assert.equal(lost.exploded,mine); assert.ok(isValidMinesweeper(lost));
  assert.equal(flagMine(lost,1),lost); assert.equal(isValidMinesweeper({...lost,exploded:null}),false);
});
test('generated Lights Out puzzles are nonempty and solvable across random seeds', () => {
  for (const difficulty of ['quick','classic']) for (let seed = 1; seed <= 40; seed++) {
    let s = createLights(null,difficulty,random(seed)); const initial = s;
    assert.ok(s.board.some(Boolean)); assert.ok(isValidLights(s));
    const solution = solveLights(s.board,s.size); assert.ok(solution.length);
    for (const index of solution) s = moveLights(s,index);
    assert.ok(isLightsComplete(s)); assert.equal(s.moves,solution.length); assert.ok(isValidLights(s));
    assert.equal(initial.moves,0);
  }
});
test('Lights Out taps toggle a cross without wrapping at an edge', () => {
  const s = createLights(null,'quick',random(44)), next = moveLights(s,3);
  assert.deepEqual(next.board.flatMap((n,i) => n !== s.board[i] ? [i] : []),[2,3,7]);
  assert.deepEqual(undoLights(next).board,s.board);
  assert.equal(moveLights(s,-1),s); assert.equal(moveLights(s,16),s);
});
test('Lights Out solver returns shortest hints and identifies unreachable boards', () => {
  const singleCross = Array(16).fill(0); for (const i of [1,4,5,6,9]) singleCross[i] = 1;
  assert.deepEqual(solveLights(singleCross,4),[5]);
  assert.deepEqual(solveLights(Array(25).fill(0),5),[]);
  const impossible = Array(25).fill(0); impossible[0] = 1;
  assert.equal(solveLights(impossible,5),null);
});
test('Lights Out undo restores the board and move count while preserving a win record', () => {
  let s = createLights(null,'quick',random(62));
  for (const i of solveLights(s.board,s.size)) s = moveLights(s,i);
  const moves = s.moves, undone = undoLights(s);
  assert.equal(undone.moves,moves-1); assert.equal(undone.best.quick,moves);
  assert.equal(isLightsComplete(undone),false); assert.ok(isValidLights(undone));
  assert.equal(moveLights(s,0),s);
});
test('Lights Out retains valid bounded history after a long game and repeated undo', () => {
  let s = createLights(null,'classic',random(99));
  for (let i=0;i<110;i++) s = moveLights(s,0);
  assert.equal(s.history.length,100); assert.ok(isValidLights(s));
  for (let i=0;i<100;i++) { s=undoLights(s); assert.ok(isValidLights(s)); }
  assert.equal(s.moves,10); assert.equal(undoLights(s),s);
});
test('Lights Out rejects corrupt dimensions, history, and unsolvable saves', () => {
  const s = createLights(null,'classic',random(72));
  assert.ok(isValidLights(JSON.parse(JSON.stringify(s))));
  assert.equal(isValidLights({...s,size:4}),false);
  assert.equal(isValidLights({...s,board:Array(25).fill(1)}),false);
  const moved = moveLights(s,4);
  assert.equal(isValidLights({...moved,history:[{board:s.board,moves:9}]}),false);
  assert.equal(isValidLights({...s,best:{quick:-1,classic:null}}),false);
});
