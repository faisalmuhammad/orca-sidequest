import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORDLE_TARGETS, WORDLE_VALID, wordleFeedback,
  createWordle, enterLetter, deleteLetter, submitGuess, isValidWordle,
} from '../panel/games/wordle.mjs';

const random = seed => () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };

test('wordleFeedback handles duplicate letters without double-counting', () => {
  // "abcde" vs "aaxyz": first 'a' is correct, second 'a' has no remaining 'a' → absent
  assert.deepEqual(wordleFeedback('abcde', 'aaxyz'), ['correct', 'absent', 'absent', 'absent', 'absent']);
  // "aabbc" vs "xaayc": x absent, a correct (pos1), a present (matches remaining a at pos0), y absent, c correct
  assert.deepEqual(wordleFeedback('aabbc', 'xaayc'), ['absent', 'correct', 'present', 'absent', 'correct']);
  // All correct
  assert.deepEqual(wordleFeedback('hello', 'hello'), ['correct', 'correct', 'correct', 'correct', 'correct']);
  // "geese" vs "eases": e present (matches pos2's e), a absent, s present (matches pos3's s), e present (matches pos4's e), s absent (no more s)
  assert.deepEqual(wordleFeedback('geese', 'eases'), ['present', 'absent', 'present', 'present', 'absent']);
});

test('incomplete and invalid guesses are rejected', () => {
  const s = createWordle(null, undefined, random(1));
  // Type partial word
  let next = enterLetter(s, 'h');
  next = enterLetter(next, 'e');
  next = enterLetter(next, 'l');
  assert.equal(next.draft, 'hel');
  assert.equal(submitGuess(next), next); // same ref — too short
  assert.ok(isValidWordle(next));

  // Type a non-word (5 letters but not in valid set)
  let bad = enterLetter(s, 'z');
  bad = enterLetter(bad, 'z');
  bad = enterLetter(bad, 'z');
  bad = enterLetter(bad, 'z');
  bad = enterLetter(bad, 'z');
  assert.equal(bad.draft, 'zzzzz');
  assert.equal(submitGuess(bad), bad); // same ref — not a valid word
  assert.ok(isValidWordle(bad));
});

test('enterLetter rejects invalid input and respects the 5-letter limit', () => {
  const s = createWordle();
  assert.equal(enterLetter(s, 'A'), s); // uppercase rejected
  assert.equal(enterLetter(s, '1'), s); // digit rejected
  assert.equal(enterLetter(s, 'ab'), s); // multi-char rejected
  assert.equal(enterLetter(s, ''), s); // empty rejected

  let full = s;
  for (const ch of 'about') full = enterLetter(full, ch);
  assert.equal(full.draft, 'about');
  assert.equal(enterLetter(full, 'x'), full); // already 5 letters
});

test('deleteLetter removes the last character or is a no-op on empty', () => {
  const s = createWordle();
  assert.equal(deleteLetter(s), s); // no-op on empty draft
  let next = enterLetter(enterLetter(s, 'a'), 'b');
  next = deleteLetter(next);
  assert.equal(next.draft, 'a');
  next = deleteLetter(next);
  assert.equal(next.draft, '');
});

test('Wordle win path sets result and updates best', () => {
  // Use a deterministic random that picks target at index 0
  const s = createWordle(null, undefined, () => 0);
  const target = s.target;
  assert.equal(target, WORDLE_TARGETS[0]);

  // Guess the target word directly
  let state = s;
  for (const ch of target) state = enterLetter(state, ch);
  state = submitGuess(state);

  assert.equal(state.result, 'won');
  assert.equal(state.guesses.length, 1);
  assert.equal(state.best, 1);
  assert.ok(state.guesses[0].feedback.every(f => f === 'correct'));
  assert.equal(state.draft, '');
  assert.ok(isValidWordle(state));

  // New game carries best forward
  const s2 = createWordle(state, undefined, () => 0);
  assert.equal(s2.best, 1);
  assert.equal(s2.guesses.length, 0);
  assert.equal(s2.result, null);
});

