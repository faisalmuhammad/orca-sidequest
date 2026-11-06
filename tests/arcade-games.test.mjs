import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnake, stepSnake, turnSnake, isValidSnake } from '../panel/games/snake.mjs';
import { createPipes, rotatePipe, rotateMask, pipeNetwork, hintPipe, undoPipes, isValidPipes } from '../panel/games/pipes.mjs';
import { createBubbles, fireBubble, swapBubbles, undoBubbles, bubbleNeighbors, bubbleCenter, isValidBubbles } from '../panel/games/bubbles.mjs';
import { createReversi, reversiMoves, reversiFlips, moveReversi, undoReversi, chooseReversiMove, isValidReversi } from '../panel/games/reversi.mjs';
import { createBreakout, launchBreakout, steerBreakout, stepBreakout, brickRect, isValidBreakout } from '../panel/games/breakout.mjs';
import { createFlow, beginFlow, extendFlow, finishFlow, hintFlow, undoFlow, isFlowComplete, flowConnected, isValidFlow } from '../panel/games/flow.mjs';
import { gridRoute, validRoute } from '../panel/games/grid-route.mjs';
import { ARCADE_CREATORS, ARCADE_VALIDATORS } from '../panel/arcade-games.mjs';
import { normalizeSave, emptySave } from '../panel/storage.mjs';
import { create2048, isValid2048 } from '../panel/games/2048.mjs';
const rng = initial => { let seed = initial; return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; }; };
test('generated connection paths cover the grid without jumps or repeats at both sizes', () => {
  for (const size of [5, 6]) for (let seed = 0; seed < 50; seed++) {
    assert.ok(validRoute(gridRoute(size, rng(seed)), size));
    const pipe = createPipes(null, size === 5 ? 'quick' : 'classic', rng(seed)), flow = createFlow(null, size === 5 ? 'quick' : 'classic', rng(seed));
    assert.ok(isValidPipes(pipe)); assert.ok(isValidFlow(flow)); assert.ok(!pipeNetwork(pipe).won); assert.ok(!isFlowComplete(flow));
  }
});
test('degenerate random sources still generate finite valid games', () => {
  for (const random of [() => 0, () => 0.999999]) { assert.ok(isValidSnake(createSnake(null, 'classic', random))); assert.ok(isValidPipes(createPipes(null, 'quick', random))); assert.ok(isValidFlow(createFlow(null, 'quick', random))); assert.ok(isValidBubbles(createBubbles(null, undefined, random))); }
});
test('Snake grows only on fruit and never places food inside its body', () => {
  let s = createSnake(null, 'classic', rng(4)); s = { ...s, paused: false, food: s.body[0] + 1 }; const before = s.body.length;
  s = stepSnake(s, rng(6)); assert.equal(s.body.length, before + 1); assert.equal(s.score, 10); assert.equal(s.best, 10); assert.ok(!s.body.includes(s.food)); assert.ok(isValidSnake(s));
  const normal = stepSnake(s); assert.equal(normal.body.length, s.body.length); assert.equal(normal.score, s.score);
});
test('Snake buffers two valid turns and rejects immediate or buffered reversals', () => {
  let s = createSnake(); assert.equal(turnSnake(s, 'left'), s); s = turnSnake(s, 'up'); assert.equal(turnSnake(s, 'down'), s);
  s = turnSnake(s, 'left'); assert.deepEqual(s.queue, ['up', 'left']); assert.equal(turnSnake(s, 'down'), s);
  s = stepSnake({ ...s, paused: false }); assert.equal(s.direction, 'up'); s = stepSnake(s); assert.equal(s.direction, 'left'); assert.ok(isValidSnake(s));
});
test('Snake stops at walls, pauses without advancing, and permits a vacating tail cell', () => {
  let s = { ...createSnake(), body: [15, 14, 13], food: 100, paused: false }; assert.equal(stepSnake(s).result, 'lost');
  assert.equal(stepSnake({ ...s, paused: true }).ticks, 0);
  s = { ...createSnake(), body: [17, 18, 2, 1], score: 10, best: 10, direction: 'up', paused: false, food: 100 };
  const next = stepSnake(s); assert.equal(next.result, null); assert.equal(next.body[0], 1); assert.ok(isValidSnake(next));
  s = { ...s, body: [17, 1, 2, 18] }; assert.equal(stepSnake(s).result, 'lost');
});
test('Snake wins when its last empty cell is collected', () => {
  const route = gridRoute(16, rng(7)), body = route.slice(0, -1).reverse(), head = body[0], fruit = route.at(-1);
  const direction = fruit === head + 1 ? 'right' : fruit === head - 1 ? 'left' : fruit > head ? 'down' : 'up';
  const s = { ...createSnake(), body, food: fruit, direction, score: 2520, best: 2520, paused: false };
  const next = stepSnake(s); assert.equal(next.result, 'won'); assert.equal(next.food, null); assert.ok(isValidSnake(next));
});
test('Pipe Connect rotations, solution detection, records and undo work on both sizes', () => {
  for (const difficulty of ['quick', 'classic']) {
    let s = createPipes(null, difficulty, rng(11));
    for (let i = 0; i < s.tiles.length; i++) { let turns = 0; while (rotateMask(s.tiles[i], turns) !== s.solution[i]) turns++; if (turns) s = rotatePipe(s, i, turns); }
    assert.ok(pipeNetwork(s).won); assert.equal(s.best[difficulty], s.moves); assert.ok(isValidPipes(s));
    assert.equal(rotatePipe(s, 0), s); const undone = undoPipes(s); assert.ok(!pipeNetwork(undone).won); assert.equal(undone.best[difficulty], s.best[difficulty]);
  }
});
test('Pipe Connect detects leaks and hints do not create an unassisted record', () => {
  let s = createPipes(null, 'quick', rng(8)); assert.ok(!pipeNetwork(s).won);
  for (let i = 0; i < 100 && !pipeNetwork(s).won; i++) s = hintPipe(s);
  assert.ok(pipeNetwork(s).won); assert.ok(s.hints > 0); assert.equal(s.best.quick, null);
  assert.equal(rotatePipe(s, -1), s); assert.equal(rotateMask(3, -1), 9); assert.equal(rotateMask(5, 2), 5);
  assert.ok(!isValidPipes({ ...s, solution: Array(25).fill(15) }));
});
test('Flow Connect completes generated puzzles in either direction, with one undo per stroke', () => {
  for (const difficulty of ['quick', 'classic']) {
    let s = createFlow(null, difficulty, rng(12));
    for (const original of s.solution) { const path = [...original].reverse(); s = beginFlow(s, path[0]); for (const cell of path.slice(1)) s = extendFlow(s, cell); s = finishFlow(s); }
    assert.ok(isFlowComplete(s)); assert.equal(s.moves, s.pairs.length); assert.equal(s.best[difficulty], s.moves); assert.ok(isValidFlow(s));
    const undone = undoFlow(s); assert.ok(!isFlowComplete(undone)); assert.equal(undone.paths.at(-1).length, 0); assert.equal(undone.best[difficulty], s.best[difficulty]);
  }
});
test('Flow Connect rejects crossings and foreign endpoints, and allows backtracking', () => {
  let s = createFlow(null, 'quick', rng(9)), path = s.solution[0]; s = beginFlow(s, path[0]); s = extendFlow(s, path[1]);
  assert.equal(extendFlow(s, s.pairs[1][0]), s); assert.equal(extendFlow(s, 99), s); s = extendFlow(s, path[0]); assert.deepEqual(s.paths[0], [path[0]]);
  const corrupted = structuredClone(s); corrupted.paths[1] = [s.pairs[1][0], path[0]]; assert.ok(!isValidFlow(corrupted));
  assert.deepEqual(undoFlow(s).paths, Array.from({ length: 5 }, () => []));
});
test('Flow hints complete without records and never overlap another path', () => {
  let s = createFlow(null, 'classic', rng(15)); for (let i = 0; i < 6; i++) s = hintFlow(s);
  assert.ok(isFlowComplete(s)); assert.equal(s.best.classic, null); assert.ok(s.paths.every((_, c) => flowConnected(s, c))); assert.ok(isValidFlow(s));
});
test('Reversi finds legal moves, flips enclosed lines, and undoes a whole computer turn', () => {
  let s = createReversi(); assert.deepEqual(reversiMoves(s), [19, 26, 37, 44]); assert.deepEqual(reversiFlips(s.board, 19, 1), [27]);
  s = moveReversi(s, 19); assert.equal(s.board[27], 1); assert.equal(s.turn, -1); assert.equal(moveReversi(s, 19), s);
  const ai = chooseReversiMove(s, () => 0); assert.ok(reversiMoves(s).includes(ai)); s = moveReversi(s, ai); assert.ok(isValidReversi(s)); assert.deepEqual(undoReversi(s), createReversi());
});
test('Reversi automatically passes a blocked player and scores a finished board', () => {
  const board = Array(64).fill(1); board[0] = board[62] = 0; board[1] = board[61] = -1;
  let s = { ...createReversi(null, 'local'), board, moves: 58, lastMove: 2 }; assert.ok(isValidReversi(s));
  s = moveReversi(s, 0); assert.equal(s.passed, -1); assert.equal(s.turn, 1); assert.equal(s.result, null); assert.ok(isValidReversi(s));
  s = moveReversi(s, 62); assert.equal(s.result, 1); assert.ok(s.board.every(p => p === 1)); assert.ok(isValidReversi(s));
});
test('Reversi rejects row wrapping and forged result saves', () => {
  const board = Array(64).fill(0); board[8] = -1; board[9] = 1; assert.deepEqual(reversiFlips(board, 7, 1), []);
  assert.ok(!isValidReversi({ ...createReversi(), result: 1 })); assert.ok(!isValidReversi({ ...createReversi(), moves: 20 }));
});
test('Bubble hex neighbors are reciprocal and do not wrap across board edges', () => {
  for (let i = 0; i < 88; i++) for (const j of bubbleNeighbors(i)) { assert.ok(bubbleNeighbors(j).includes(i)); const a = bubbleCenter(i), b = bubbleCenter(j); assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 35); }
  assert.ok(!bubbleNeighbors(7).includes(8));
});
test('Bubble Shooter pops three matching colors, drops floating bubbles, wins and undoes', () => {
  const board = Array(88).fill(null); board[3] = board[4] = 0; board[10] = 1;
  const s = { ...createBubbles(), board, current: 0, next: 1 }, shot = fireBubble(s, 0, () => 0);
  assert.equal(shot.state.result, 'won'); assert.equal(shot.state.score, 50); assert.equal(shot.popped.length, 4); assert.ok(isValidBubbles(shot.state));
  const undone = undoBubbles(shot.state); assert.deepEqual(undone.board, board); assert.equal(undone.score, 0); assert.equal(undone.best, 50);
});
test('Bubble Shooter bank shots stay within walls and misses lower the ceiling', () => {
  let s = createBubbles(null, undefined, rng(5)); const shot = fireBubble(s, 70, rng(7)); assert.ok(shot.path.every(p => p.x >= 16 && p.x <= 304)); assert.ok(shot.path.some((p, i, path) => i && p.x < path[i - 1].x)); assert.ok(isValidBubbles(shot.state));
  const board = Array(88).fill(null); board[3] = 1; board[4] = 2; s = { ...s, board, current: 0, next: 0, misses: 4 };
  const next = fireBubble(s, 0, rng(9)).state; assert.equal(next.misses, 0); assert.ok(next.board.slice(0, 8).every(c => c !== null)); assert.ok(isValidBubbles(next));
});
test('Bubble Shooter loses at the line, swaps ammo, and rejects corrupt saves', () => {
  let s = createBubbles(); s = { ...s, current: 0, next: 1 }; assert.equal(swapBubbles(s).current, 1); assert.deepEqual(swapBubbles(swapBubbles(s)), s);
  const board = Array(88).fill(null); for (let row = 0; row < 10; row++) board[row * 8 + 4] = row % 2; s = { ...s, board, current: 3, next: 3, misses: 4 };
  assert.equal(fireBubble(s, 0).state.result, 'lost'); assert.ok(!isValidBubbles({ ...s, current: 9 }));
});
test('Brick Breaker launches, clamps the paddle, bounces off walls and pauses', () => {
  let s = createBreakout(); assert.equal(steerBreakout(s, -100).paddle, 41); assert.equal(steerBreakout(s, 1000).paddle, 279);
  s = launchBreakout(s); assert.ok(s.ball.vy < 0); s = { ...s, ball: { x: 8, y: 200, vx: -150, vy: 100 } };
  const next = stepBreakout(s, 0.02); assert.ok(next.ball.vx > 0); assert.ok(isValidBreakout(next)); assert.equal(stepBreakout({ ...s, paused: true }, 0.08).ball.x, 8);
});
test('Brick Breaker collision removes armor, scores, and finishes the final brick', () => {
  let s = launchBreakout(createBreakout()), rect = brickRect(0); s = { ...s, ball: { x: rect.x + 15, y: rect.y - 6, vx: 0, vy: 180 } };
  const hit = stepBreakout(s, 0.02); assert.equal(hit.bricks[0], 1); assert.ok(hit.ball.vy < 0); assert.equal(hit.score, 10); assert.ok(isValidBreakout(hit));
  s = { ...s, bricks: s.bricks.map((_, i) => i === 0 ? 1 : 0) }; const won = stepBreakout(s, 0.02); assert.equal(won.phase, 'won'); assert.ok(isValidBreakout(won));
});
test('Brick Breaker paddle edges steer and a missed ball consumes exactly one life', () => {
  let s = launchBreakout(createBreakout()); s = { ...s, ball: { x: 184, y: 399, vx: 0, vy: 200 } }; const bounce = stepBreakout(s, 0.04); assert.ok(bounce.ball.vy < 0); assert.ok(bounce.ball.vx > 0);
  s = { ...s, ball: { x: 12, y: 446, vx: 0, vy: 200 } }; const next = stepBreakout(s, 0.02); assert.equal(next.lives, 2); assert.equal(next.phase, 'ready'); assert.equal(next.paused, true); assert.ok(isValidBreakout(next));
  assert.equal(stepBreakout({ ...s, lives: 1 }, 0.02).phase, 'lost'); assert.ok(!isValidBreakout({ ...s, ball: { ...s.ball, vx: Infinity } }));
});
test('all six new saves round-trip and one corrupt game preserves older progress', () => {
  const value = emptySave(); value.games['2048'] = create2048(); for (const [id, create] of Object.entries(ARCADE_CREATORS)) value.games[id] = create(); value.activeGame = 'pipes';
  const validators = { ...ARCADE_VALIDATORS, '2048': isValid2048 }; assert.deepEqual(normalizeSave(JSON.parse(JSON.stringify(value)), validators).save, value);
  const corrupt = structuredClone(value); corrupt.games.pipes.tiles[0] = 99; const restored = normalizeSave(corrupt, validators); assert.deepEqual(restored.recovered, ['pipes']); assert.equal(restored.save.activeGame, null); assert.deepEqual(restored.save.games['2048'], value.games['2048']); assert.deepEqual(restored.save.games.flow, value.games.flow);
  const older = emptySave(); for (const id of Object.keys(ARCADE_CREATORS)) delete older.games[id]; const migrated = normalizeSave(older, validators).save; for (const id of Object.keys(ARCADE_CREATORS)) assert.equal(migrated.games[id], null);
});
