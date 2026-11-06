import { natural, pick, adjacent } from './grid-route.mjs';
export const SNAKE_SPEEDS = { relaxed: { label: 'Relaxed', interval: 260 }, classic: { label: 'Classic', interval: 200 }, swift: { label: 'Swift', interval: 150 } };
export const SNAKE_DIRECTIONS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
function food(body, size, random) { const free = Array.from({ length: size ** 2 }, (_, i) => i).filter(i => !body.includes(i)); return free.length ? free[pick(free.length, random)] : null; }
export function createSnake(old = null, difficulty = old?.difficulty ?? 'relaxed', random = Math.random) {
  if (!Object.hasOwn(SNAKE_SPEEDS, difficulty)) difficulty = 'classic';
  const size = 16, body = [8 * size + 7, 8 * size + 6, 8 * size + 5];
  return { size, body, direction: 'right', queue: [], food: food(body, size, random), difficulty, score: 0, best: old?.best ?? 0, ticks: 0, paused: true, result: null };
}
export function turnSnake(s, direction) {
  if (s.result || !Object.hasOwn(SNAKE_DIRECTIONS, direction) || s.queue.length >= 2) return s;
  const previous = s.queue.at(-1) ?? s.direction;
  if (direction === previous || direction === opposite[previous]) return s;
  return { ...s, queue: [...s.queue, direction] };
}
export function stepSnake(s, random = Math.random) {
  if (s.paused || s.result) return s;
  const direction = s.queue[0] ?? s.direction, [dx, dy] = SNAKE_DIRECTIONS[direction], head = s.body[0];
  const x = head % s.size + dx, y = Math.floor(head / s.size) + dy, next = y * s.size + x, eating = next === s.food;
  if (x < 0 || x >= s.size || y < 0 || y >= s.size || (eating ? s.body : s.body.slice(0, -1)).includes(next)) return { ...s, direction, queue: [], ticks: s.ticks + 1, paused: true, result: 'lost' };
  const body = [next, ...s.body]; if (!eating) body.pop();
  const score = s.score + (eating ? 10 : 0), won = body.length === s.size ** 2;
  return { ...s, body, direction, queue: s.queue.slice(1), food: eating ? food(body, s.size, random) : s.food, score, best: Math.max(s.best, score), ticks: s.ticks + 1, result: won ? 'won' : null, paused: won };
}
export function isValidSnake(s) {
  if (!s || s.size !== 16 || !Object.hasOwn(SNAKE_SPEEDS, s.difficulty) || !Object.hasOwn(SNAKE_DIRECTIONS, s.direction)) return false;
  if (!Array.isArray(s.body) || s.body.length < 3 || s.body.length > 256 || new Set(s.body).size !== s.body.length || !s.body.every((n, i) => Number.isInteger(n) && n >= 0 && n < 256 && (!i || adjacent(n, s.body[i - 1], 16)))) return false;
  if (!Array.isArray(s.queue) || s.queue.length > 2 || !s.queue.every((d, i) => Object.hasOwn(SNAKE_DIRECTIONS, d) && d !== (i ? s.queue[i - 1] : s.direction) && d !== opposite[i ? s.queue[i - 1] : s.direction])) return false;
  return natural(s.score) && s.score === (s.body.length - 3) * 10 && natural(s.best) && s.best >= s.score && natural(s.ticks) && typeof s.paused === 'boolean' && [null, 'won', 'lost'].includes(s.result) && (s.result === 'won' ? s.body.length === 256 && s.food === null : Number.isInteger(s.food) && s.food >= 0 && s.food < 256 && !s.body.includes(s.food));
}
