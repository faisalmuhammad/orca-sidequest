import { natural, pick } from './grid-route.mjs';
export const BUBBLE_WIDTH = 320, BUBBLE_HEIGHT = 420, BUBBLE_RADIUS = 16, BUBBLE_COLS = 8, BUBBLE_ROWS = 11;
export const bubbleCenter = index => { const row = Math.floor(index / BUBBLE_COLS); return { x: 32 + index % BUBBLE_COLS * 34 + row % 2 * 17, y: 28 + row * Math.sqrt(3) * 17 }; };
export function bubbleNeighbors(index) {
  const a = bubbleCenter(index), row = Math.floor(index / BUBBLE_COLS), out = [];
  for (let r = Math.max(0, row - 1); r <= Math.min(BUBBLE_ROWS - 1, row + 1); r++) for (let c = 0; c < BUBBLE_COLS; c++) { const i = r * BUBBLE_COLS + c, b = bubbleCenter(i); if (i !== index && Math.hypot(a.x - b.x, a.y - b.y) < 35) out.push(i); }
  return out;
}
const colorPool = board => [...new Set(board.filter(c => c !== null))];
const ammo = (board, random) => { const pool = colorPool(board); return pool.length ? pool[pick(pool.length, random)] : 0; };
const snapshot = s => { const { history, ...rest } = s; return rest; };
export function createBubbles(old = null, _difficulty, random = Math.random) {
  const board = Array.from({ length: BUBBLE_ROWS * BUBBLE_COLS }, (_, i) => i < BUBBLE_COLS * 5 ? pick(4, random) : null);
  return { board, current: ammo(board, random), next: ammo(board, random), aim: 0, shots: 0, misses: 0, score: 0, best: old?.best ?? 0, result: null, history: [] };
}
export function swapBubbles(s) { return s.result || s.current === s.next ? s : { ...s, current: s.next, next: s.current }; }
function region(board, start, color) {
  const seen = new Set([start]), queue = [start];
  for (let q = 0; q < queue.length; q++) for (const i of bubbleNeighbors(queue[q])) if (!seen.has(i) && board[i] === color) { seen.add(i); queue.push(i); }
  return seen;
}
export function fireBubble(s, angle = s.aim, random = Math.random) {
  if (s.result || !Number.isFinite(angle)) return { state: s, path: [], popped: [] };
  angle = Math.max(-70, Math.min(70, angle));
  const radians = angle * Math.PI / 180; let x = 160, y = 391, dx = Math.sin(radians) * 2.5, dy = -Math.cos(radians) * 2.5, touched = -1, ceiling = false;
  const path = [{ x, y }];
  for (let step = 0; step < 750; step++) {
    x += dx; y += dy;
    if (x < BUBBLE_RADIUS || x > BUBBLE_WIDTH - BUBBLE_RADIUS) { x = x < BUBBLE_RADIUS ? 2 * BUBBLE_RADIUS - x : 2 * (BUBBLE_WIDTH - BUBBLE_RADIUS) - x; dx = -dx; }
    if (step % 3 === 0) path.push({ x, y });
    if (y <= 28) { ceiling = true; break; }
    touched = s.board.findIndex((color, index) => { if (color === null) return false; const p = bubbleCenter(index); return Math.hypot(x - p.x, y - p.y) <= BUBBLE_RADIUS * 2 - 0.2; });
    if (touched >= 0) break;
  }
  path.push({ x, y });
  const choices = ceiling ? Array.from({ length: BUBBLE_COLS }, (_, i) => i).filter(i => s.board[i] === null) : touched >= 0 ? bubbleNeighbors(touched).filter(i => s.board[i] === null) : [];
  choices.sort((a, b) => { const p = bubbleCenter(a), q = bubbleCenter(b); return Math.hypot(x - p.x, y - p.y) - Math.hypot(x - q.x, y - q.y); });
  const board = [...s.board], popped = []; let misses = s.misses, score = s.score;
  if (choices.length) {
    const index = choices[0]; board[index] = s.current; const cluster = region(board, index, s.current);
    if (cluster.size >= 3) {
      for (const i of cluster) { popped.push({ ...bubbleCenter(i), color: board[i] }); board[i] = null; score += 10; }
      const attached = new Set(), queue = [];
      for (let i = 0; i < BUBBLE_COLS; i++) if (board[i] !== null) { attached.add(i); queue.push(i); }
      for (let q = 0; q < queue.length; q++) for (const i of bubbleNeighbors(queue[q])) if (board[i] !== null && !attached.has(i)) { attached.add(i); queue.push(i); }
      board.forEach((color, i) => { if (color !== null && !attached.has(i)) { popped.push({ ...bubbleCenter(i), color }); board[i] = null; score += 20; } });
      misses = 0;
    } else misses++;
  } else misses++;
  let lost = !choices.length;
  if (misses >= 5 && board.some(c => c !== null)) {
    if (board.slice(-BUBBLE_COLS).some(c => c !== null)) lost = true;
    for (let i = board.length - 1; i >= BUBBLE_COLS; i--) board[i] = board[i - BUBBLE_COLS];
    const pool = colorPool(board); for (let i = 0; i < BUBBLE_COLS; i++) board[i] = pool.length ? pool[pick(pool.length, random)] : 0;
    misses = 0;
  }
  if (board.slice(-BUBBLE_COLS).some(c => c !== null)) lost = true;
  const won = board.every(c => c === null), pool = colorPool(board);
  const state = { ...s, board, aim: angle, current: pool.includes(s.next) ? s.next : ammo(board, random), next: ammo(board, random), shots: s.shots + 1, misses, score, best: Math.max(s.best, score), result: won ? 'won' : lost ? 'lost' : null, history: [...s.history, snapshot(s)].slice(-40) };
  return { state, path, popped };
}
export function undoBubbles(s) { return s.history.length ? { ...structuredClone(s.history.at(-1)), best: s.best, history: s.history.slice(0, -1) } : s; }
export function isValidBubbles(s) {
  const valid = v => v && Array.isArray(v.board) && v.board.length === BUBBLE_ROWS * BUBBLE_COLS && v.board.every(c => c === null || Number.isInteger(c) && c >= 0 && c < 4) && [v.current, v.next].every(c => Number.isInteger(c) && c >= 0 && c < 4) && Number.isFinite(v.aim) && Math.abs(v.aim) <= 70 && natural(v.shots) && natural(v.misses) && v.misses < 5 && natural(v.score) && natural(v.best) && v.best >= v.score && [null, 'won', 'lost'].includes(v.result) && (v.result === 'won' ? v.board.every(c => c === null) : v.board.some(c => c !== null)) && (v.result !== null || v.board.slice(-BUBBLE_COLS).every(c => c === null));
  return !!(valid(s) && Array.isArray(s.history) && s.history.length <= Math.min(40, s.shots) && s.history.every((h, i) => valid(h) && h.result === null && h.shots === s.shots - s.history.length + i));
}
