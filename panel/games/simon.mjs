// Simon — watch and repeat a growing sequence of colored pads.
// Pure game logic: no DOM, no timers. The UI drives the watch animation.

export function createSimon(old = null, _difficulty, random = Math.random) {
  const sequence = Array.from({ length: 100 }, () => Math.floor(random() * 4));
  return {
    sequence,
    round: 1,
    input: [],
    phase: 'watch',
    result: null,
    best: old?.best ?? null,
    moves: 0,
  };
}

/** Transition from watch → play after the UI finishes animating the sequence. */
export function startPlayPhase(state) {
  if (state.phase !== 'watch' || state.result) return state;
  return { ...state, phase: 'play' };
}

/** Player taps a pad (0–3). Returns same ref on no-op. */
export function tapSimon(state, pad) {
  if (state.phase !== 'play' || state.result) return state;
  if (!Number.isInteger(pad) || pad < 0 || pad > 3) return state;

  const expected = state.sequence[state.input.length];
  if (pad !== expected) {
    // Wrong — game over
    const best = state.best === null ? state.round : Math.max(state.best, state.round);
    return { ...state, input: [...state.input, pad], result: 'lost', best, moves: state.moves + 1 };
  }

  const input = [...state.input, pad];
  const moves = state.moves + 1;

  if (input.length === state.round) {
    // Round complete — advance
    const round = state.round + 1;
    const best = state.best === null ? round - 1 : Math.max(state.best, round - 1);
    return { ...state, input: [], round, phase: 'watch', result: null, best, moves };
  }

  return { ...state, input, moves };
}

export function isValidSimon(s) {
  if (!s || typeof s !== 'object') return false;
  // sequence
  if (!Array.isArray(s.sequence) || s.sequence.length !== 100) return false;
  if (!s.sequence.every(n => Number.isInteger(n) && n >= 0 && n <= 3)) return false;
  // round
  if (!Number.isInteger(s.round) || s.round < 1 || s.round > 100) return false;
  // input
  if (!Array.isArray(s.input)) return false;
  if (s.input.length > s.round) return false;
  if (!s.input.every(n => Number.isInteger(n) && n >= 0 && n <= 3)) return false;
  // phase
  if (s.phase !== 'watch' && s.phase !== 'play') return false;
  // result
  if (s.result !== null && s.result !== 'lost') return false;
  // If result is 'lost', last input must be wrong (or input can be any length)
  if (s.result === 'lost' && s.input.length > 0) {
    const lastIdx = s.input.length - 1;
    if (s.input[lastIdx] === s.sequence[lastIdx]) return false; // last tap was correct but result is lost?
  }
  // If playing and input exists, each entry must match the sequence
  if (!s.result && s.input.length > 0) {
    for (let i = 0; i < s.input.length; i++) {
      if (s.input[i] !== s.sequence[i]) return false;
    }
  }
  // best
  if (s.best !== null && (!Number.isInteger(s.best) || s.best < 1)) return false;
  // moves
  if (!Number.isInteger(s.moves) || s.moves < 0) return false;
  return true;
}
