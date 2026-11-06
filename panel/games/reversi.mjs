import { natural, pick } from './grid-route.mjs';
const rays = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
export function reversiFlips(board, index, turn) {
  if (!Number.isInteger(index) || index < 0 || index >= 64 || board[index] !== 0) return [];
  const flips = [], row = Math.floor(index / 8), col = index % 8;
  for (const [dr, dc] of rays) {
    const line = []; let r = row + dr, c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === -turn) { line.push(r * 8 + c); r += dr; c += dc; }
    if (line.length && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === turn) flips.push(...line);
  }
  return flips;
}
export const reversiMoves = (s, turn = s.turn) => s.result ? [] : s.board.flatMap((p, index) => !p && reversiFlips(s.board, index, turn).length ? [index] : []);
export function createReversi(old = null, mode = old?.mode ?? 'computer') {
  if (!['computer', 'local'].includes(mode)) mode = 'computer';
  const board = Array(64).fill(0); board[27] = board[36] = -1; board[28] = board[35] = 1;
  return { board, mode, turn: 1, moves: 0, passed: null, result: null, lastMove: null, history: [] };
}
export function moveReversi(s, index, record = true) {
  if (s.result) return s;
  const flips = reversiFlips(s.board, index, s.turn); if (!flips.length) return s;
  const board = [...s.board]; board[index] = s.turn; flips.forEach(i => board[i] = s.turn);
  const { history, ...snapshot } = s;
  const next = { ...s, board, turn: -s.turn, moves: s.moves + 1, lastMove: index, passed: null, history: record ? [...history, snapshot].slice(-60) : history };
  if (!reversiMoves(next).length) {
    if (reversiMoves(next, s.turn).length) { next.passed = -s.turn; next.turn = s.turn; }
    else { const score = board.reduce((sum, p) => sum + p, 0); next.result = score > 0 ? 1 : score < 0 ? -1 : 'draw'; }
  }
  return next;
}
export function undoReversi(s) {
  if (!s.history.length) return s; let index = s.history.length - 1;
  if (s.mode === 'computer') while (index > 0 && s.history[index].turn !== 1) index--;
  return { ...structuredClone(s.history[index]), history: s.history.slice(0, index) };
}
export function chooseReversiMove(s, random = Math.random) {
  const moves = reversiMoves(s); if (!moves.length) return null;
  const corners = new Set([0, 7, 56, 63]), risky = new Set([1, 6, 8, 9, 14, 15, 48, 49, 54, 55, 57, 62]);
  function value(n, player) {
    if (n.result) return n.result === 'draw' ? 0 : n.result === player ? 10000 : -10000;
    return n.board.reduce((total, p, i) => total + p * player * (corners.has(i) ? 140 : risky.has(i) ? -25 : 2), 0) + 7 * (reversiMoves(n, player).length - reversiMoves(n, -player).length);
  }
  let best = -Infinity, choices = [];
  for (const index of moves) {
    const next = moveReversi(s, index, false), replies = reversiMoves(next);
    const score = next.turn === s.turn || next.result || !replies.length ? value(next, s.turn) : Math.min(...replies.map(reply => value(moveReversi(next, reply, false), s.turn)));
    if (score > best) { best = score; choices = [index]; } else if (score === best) choices.push(index);
  }
  return choices[pick(choices.length, random)];
}
export function isValidReversi(s) {
  const valid = v => v && Array.isArray(v.board) && v.board.length === 64 && v.board.every(p => [0, 1, -1].includes(p)) && [1, -1].includes(v.turn) && ['local', 'computer'].includes(v.mode) && natural(v.moves) && v.moves <= 60 && v.board.filter(Boolean).length === v.moves + 4 && [null, 1, -1, 'draw'].includes(v.result) && [null, 1, -1].includes(v.passed) && (v.lastMove === null ? v.moves === 0 : Number.isInteger(v.lastMove) && v.lastMove >= 0 && v.lastMove < 64 && !!v.board[v.lastMove]);
  if (!valid(s) || !Array.isArray(s.history) || s.history.length > s.moves || !s.history.every((h, i) => valid(h) && h.moves === s.moves - s.history.length + i && !h.result)) return false;
  if (s.result) { const score = s.board.reduce((sum, p) => sum + p, 0); return !reversiMoves({ ...s, result: null }, 1).length && !reversiMoves({ ...s, result: null }, -1).length && s.result === (score > 0 ? 1 : score < 0 ? -1 : 'draw'); }
  return reversiMoves(s).length > 0;
}
