// American checkers: mandatory captures, chained jumps, crowning ends a turn.
const owner = (piece) => Math.sign(piece);
const directions = (piece) =>
  Math.abs(piece) === 2
    ? [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ]
    : [
        [-owner(piece), -1],
        [-owner(piece), 1],
      ];
const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
export function createCheckers(mode = 'computer') {
  return {
    board: Array.from({ length: 64 }, (_, i) =>
      (Math.floor(i / 8) + (i % 8)) % 2 ? (i < 24 ? -1 : i >= 40 ? 1 : 0) : 0,
    ),
    turn: 1,
    forced: null,
    history: [],
    moves: 0,
    quiet: 0,
    result: null,
    mode,
  };
}
export function checkersMoves(state) {
  if (state.result) return [];
  const captures = [],
    steps = [];
  state.board.forEach((piece, from) => {
    if (
      owner(piece) !== state.turn ||
      (state.forced !== null && from !== state.forced)
    )
      return;
    const r = Math.floor(from / 8),
      c = from % 8;
    for (const [dr, dc] of directions(piece)) {
      const nr = r + dr,
        nc = c + dc;
      if (!inside(nr, nc)) continue;
      const next = nr * 8 + nc;
      if (!state.board[next]) steps.push({ from, to: next, capture: null });
      else if (
        owner(state.board[next]) === -state.turn &&
        inside(r + 2 * dr, c + 2 * dc) &&
        !state.board[(r + 2 * dr) * 8 + c + 2 * dc]
      )
        captures.push({
          from,
          to: (r + 2 * dr) * 8 + c + 2 * dc,
          capture: next,
        });
    }
  });
  return state.forced !== null ? captures : captures.length ? captures : steps;
}
const snapshot = (state) => {
  const { history, ...rest } = state;
  return structuredClone(rest);
};
const key = (state) => state.board.join(',') + ':' + state.turn;
export function moveCheckers(state, from, to, record = true) {
  const move = checkersMoves(state).find((m) => m.from === from && m.to === to);
  if (!move) return state;
  const next = {
    ...state,
    board: [...state.board],
    history:
      record && state.forced === null
        ? [...state.history.slice(-119), snapshot(state)]
        : state.history,
  };
  let piece = next.board[from];
  next.board[from] = 0;
  if (move.capture !== null) next.board[move.capture] = 0;
  const crowned = Math.abs(piece) === 1 && (piece > 0 ? to < 8 : to >= 56);
  if (crowned) piece *= 2;
  next.board[to] = piece;
  next.forced = move.capture !== null && !crowned ? to : null;
  if (next.forced !== null && checkersMoves(next).length) return next;
  next.forced = null;
  next.turn = -state.turn;
  next.moves = state.moves + 1;
  // A continued capture is still an irreversible turn even if its last jump crowns.
  next.quiet = move.capture !== null || crowned ? 0 : state.quiet + 1;
  if (!checkersMoves(next).length) next.result = state.turn;
  else if (
    next.quiet >= 80 ||
    (record &&
      next.history.filter((s) => s.forced === null && key(s) === key(next))
        .length >= 2)
  )
    next.result = 'draw';
  return next;
}
export function undoCheckers(state) {
  if (!state.history.length) return state;
  let i = state.history.length - 1;
  if (state.mode === 'computer')
    while (i > 0 && state.history[i].turn !== 1) i--;
  return {
    ...structuredClone(state.history[i]),
    history: state.history.slice(0, i),
  };
}
export function chooseCheckersMove(state, random = Math.random) {
  let nodes = 0;
  const score = (s) =>
    s.result === 'draw'
      ? 0
      : s.result
        ? s.result * 10000
        : s.board.reduce(
            (sum, p, i) =>
              sum +
              (p
                ? Math.sign(p) *
                  (Math.abs(p) === 2
                    ? 170
                    : 100 +
                      (p > 0 ? 7 - Math.floor(i / 8) : Math.floor(i / 8)) * 4)
                : 0),
            0,
          );
  function search(s, depth, alpha, beta) {
    if (s.result || depth === 0 || ++nodes > 12000) return score(s);
    let best = s.turn === 1 ? -Infinity : Infinity;
    for (const m of checkersMoves(s)) {
      const n = moveCheckers(s, m.from, m.to, false);
      const v = search(n, depth - (n.turn !== s.turn ? 1 : 0), alpha, beta);
      if (s.turn === 1) {
        best = Math.max(best, v);
        alpha = Math.max(alpha, best);
      } else {
        best = Math.min(best, v);
        beta = Math.min(beta, best);
      }
      if (beta <= alpha) break;
    }
    return Number.isFinite(best) ? best : score(s);
  }
  const moves = checkersMoves(state);
  let best = state.turn === 1 ? -Infinity : Infinity,
    choices = [];
  for (const m of moves) {
    const n = moveCheckers(state, m.from, m.to, false),
      v = search(n, 3, -Infinity, Infinity);
    if (v === best) choices.push(m);
    else if (state.turn === 1 ? v > best : v < best) {
      best = v;
      choices = [m];
    }
  }
  return (
    choices[
      Math.min(choices.length - 1, Math.floor(random() * choices.length))
    ] ?? null
  );
}
export function isValidCheckers(s) {
  const valid = (v) =>
    v &&
    Array.isArray(v.board) &&
    v.board.length === 64 &&
    v.board.every(
      (p, i) =>
        [-2, -1, 0, 1, 2].includes(p) &&
        (!p || (Math.floor(i / 8) + (i % 8)) % 2 === 1),
    ) &&
    [1, -1].includes(v.turn) &&
    (v.forced === null ||
      (Number.isInteger(v.forced) &&
        v.forced >= 0 &&
        v.forced < 64 &&
        owner(v.board[v.forced]) === v.turn)) &&
    Number.isSafeInteger(v.moves) &&
    v.moves >= 0 &&
    Number.isSafeInteger(v.quiet) &&
    v.quiet >= 0 &&
    [null, 1, -1, 'draw'].includes(v.result) &&
    ['computer', 'local'].includes(v.mode);
  return !!(
    valid(s) &&
    Array.isArray(s.history) &&
    s.history.length <= 120 &&
    s.history.every(valid) &&
    (s.forced === null || checkersMoves(s).length)
  );
}
