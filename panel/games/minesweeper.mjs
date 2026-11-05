export const MINE_DIFFICULTIES = {
  quick: { label: 'Quick · 6 × 6', size: 6, mines: 5 },
  classic: { label: 'Classic · 8 × 8', size: 8, mines: 10 },
  expert: { label: 'Expert · 10 × 10', size: 10, mines: 20 },
};
const emptyBest = () => ({ quick: null, classic: null, expert: null });
export function mineNeighbors(index, size) {
  const row = Math.floor(index / size), column = index % size, cells = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const y = row + dy, x = column + dx;
    if ((dx || dy) && y >= 0 && y < size && x >= 0 && x < size) cells.push(y * size + x);
  }
  return cells;
}
export function createMinesweeper(old = null, difficulty = old?.difficulty ?? 'classic') {
  if (!Object.hasOwn(MINE_DIFFICULTIES, difficulty)) difficulty = 'classic';
  const { size, mines: mineCount } = MINE_DIFFICULTIES[difficulty];
  return { difficulty, size, mineCount, mines: Array(size * size).fill(0), revealed: Array(size * size).fill(false), flags: Array(size * size).fill(false), started: false, result: null, exploded: null, elapsedMs: 0, best: { ...emptyBest(), ...old?.best } };
}
function validIndex(s, index) { return Number.isInteger(index) && index >= 0 && index < s.size * s.size; }
export function mineCountAt(s, index) { return mineNeighbors(index, s.size).reduce((n, i) => n + s.mines[i], 0); }
function plantMines(s, index, random) {
  const protectedCells = new Set([index, ...mineNeighbors(index, s.size)]);
  const candidates = s.mines.map((_, i) => i).filter(i => !protectedCells.has(i));
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const mines = [...s.mines];
  for (const i of candidates.slice(0, s.mineCount)) mines[i] = 1;
  return { ...s, mines, started: true };
}
export function flagMine(s, index) {
  if (s.result || !validIndex(s, index) || s.revealed[index]) return s;
  const flags = [...s.flags]; flags[index] = !flags[index];
  return { ...s, flags };
}
function revealCells(s, cells) {
  const revealed = [...s.revealed], queue = [...cells];
  let exploded = null;
  while (queue.length) {
    const index = queue.pop();
    if (revealed[index] || s.flags[index]) continue;
    revealed[index] = true;
    if (s.mines[index]) { exploded = index; break; }
    if (mineCountAt(s, index) === 0) queue.push(...mineNeighbors(index, s.size));
  }
  if (exploded !== null) return { ...s, revealed, exploded, result: 'lost' };
  const won = revealed.every((open, i) => open || s.mines[i] === 1);
  return { ...s, revealed, result: won ? 'won' : null, best: won ? { ...s.best, [s.difficulty]: Math.min(s.best[s.difficulty] ?? Infinity, s.elapsedMs) } : s.best };
}
export function revealMine(s, index, random = Math.random) {
  if (s.result || !validIndex(s, index) || s.flags[index]) return s;
  if (s.revealed[index]) return chordMine(s, index);
  const planted = s.started ? s : plantMines(s, index, random);
  return revealCells(planted, [index]);
}
export function chordMine(s, index) {
  if (s.result || !validIndex(s, index) || !s.revealed[index] || s.mines[index]) return s;
  const neighbors = mineNeighbors(index, s.size), count = mineCountAt(s, index);
  if (!count || neighbors.filter(i => s.flags[i]).length !== count || neighbors.every(i => s.revealed[i] || s.flags[i])) return s;
  return revealCells(s, neighbors);
}
export function isValidMinesweeper(s) {
  if (!s || !Object.hasOwn(MINE_DIFFICULTIES, s.difficulty ?? '')) return false;
  const rule = MINE_DIFFICULTIES[s.difficulty], length = rule.size ** 2;
  if (s.size !== rule.size || s.mineCount !== rule.mines || !Array.isArray(s.mines) || s.mines.length !== length || !s.mines.every(n => n === 0 || n === 1)) return false;
  if (!['revealed', 'flags'].every(key => Array.isArray(s[key]) && s[key].length === length && s[key].every(n => typeof n === 'boolean'))) return false;
  if (typeof s.started !== 'boolean' || ![null, 'won', 'lost'].includes(s.result) || !Number.isSafeInteger(s.elapsedMs) || s.elapsedMs < 0) return false;
  if (!s.best || !Object.keys(MINE_DIFFICULTIES).every(key => s.best[key] === null || (Number.isSafeInteger(s.best[key]) && s.best[key] >= 0))) return false;
  if (s.revealed.some((n, i) => n && s.flags[i])) return false;
  if (!s.started) return s.mines.every(n => n === 0) && s.revealed.every(n => !n) && s.result === null && s.exploded === null && s.elapsedMs === 0;
  if (s.mines.reduce((a, b) => a + b, 0) !== s.mineCount) return false;
  const won = s.revealed.every((n, i) => n || s.mines[i] === 1), hit = s.revealed.some((n, i) => n && s.mines[i]);
  if (s.result === 'lost') return validIndex(s, s.exploded) && s.mines[s.exploded] === 1 && s.revealed[s.exploded];
  return !hit && s.exploded === null && (s.result === 'won' ? won && s.best[s.difficulty] !== null && s.best[s.difficulty] <= s.elapsedMs : !won);
}
