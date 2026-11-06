import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimon, startPlayPhase, tapSimon, isValidSimon } from '../panel/games/simon.mjs';

const random = seed => () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };

test('createSimon generates a 100-step sequence of values 0–3', () => {
  const s = createSimon(null, undefined, random(42));
  assert.equal(s.sequence.length, 100);
  assert.ok(s.sequence.every(n => n >= 0 && n <= 3));
  assert.equal(s.round, 1);
  assert.equal(s.phase, 'watch');
  assert.equal(s.result, null);
  assert.equal(s.best, null);
  assert.equal(s.moves, 0);
  assert.deepEqual(s.input, []);
  assert.ok(isValidSimon(s));
});

test('createSimon carries best from previous game', () => {
  const s = createSimon({ best: 7 }, undefined, random(1));
  assert.equal(s.best, 7);
  assert.ok(isValidSimon(s));
});

test('startPlayPhase transitions watch → play', () => {
  const s = createSimon(null, undefined, random(1));
  assert.equal(s.phase, 'watch');
  const next = startPlayPhase(s);
  assert.notEqual(next, s);
  assert.equal(next.phase, 'play');
  assert.ok(isValidSimon(next));
});

test('startPlayPhase is no-op if already playing or game over', () => {
  const s = startPlayPhase(createSimon(null, undefined, random(1)));
  assert.equal(startPlayPhase(s), s); // already 'play'
  // game over state
  const lost = { ...s, result: 'lost', phase: 'play' };
  assert.equal(startPlayPhase(lost), lost);
});

test('tapSimon correct tap grows input', () => {
  let s = startPlayPhase(createSimon(null, undefined, random(1)));
  const expected = s.sequence[0];
  const next = tapSimon(s, expected);
  assert.notEqual(next, s);
  assert.equal(next.moves, 1);
  assert.ok(isValidSimon(next));
});

test('tapSimon completing a round advances to next round', () => {
  let s = startPlayPhase(createSimon(null, undefined, random(5)));
  // Round 1: one tap to complete
  const pad = s.sequence[0];
  const next = tapSimon(s, pad);
  assert.equal(next.round, 2);
  assert.equal(next.phase, 'watch');
  assert.deepEqual(next.input, []);
  assert.equal(next.best, 1); // reached round 1
  assert.ok(isValidSimon(next));
});

test('tapSimon wrong pad ends the game', () => {
  let s = startPlayPhase(createSimon(null, undefined, random(3)));
  const wrong = (s.sequence[0] + 1) % 4;
  const next = tapSimon(s, wrong);
  assert.equal(next.result, 'lost');
  assert.equal(next.best, 1); // was on round 1
  assert.ok(isValidSimon(next));
});

test('tapSimon ignored in watch phase', () => {
  const s = createSimon(null, undefined, random(1));
  assert.equal(s.phase, 'watch');
  assert.equal(tapSimon(s, 0), s);
});

test('tapSimon ignored after game over', () => {
  let s = startPlayPhase(createSimon(null, undefined, random(1)));
  const wrong = (s.sequence[0] + 1) % 4;
  const lost = tapSimon(s, wrong);
  assert.equal(lost.result, 'lost');
  assert.equal(tapSimon(lost, 0), lost);
});

test('tapSimon rejects invalid pad indices', () => {
  let s = startPlayPhase(createSimon(null, undefined, random(1)));
  assert.equal(tapSimon(s, -1), s);
  assert.equal(tapSimon(s, 4), s);
  assert.equal(tapSimon(s, 1.5), s);
  assert.equal(tapSimon(s, 'a'), s);
});

test('full multi-round game flow', () => {
  let s = startPlayPhase(createSimon(null, undefined, random(10)));
  // Play through 5 rounds
  for (let round = 1; round <= 5; round++) {
    assert.equal(s.phase, 'play');
    assert.equal(s.round, round);
    for (let i = 0; i < round; i++) {
      s = tapSimon(s, s.sequence[i]);
      assert.ok(isValidSimon(s));
    }
    // After completing the round, should be in watch phase for next
    if (round < 5) {
      assert.equal(s.phase, 'watch');
      assert.equal(s.round, round + 1);
      s = startPlayPhase(s);
    }
  }
  assert.equal(s.phase, 'watch');
  assert.equal(s.round, 6);
  assert.equal(s.best, 5);
});

test('best improves across games', () => {
  let s = startPlayPhase(createSimon(null, undefined, random(7)));
  // Fail immediately — best = 1
  const wrong = (s.sequence[0] + 1) % 4;
  const lost = tapSimon(s, wrong);
  assert.equal(lost.best, 1);

  // New game carries best, play further
  let s2 = startPlayPhase(createSimon(lost, undefined, random(8)));
  // Complete 3 rounds
  for (let round = 1; round <= 3; round++) {
    for (let i = 0; i < round; i++) s2 = tapSimon(s2, s2.sequence[i]);
    if (round < 3) s2 = startPlayPhase(s2);
  }
  assert.equal(s2.best, 3);

  // New game carries 3, fail on round 2 — best stays 3
  let s3 = startPlayPhase(createSimon(s2, undefined, random(9)));
  s3 = tapSimon(s3, s3.sequence[0]); // complete round 1
  s3 = startPlayPhase(s3);
  const wrong3 = (s3.sequence[0] + 1) % 4;
  s3 = tapSimon(s3, wrong3);
  assert.equal(s3.result, 'lost');
  assert.equal(s3.best, 3); // did not beat previous
});

test('isValidSimon rejects tampered states', () => {
  const s = startPlayPhase(createSimon(null, undefined, random(1)));
  assert.ok(isValidSimon(s));
  // Bad sequence length
  assert.ok(!isValidSimon({ ...s, sequence: [0, 1, 2] }));
  // Bad sequence value
  assert.ok(!isValidSimon({ ...s, sequence: s.sequence.map(() => 5) }));
  // Bad round
  assert.ok(!isValidSimon({ ...s, round: 0 }));
  assert.ok(!isValidSimon({ ...s, round: 101 }));
  // Bad phase
  assert.ok(!isValidSimon({ ...s, phase: 'idle' }));
  // Bad result
  assert.ok(!isValidSimon({ ...s, result: 'won' }));
  // Bad input — wrong pad at index 0 but result is null
  assert.ok(!isValidSimon({ ...s, input: [(s.sequence[0] + 1) % 4] }));
  // Null/undefined
  assert.ok(!isValidSimon(null));
  assert.ok(!isValidSimon(undefined));
  assert.ok(!isValidSimon(42));
});
