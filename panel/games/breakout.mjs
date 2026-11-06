import { natural } from './grid-route.mjs';
export const BREAKOUT_WIDTH = 320, BREAKOUT_HEIGHT = 440;
export const BREAKOUT_DIFFICULTIES = { relaxed: { label: 'Relaxed', speed: 185, paddle: 82, rows: 4 }, classic: { label: 'Classic', speed: 230, paddle: 66, rows: 5 }, swift: { label: 'Swift', speed: 275, paddle: 58, rows: 5 } };
export const brickRect = index => ({ x: 20 + index % 8 * 35, y: 48 + Math.floor(index / 8) * 22, width: 31, height: 16 });
export function createBreakout(old = null, difficulty = old?.difficulty ?? 'classic') {
  if (!Object.hasOwn(BREAKOUT_DIFFICULTIES, difficulty)) difficulty = 'classic';
  const rule = BREAKOUT_DIFFICULTIES[difficulty];
  return { difficulty, bricks: Array.from({ length: rule.rows * 8 }, (_, i) => difficulty !== 'relaxed' && i < 8 ? 2 : 1), paddle: 160, ball: { x: 160, y: 397, vx: 0, vy: 0 }, phase: 'ready', paused: true, lives: 3, score: 0, best: old?.best ?? 0, combo: 0 };
}
export function steerBreakout(s, x) {
  if (!Number.isFinite(x) || ['won', 'lost'].includes(s.phase)) return s;
  const half = BREAKOUT_DIFFICULTIES[s.difficulty].paddle / 2, paddle = Math.max(half + 8, Math.min(BREAKOUT_WIDTH - half - 8, x));
  return { ...s, paddle, ball: s.phase === 'ready' ? { ...s.ball, x: paddle } : s.ball };
}
export function launchBreakout(s) {
  if (s.phase !== 'ready') return s.paused && s.phase === 'playing' ? { ...s, paused: false } : s;
  const speed = BREAKOUT_DIFFICULTIES[s.difficulty].speed;
  return { ...s, phase: 'playing', paused: false, ball: { ...s.ball, vx: speed * 0.3, vy: -speed * Math.sqrt(0.91) } };
}
export function stepBreakout(s, seconds, direction = 0) {
  if (s.phase !== 'playing' || s.paused || !Number.isFinite(seconds) || seconds <= 0) return s;
  seconds = Math.min(seconds, 0.08); const rule = BREAKOUT_DIFFICULTIES[s.difficulty], count = Math.max(1, Math.ceil(seconds / 0.006)), dt = seconds / count;
  const next = { ...s, bricks: [...s.bricks], ball: { ...s.ball } }, ball = next.ball;
  for (let tick = 0; tick < count; tick++) {
    next.paddle = Math.max(rule.paddle / 2 + 8, Math.min(320 - rule.paddle / 2 - 8, next.paddle + Math.sign(direction) * 285 * dt));
    const oldX = ball.x, oldY = ball.y; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.x < 7 || ball.x > 313) { ball.x = Math.max(7, Math.min(313, ball.x)); ball.vx = -ball.vx; }
    if (ball.y < 8) { ball.y = 8; ball.vy = Math.abs(ball.vy); }
    if (ball.vy > 0 && oldY <= 402 && ball.y >= 402 && Math.abs(ball.x - next.paddle) <= rule.paddle / 2 + 5) {
      const offset = Math.max(-1, Math.min(1, (ball.x - next.paddle) / (rule.paddle / 2))), angle = offset * Math.PI / 3;
      ball.vx = rule.speed * Math.sin(angle); ball.vy = -Math.max(90, rule.speed * Math.cos(angle)); ball.y = 401; next.combo = 0;
    }
    for (let i = 0; i < next.bricks.length; i++) {
      if (!next.bricks[i]) continue; const b = brickRect(i), closestX = Math.max(b.x, Math.min(b.x + b.width, ball.x)), closestY = Math.max(b.y, Math.min(b.y + b.height, ball.y));
      if (Math.hypot(ball.x - closestX, ball.y - closestY) > 5) continue;
      next.bricks[i]--; next.combo++; next.score += 10 * Math.min(5, next.combo);
      if (oldY <= b.y - 5 || oldY >= b.y + b.height + 5) { ball.vy = -ball.vy; ball.y = oldY; } else { ball.vx = -ball.vx; ball.x = oldX; }
      break;
    }
    if (next.bricks.every(n => !n)) { next.phase = 'won'; next.paused = true; break; }
    if (ball.y > 447) {
      next.lives--; next.combo = 0; next.paused = true; next.phase = next.lives ? 'ready' : 'lost';
      next.ball = { x: next.paddle, y: 397, vx: 0, vy: 0 }; break;
    }
  }
  next.best = Math.max(next.best, next.score); return next;
}
export function isValidBreakout(s) {
  if (!s || !Object.hasOwn(BREAKOUT_DIFFICULTIES, s.difficulty)) return false;
  const rule = BREAKOUT_DIFFICULTIES[s.difficulty], half = rule.paddle / 2;
  return Array.isArray(s.bricks) && s.bricks.length === rule.rows * 8 && s.bricks.every((n, i) => Number.isInteger(n) && n >= 0 && n <= (s.difficulty !== 'relaxed' && i < 8 ? 2 : 1)) && Number.isFinite(s.paddle) && s.paddle >= half + 8 && s.paddle <= 312 - half && s.ball && ['x', 'y', 'vx', 'vy'].every(k => Number.isFinite(s.ball[k])) && s.ball.x >= 0 && s.ball.x <= 320 && s.ball.y >= 0 && s.ball.y <= 450 && Math.abs(s.ball.vx) <= 400 && Math.abs(s.ball.vy) <= 400 && ['ready', 'playing', 'won', 'lost'].includes(s.phase) && typeof s.paused === 'boolean' && natural(s.lives) && s.lives <= 3 && natural(s.score) && natural(s.best) && s.best >= s.score && natural(s.combo) && (s.phase === 'won' ? s.bricks.every(n => !n) : s.bricks.some(Boolean)) && (s.phase === 'lost' ? s.lives === 0 : s.lives > 0) && (s.phase !== 'ready' || s.ball.vx === 0 && s.ball.vy === 0);
}
