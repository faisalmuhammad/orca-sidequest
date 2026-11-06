import { gridRoute, validRoute, natural } from './grid-route.mjs';
export const PIPE_DIFFICULTIES = { quick: { label: 'Quick · 5 × 5', size: 5 }, classic: { label: 'Classic · 6 × 6', size: 6 } };
export const PIPE_DIRS = [[-1, 0, 1, 4], [0, 1, 2, 8], [1, 0, 4, 1], [0, -1, 8, 2]];
export const rotateMask = (mask, turns = 1) => { turns = ((turns % 4) + 4) % 4; return ((mask << turns) | (mask >> (4 - turns))) & 15; };
const directionBit = (a, b, size) => b === a - size ? 1 : b === a + 1 ? 2 : b === a + size ? 4 : 8;
const port = (index, size) => index < size ? 1 : index % size === size - 1 ? 2 : index >= size * (size - 1) ? 4 : 8;
export function pipeNetwork(s) {
  const powered = new Set(), leaks = [];
  if (!(s.tiles[s.source] & s.inlet)) return { powered, leaks: [s.source], won: false };
  const queue = [s.source]; powered.add(s.source);
  for (let q = 0; q < queue.length; q++) {
    const index = queue[q], row = Math.floor(index / s.size), col = index % s.size;
    for (const [dr, dc, bit, reverse] of PIPE_DIRS) {
      if (!(s.tiles[index] & bit)) continue;
      if ((index === s.source && bit === s.inlet) || (index === s.sink && bit === s.outlet)) continue;
      const r = row + dr, c = col + dc, next = r * s.size + c;
      if (r < 0 || r >= s.size || c < 0 || c >= s.size || !(s.tiles[next] & reverse)) { leaks.push(index); continue; }
      if (!powered.has(next)) { powered.add(next); queue.push(next); }
    }
  }
  return { powered, leaks, won: powered.size === s.size ** 2 && !leaks.length && !!(s.tiles[s.sink] & s.outlet) };
}
export function createPipes(old = null, difficulty = old?.difficulty ?? 'quick', random = Math.random) {
  if (!Object.hasOwn(PIPE_DIFFICULTIES, difficulty)) difficulty = 'quick';
  const size = PIPE_DIFFICULTIES[difficulty].size, route = gridRoute(size, random, true), source = route[0], sink = route.at(-1), inlet = port(source, size), outlet = port(sink, size);
  const solution = Array(size ** 2).fill(0);
  route.forEach((index, i) => { solution[index] = (i ? directionBit(index, route[i - 1], size) : inlet) | (i < route.length - 1 ? directionBit(index, route[i + 1], size) : outlet); });
  const s = { difficulty, size, route, source, sink, inlet, outlet, solution, tiles: solution.map(mask => rotateMask(mask, Math.floor(random() * 4))), moves: 0, hints: 0, history: [], best: { quick: null, classic: null, ...old?.best } };
  if (pipeNetwork(s).won) s.tiles[source] = rotateMask(s.tiles[source]);
  return s;
}
export function rotatePipe(s, index, turns = 1, hint = false) {
  if (pipeNetwork(s).won || !Number.isInteger(index) || index < 0 || index >= s.tiles.length || !Number.isInteger(turns) || rotateMask(s.tiles[index], turns) === s.tiles[index]) return s;
  const tiles = [...s.tiles]; tiles[index] = rotateMask(tiles[index], turns);
  const next = { ...s, tiles, moves: s.moves + 1, hints: s.hints + (hint ? 1 : 0), history: [...s.history, { tiles: s.tiles, moves: s.moves, hints: s.hints }].slice(-100) };
  if (pipeNetwork(next).won && !next.hints) next.best = { ...next.best, [s.difficulty]: Math.min(next.best[s.difficulty] ?? Infinity, next.moves) };
  return next;
}
export function hintPipe(s) { const index = s.tiles.findIndex((mask, i) => mask !== s.solution[i]); if (index < 0) return s; let turns = 1; while (turns < 4 && rotateMask(s.tiles[index], turns) !== s.solution[index]) turns++; return rotatePipe(s, index, turns, true); }
export function undoPipes(s) { return s.history.length ? { ...s, ...s.history.at(-1), history: s.history.slice(0, -1) } : s; }
export function isValidPipes(s) {
  if (!s || !Object.hasOwn(PIPE_DIFFICULTIES, s.difficulty) || s.size !== PIPE_DIFFICULTIES[s.difficulty].size || !validRoute(s.route, s.size) || s.source !== s.route[0] || s.sink !== s.route.at(-1) || s.inlet !== port(s.source, s.size) || s.outlet !== port(s.sink, s.size)) return false;
  const valid = tiles => Array.isArray(tiles) && tiles.length === s.size ** 2 && tiles.every((mask, i) => Number.isInteger(mask) && mask > 0 && mask < 16 && [0, 1, 2, 3].some(turn => rotateMask(s.solution[i], turn) === mask));
  if (!Array.isArray(s.solution) || s.solution.length !== s.size ** 2 || !valid(s.solution) || !pipeNetwork({ ...s, tiles: s.solution }).won) return false;
  return valid(s.tiles) && natural(s.moves) && natural(s.hints) && s.hints <= s.moves && Array.isArray(s.history) && s.history.length <= Math.min(100, s.moves) && s.history.every((h, i) => valid(h.tiles) && h.moves === s.moves - s.history.length + i && natural(h.hints) && h.hints <= h.moves) && s.best && Object.keys(PIPE_DIFFICULTIES).every(key => s.best[key] === null || natural(s.best[key]));
}
