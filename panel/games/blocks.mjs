export const BLOCK_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const SHAPES = {
  I: [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
  ],
  O: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  T: [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  S: [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  Z: [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  J: [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  L: [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
};
export function blockCells(piece) {
  let cells = SHAPES[piece.type].map((c) => [...c]);
  const size = piece.type === 'I' ? 4 : piece.type === 'O' ? 2 : 3;
  for (let i = 0; i < (piece.type === 'O' ? 0 : piece.rotation); i++)
    cells = cells.map(([x, y]) => [size - 1 - y, x]);
  return cells.map(([x, y]) => [x + piece.x, y + piece.y]);
}
export function fitsBlock(board, piece) {
  return blockCells(piece).every(
    ([x, y]) =>
      x >= 0 && x < 10 && y < 20 && y >= -4 && (y < 0 || !board[y * 10 + x]),
  );
}
function bag(random) {
  const list = [...BLOCK_TYPES];
  for (let i = 6; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
const spawn = (type) => ({ type, rotation: 0, x: type === 'O' ? 4 : 3, y: -1 });
function refill(queue, random) {
  return queue.length < 7 ? [...queue, ...bag(random)] : queue;
}
export function createBlocks(best = 0, random = Math.random) {
  const queue = bag(random);
  return {
    board: Array(200).fill(0),
    active: spawn(queue.shift()),
    queue: refill(queue, random),
    hold: null,
    holdUsed: false,
    score: 0,
    best,
    lines: 0,
    pieces: 0,
    combo: -1,
    paused: true,
    over: false,
  };
}
export function translateBlock(s, dx, dy) {
  if (s.over || s.paused) return s;
  const active = { ...s.active, x: s.active.x + dx, y: s.active.y + dy };
  return fitsBlock(s.board, active) ? { ...s, active } : s;
}
// Super Rotation System kick tables; stored offsets use downward-positive screen Y.
const KICKS = {
  '0>1': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '1>0': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  '1>2': [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, -2],
    [1, -2],
  ],
  '2>1': [
    [0, 0],
    [-1, 0],
    [-1, -1],
    [0, 2],
    [-1, 2],
  ],
  '2>3': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
  '3>2': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '3>0': [
    [0, 0],
    [-1, 0],
    [-1, 1],
    [0, -2],
    [-1, -2],
  ],
  '0>3': [
    [0, 0],
    [1, 0],
    [1, -1],
    [0, 2],
    [1, 2],
  ],
};
const IKICKS = {
  '0>1': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  '1>0': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  '1>2': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
  '2>1': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  '2>3': [
    [0, 0],
    [2, 0],
    [-1, 0],
    [2, -1],
    [-1, 2],
  ],
  '3>2': [
    [0, 0],
    [-2, 0],
    [1, 0],
    [-2, 1],
    [1, -2],
  ],
  '3>0': [
    [0, 0],
    [1, 0],
    [-2, 0],
    [1, 2],
    [-2, -1],
  ],
  '0>3': [
    [0, 0],
    [-1, 0],
    [2, 0],
    [-1, -2],
    [2, 1],
  ],
};
export function rotateBlock(s, dir = 1) {
  if (s.over || s.paused || s.active.type === 'O') return s;
  const rotation = (s.active.rotation + dir + 4) % 4;
  for (const [x, y] of (s.active.type === 'I' ? IKICKS : KICKS)[
    s.active.rotation + '>' + rotation
  ]) {
    const active = {
      ...s.active,
      rotation,
      x: s.active.x + x,
      y: s.active.y + y,
    };
    if (fitsBlock(s.board, active)) return { ...s, active };
  }
  return s;
}
export function ghostBlock(s) {
  let p = { ...s.active };
  while (fitsBlock(s.board, { ...p, y: p.y + 1 })) p.y++;
  return p;
}
export function lockBlock(s, random = Math.random) {
  if (s.over || s.paused) return s;
  const cells = blockCells(s.active);
  if (cells.some(([, y]) => y < 0)) return { ...s, over: true };
  let board = [...s.board];
  cells.forEach(
    ([x, y]) => (board[y * 10 + x] = BLOCK_TYPES.indexOf(s.active.type) + 1),
  );
  const rows = Array.from({ length: 20 }, (_, r) =>
      board.slice(r * 10, r * 10 + 10),
    ),
    kept = rows.filter((row) => row.some((v) => !v)),
    cleared = 20 - kept.length;
  board = [...Array(cleared * 10).fill(0), ...kept.flat()];
  const combo = cleared ? s.combo + 1 : -1,
    score =
      s.score +
      ([0, 100, 300, 500, 800][cleared] + Math.max(0, combo) * 50) *
        (Math.floor(s.lines / 10) + 1);
  const queue = refill([...s.queue], random),
    active = spawn(queue.shift());
  return {
    ...s,
    board,
    active,
    queue: refill(queue, random),
    holdUsed: false,
    score,
    best: Math.max(s.best, score),
    lines: s.lines + cleared,
    pieces: s.pieces + 1,
    combo,
    over: !fitsBlock(board, active),
  };
}
export function hardDropBlock(s, random = Math.random) {
  if (s.over || s.paused) return s;
  const active = ghostBlock(s),
    score = s.score + (active.y - s.active.y) * 2;
  return lockBlock(
    { ...s, active, score, best: Math.max(s.best, score) },
    random,
  );
}
export function holdBlock(s, random = Math.random) {
  if (s.over || s.paused || s.holdUsed) return s;
  const queue = refill([...s.queue], random),
    active = spawn(s.hold ?? queue.shift());
  return {
    ...s,
    active,
    queue: refill(queue, random),
    hold: s.active.type,
    holdUsed: true,
    over: !fitsBlock(s.board, active),
  };
}
export function tickBlock(s, random = Math.random) {
  const next = translateBlock(s, 0, 1);
  return next === s ? lockBlock(s, random) : next;
}
export function isValidBlocks(s) {
  return !!(
    s &&
    Array.isArray(s.board) &&
    s.board.length === 200 &&
    s.board.every((v) => Number.isInteger(v) && v >= 0 && v <= 7) &&
    s.active &&
    BLOCK_TYPES.includes(s.active.type) &&
    Number.isInteger(s.active.rotation) &&
    s.active.rotation >= 0 &&
    s.active.rotation < 4 &&
    Number.isInteger(s.active.x) &&
    Number.isInteger(s.active.y) &&
    s.active.y >= -4 &&
    s.active.y < 20 &&
    Array.isArray(s.queue) &&
    s.queue.length >= 7 &&
    s.queue.length <= 14 &&
    s.queue.every((t) => BLOCK_TYPES.includes(t)) &&
    (s.hold === null || BLOCK_TYPES.includes(s.hold)) &&
    ['score', 'best', 'lines', 'pieces'].every(
      (k) => Number.isSafeInteger(s[k]) && s[k] >= 0,
    ) &&
    s.best >= s.score &&
    Number.isInteger(s.combo) &&
    s.combo >= -1 &&
    ['over', 'paused', 'holdUsed'].every((k) => typeof s[k] === 'boolean') &&
    (s.over || fitsBlock(s.board, s.active))
  );
}
