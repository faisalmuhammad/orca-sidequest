// Flood Fill — fill the board with one color in limited moves.
// Pure game logic: no DOM. Pick a color to flood-fill from the top-left corner.

export const FLOOD_DIFFICULTIES = {
  quick:   { label: 'Quick · 10 × 10', size: 10, maxMoves: 20 },
  classic: { label: 'Classic · 14 × 14', size: 14, maxMoves: 25 },
};

export const FLOOD_COLORS = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple'];

/** BFS from index 0: returns the Set of all indices sharing the same color as board[0]. */
export function floodRegion(board, size) {
  const color = board[0];
  const visited = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const i = queue.shift();
    const row = Math.floor(i / size), col = i % size;
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = row + dr, nc = col + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      const ni = nr * size + nc;
      if (!visited.has(ni) && board[ni] === color) { visited.add(ni); queue.push(ni); }
    }
  }
  return visited;
}

export function createFlood(old = null, difficulty, random = Math.random) {
  const diff = difficulty && Object.hasOwn(FLOOD_DIFFICULTIES, difficulty) ? difficulty : old?.difficulty ?? 'classic';
  const { size, maxMoves } = FLOOD_DIFFICULTIES[diff];
  const length = size * size;
  let board;
  // Generate board, ensure it's not already solved
  do {
    board = Array.from({ length }, () => Math.floor(random() * 6));
  } while (board.every(c => c === board[0]));
  const best = old?.best && typeof old.best === 'object' ? { ...{ quick: null, classic: null }, ...old.best } : { quick: null, classic: null };
  return { board, size, moves: 0, maxMoves, difficulty: diff, result: null, best };
}

/** Pick a color to flood from the top-left. Returns same ref on no-op. */
export function pickFlood(state, colorIndex) {
  if (state.result) return state;
  if (!Number.isInteger(colorIndex) || colorIndex < 0 || colorIndex > 5) return state;
  if (state.board[0] === colorIndex) return state; // same color as current flood
  const region = floodRegion(state.board, state.size);
  const board = state.board.slice();
  for (const i of region) board[i] = colorIndex;
  const moves = state.moves + 1;
  const won = board.every(c => c === colorIndex);
  const lost = !won && moves >= state.maxMoves;
  const result = won ? 'won' : lost ? 'lost' : null;
  const best = { ...state.best };
  if (won) best[state.difficulty] = best[state.difficulty] === null ? moves : Math.min(best[state.difficulty], moves);
  return { ...state, board, moves, result, best };
}

export function isValidFlood(s) {
  if (!s || typeof s !== 'object') return false;
  // difficulty
  if (!Object.hasOwn(FLOOD_DIFFICULTIES, s.difficulty)) return false;
  const { size, maxMoves } = FLOOD_DIFFICULTIES[s.difficulty];
  // size
  if (s.size !== size) return false;
  if (s.maxMoves !== maxMoves) return false;
  // board
  if (!Array.isArray(s.board) || s.board.length !== size * size) return false;
  if (!s.board.every(n => Number.isInteger(n) && n >= 0 && n <= 5)) return false;
  // moves
  if (!Number.isInteger(s.moves) || s.moves < 0 || s.moves > maxMoves) return false;
  // result
  if (s.result !== null && s.result !== 'won' && s.result !== 'lost') return false;
  if (s.result === 'won' && !s.board.every(c => c === s.board[0])) return false;
  // best
  if (!s.best || typeof s.best !== 'object') return false;
  for (const key of Object.keys(FLOOD_DIFFICULTIES)) {
    if (s.best[key] !== null && (!Number.isInteger(s.best[key]) || s.best[key] < 1)) return false;
  }
  return true;
}
