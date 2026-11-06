import { gridRoute, validRoute, gridNeighbors, adjacent, pick, natural } from './grid-route.mjs';
export const FLOW_DIFFICULTIES = { quick: { label: 'Quick · 5 × 5', size: 5, colors: 5 }, classic: { label: 'Classic · 6 × 6', size: 6, colors: 6 } };
export const FLOW_COLORS = ['Mint', 'Coral', 'Amber', 'Violet', 'Sky', 'Rose'];
const snapshot = s => ({ paths: s.paths.map(p => [...p]), moves: s.moves, hints: s.hints });
export function createFlow(old = null, difficulty = old?.difficulty ?? 'quick', random = Math.random) {
  if (!Object.hasOwn(FLOW_DIFFICULTIES, difficulty)) difficulty = 'quick';
  const { size, colors } = FLOW_DIFFICULTIES[difficulty], route = gridRoute(size, random), lengths = Array(colors).fill(3);
  for (let i = colors * 3; i < size ** 2; i++) lengths[pick(colors, random)]++;
  let offset = 0; const solution = lengths.map(length => { const path = route.slice(offset, offset + length); offset += length; return path; });
  return { difficulty, size, pairs: solution.map(p => [p[0], p.at(-1)]), solution, paths: Array.from({ length: colors }, () => []), active: null, moves: 0, hints: 0, history: [], best: { quick: null, classic: null, ...old?.best } };
}
export const flowConnected = (s, color) => { const path = s.paths[color], pair = s.pairs[color]; return path.length > 1 && pair.includes(path[0]) && pair.includes(path.at(-1)) && path[0] !== path.at(-1); };
export const isFlowComplete = s => s.paths.every((_, color) => flowConnected(s, color)) && s.paths.reduce((sum, path) => sum + path.length, 0) === s.size ** 2;
export function beginFlow(s, index) {
  if (isFlowComplete(s) || s.active !== null || !Number.isInteger(index)) return s;
  let color = s.pairs.findIndex(pair => pair.includes(index));
  if (color < 0) color = s.paths.findIndex(path => path.includes(index));
  if (color < 0) return s;
  const paths = s.paths.map(p => [...p]), path = paths[color], pair = s.pairs[color];
  if (pair.includes(index)) paths[color] = [index];
  else paths[color] = path.slice(0, path.indexOf(index) + 1);
  return { ...s, paths, active: color, moves: s.moves + 1, history: [...s.history, snapshot(s)].slice(-100) };
}
export function extendFlow(s, index) {
  const color = s.active; if (color === null || !Number.isInteger(index) || index < 0 || index >= s.size ** 2) return s;
  const path = s.paths[color], previous = path.at(-1);
  if (previous === index || !adjacent(previous, index, s.size)) return s;
  const existing = path.indexOf(index), paths = s.paths.map(p => [...p]);
  if (existing >= 0) { paths[color] = path.slice(0, existing + 1); return { ...s, paths }; }
  if (flowConnected(s, color) || s.pairs.some((pair, c) => c !== color && pair.includes(index)) || s.paths.some((p, c) => c !== color && p.includes(index))) return s;
  paths[color].push(index); return { ...s, paths };
}
export function finishFlow(s) {
  if (s.active === null) return s;
  const next = { ...s, active: null };
  if (isFlowComplete(next) && !next.hints) next.best = { ...next.best, [s.difficulty]: Math.min(next.best[s.difficulty] ?? Infinity, next.moves) };
  return next;
}
export function undoFlow(s) { return s.history.length ? { ...s, ...structuredClone(s.history.at(-1)), active: null, history: s.history.slice(0, -1) } : s; }
export function hintFlow(s) {
  if (isFlowComplete(s)) return s;
  const color = s.paths.findIndex((p, c) => JSON.stringify(p) !== JSON.stringify(s.solution[c]));
  const cells = new Set(s.solution[color]), paths = s.paths.map((p, c) => c === color ? [...s.solution[c]] : p.some(i => cells.has(i)) ? [] : [...p]);
  return { ...s, paths, active: null, hints: s.hints + 1, moves: s.moves + 1, history: [...s.history, snapshot(s)].slice(-100) };
}
export function isValidFlow(s) {
  if (!s || !Object.hasOwn(FLOW_DIFFICULTIES, s.difficulty)) return false;
  const { size, colors } = FLOW_DIFFICULTIES[s.difficulty];
  if (s.size !== size || !Array.isArray(s.solution) || s.solution.length !== colors || !validRoute(s.solution.flat(), size) || !s.solution.every(p => p.length >= 3) || !Array.isArray(s.pairs) || s.pairs.length !== colors || !s.pairs.every((pair, c) => Array.isArray(pair) && pair.length === 2 && pair[0] === s.solution[c][0] && pair[1] === s.solution[c].at(-1))) return false;
  function validPaths(paths) {
    if (!Array.isArray(paths) || paths.length !== colors || !paths.every(Array.isArray)) return false;
    const all = paths.flat(); if (new Set(all).size !== all.length) return false;
    return paths.every((p, c) => !p.length || s.pairs[c].includes(p[0]) && p.every((n, i) => Number.isInteger(n) && n >= 0 && n < size ** 2 && (!i || adjacent(p[i - 1], n, size)) && !s.pairs.some((pair, other) => other !== c && pair.includes(n))) && !p.slice(1, -1).some(n => s.pairs[c].includes(n)));
  }
  return validPaths(s.paths) && (s.active === null || Number.isInteger(s.active) && s.active >= 0 && s.active < colors && s.paths[s.active].length > 0) && natural(s.moves) && natural(s.hints) && s.hints <= s.moves && Array.isArray(s.history) && s.history.length <= Math.min(100, s.moves) && s.history.every((h, i) => validPaths(h.paths) && h.moves === s.moves - s.history.length + i && natural(h.hints) && h.hints <= h.moves) && s.best && Object.keys(FLOW_DIFFICULTIES).every(key => s.best[key] === null || natural(s.best[key]));
}
export { gridNeighbors };
