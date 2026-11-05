export const LIGHT_DIFFICULTIES = { quick: { label: 'Quick · 4 × 4', size: 4 }, classic: { label: 'Classic · 5 × 5', size: 5 } };
export function lightNeighbors(index, size) {
  const cells = [index];
  if (index % size) cells.push(index - 1);
  if (index % size < size - 1) cells.push(index + 1);
  if (index >= size) cells.push(index - size);
  if (index < size * (size - 1)) cells.push(index + size);
  return cells;
}
function toggle(board, index, size) {
  const next = [...board];
  for (const i of lightNeighbors(index, size)) next[i] ^= 1;
  return next;
}
// Solve the toggle system over GF(2), then choose the shortest solution among
// the free-variable combinations (at most four for the supported boards).
export function solveLights(board, size) {
  const length = size * size, rows = Array.from({ length }, (_, i) => {
    const row = Array(length + 1).fill(0);
    for (const j of lightNeighbors(i, size)) row[j] = 1;
    row[length] = board[i]; return row;
  });
  const pivots = []; let rank = 0;
  for (let column = 0; column < length; column++) {
    const found = rows.findIndex((row, i) => i >= rank && row[column]);
    if (found < 0) continue;
    [rows[rank], rows[found]] = [rows[found], rows[rank]];
    for (let i = 0; i < length; i++) if (i !== rank && rows[i][column]) for (let j = column; j <= length; j++) rows[i][j] ^= rows[rank][j];
    pivots.push(column); rank++;
  }
  if (rows.slice(rank).some(row => row[length])) return null;
  const free = Array.from({ length }, (_, i) => i).filter(i => !pivots.includes(i));
  let best = null;
  for (let mask = 0; mask < 2 ** free.length; mask++) {
    const solution = Array(length).fill(0);
    free.forEach((column, i) => { solution[column] = (mask >> i) & 1; });
    pivots.forEach((column, i) => { solution[column] = rows[i][length] ^ free.reduce((n, f) => n ^ (rows[i][f] & solution[f]), 0); });
    const moves = solution.flatMap((n, i) => n ? [i] : []);
    if (best === null || moves.length < best.length) best = moves;
  }
  return best;
}
export function createLights(old = null, difficulty = old?.difficulty ?? 'classic', random = Math.random) {
  if (!Object.hasOwn(LIGHT_DIFFICULTIES, difficulty)) difficulty = 'classic';
  const { size } = LIGHT_DIFFICULTIES[difficulty], length = size * size;
  const candidates = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  let board = Array(length).fill(0);
  for (const i of candidates.slice(0, size === 4 ? 7 : 12)) board = toggle(board, i, size);
  if (board.every(n => n === 0)) board = toggle(board, Math.floor(length / 2), size);
  return { difficulty, size, board, initial: [...board], moves: 0, history: [], best: { quick: null, classic: null, ...old?.best } };
}
export function moveLights(s, index) {
  if (!Number.isInteger(index) || index < 0 || index >= s.board.length || s.board.every(n => n === 0)) return s;
  const board = toggle(s.board, index, s.size), moves = s.moves + 1;
  return { ...s, board, moves, history: [...s.history, { board: s.board, moves: s.moves }].slice(-100), best: board.every(n => n === 0) ? { ...s.best, [s.difficulty]: Math.min(s.best[s.difficulty] ?? Infinity, moves) } : s.best };
}
export function undoLights(s) {
  if (!s.history.length) return s;
  return { ...s, ...s.history.at(-1), history: s.history.slice(0, -1) };
}
export function isLightsComplete(s) { return s.board.every(n => n === 0); }
export function isValidLights(s) {
  if (!s || !Object.hasOwn(LIGHT_DIFFICULTIES, s.difficulty ?? '') || s.size !== LIGHT_DIFFICULTIES[s.difficulty].size) return false;
  const validBoard = board => Array.isArray(board) && board.length === s.size ** 2 && board.every(n => n === 0 || n === 1);
  if (!validBoard(s.board) || !validBoard(s.initial) || !s.initial.some(Boolean) || !Number.isSafeInteger(s.moves) || s.moves < 0) return false;
  if (!s.best || !Object.keys(LIGHT_DIFFICULTIES).every(key => s.best[key] === null || (Number.isSafeInteger(s.best[key]) && s.best[key] > 0))) return false;
  if (!Array.isArray(s.history) || s.history.length > Math.min(100, s.moves)) return false;
  if (!s.history.every((entry, i) => entry && validBoard(entry.board) && entry.moves === s.moves - s.history.length + i && entry.board.some(Boolean))) return false;
  const boards = [...s.history.map(entry => entry.board), s.board];
  if (boards.some((board, i) => i > 0 && !board.some((_, index) => toggle(boards[i - 1], index, s.size).every((n, j) => n === board[j])))) return false;
  if (s.moves === 0 && !s.board.every((n, i) => n === s.initial[i])) return false;
  if (s.history[0]?.moves === 0 && !s.history[0].board.every((n, i) => n === s.initial[i])) return false;
  return solveLights(s.board, s.size) !== null && solveLights(s.initial, s.size) !== null && (!isLightsComplete(s) || (s.moves > 0 && s.best[s.difficulty] !== null && s.best[s.difficulty] <= s.moves));
}