test('Wordle loss after 6 wrong guesses', () => {
  // Pick a target we can miss 6 times
  const s = createWordle(null, undefined, () => 0);
  const target = s.target;

  // Find 6 valid words that aren't the target
  const wrong = [...WORDLE_VALID].filter(w => w !== target).slice(0, 6);
  let state = s;
  for (const word of wrong) {
    for (const ch of word) state = enterLetter(state, ch);
    state = submitGuess(state);
    if (state.result) break;
  }

  assert.equal(state.result, 'lost');
  assert.equal(state.guesses.length, 6);
  assert.equal(state.best, null); // never won
  assert.ok(isValidWordle(state));

  // Can't enter more letters after loss
  assert.equal(enterLetter(state, 'a'), state);
});

test('keyboard state tracks letter feedback correctly', () => {
  const s = createWordle(null, undefined, () => 0);
  const target = s.target; // first target word

  // Guess a valid word
  const guess = [...WORDLE_VALID].find(w => w !== target && w.length === 5);
  let state = s;
  for (const ch of guess) state = enterLetter(state, ch);
  state = submitGuess(state);

  // Keyboard should have entries for each unique letter in the guess
  const usedLetters = new Set(guess);
  for (const letter of usedLetters) {
    assert.ok(['correct', 'present', 'absent'].includes(state.keyboard[letter]),
      `keyboard should track letter '${letter}'`);
  }
  assert.ok(isValidWordle(state));
});

test('isValidWordle rejects tampered feedback and forged results', () => {
  const s = createWordle(null, undefined, () => 0);
  const target = s.target;
  const guess = [...WORDLE_VALID].find(w => w !== target);
  let state = s;
  for (const ch of guess) state = enterLetter(state, ch);
  state = submitGuess(state);

  // Tamper with feedback
  assert.equal(isValidWordle({
    ...state,
    guesses: [{ ...state.guesses[0], feedback: ['correct', 'correct', 'correct', 'correct', 'correct'] }]
  }), false);

  // Forge a win
  assert.equal(isValidWordle({ ...state, result: 'won' }), false);

  // Invalid target
  assert.equal(isValidWordle({ ...state, target: 'zzzzz' }), false);

  // Tampered keyboard
  assert.equal(isValidWordle({ ...state, keyboard: { ...state.keyboard, z: 'correct' } }), false);

  // Best too high
  assert.equal(isValidWordle({ ...state, result: null, best: 0 }), false);
  assert.equal(isValidWordle({ ...state, result: null, best: 7 }), false);
});

test('all target words are 5 lowercase letters and in the valid set', () => {
  for (const word of WORDLE_TARGETS) {
    assert.equal(word.length, 5, `target "${word}" should be 5 letters`);
    assert.match(word, /^[a-z]+$/, `target "${word}" should be lowercase`);
    assert.ok(WORDLE_VALID.has(word), `target "${word}" should be in WORDLE_VALID`);
  }
  // No duplicates in targets
  assert.equal(new Set(WORDLE_TARGETS).size, WORDLE_TARGETS.length);
});

test('best improves across games', () => {
  // Win in 3 guesses
  let s = createWordle(null, undefined, () => 0);
  const target = s.target;
  const filler = [...WORDLE_VALID].filter(w => w !== target);

  // Guess 2 wrong words, then the target
  for (const word of [filler[0], filler[1], target]) {
    for (const ch of word) s = enterLetter(s, ch);
    s = submitGuess(s);
  }
  assert.equal(s.result, 'won');
  assert.equal(s.best, 3);

  // Win in 1 guess on a new game — best should improve
  let s2 = createWordle(s, undefined, () => 0);
  for (const ch of s2.target) s2 = enterLetter(s2, ch);
  s2 = submitGuess(s2);
  assert.equal(s2.result, 'won');
  assert.equal(s2.best, 1);
  assert.ok(isValidWordle(s2));
});
