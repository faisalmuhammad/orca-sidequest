const DIRECTIONS = new Set(['left', 'right', 'up', 'down']);

export function slideLine(line) {
  const tiles = line.filter(Boolean);
  const result = [];
  const merged = [];
  let score = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === tiles[i + 1]) {
      const value = tiles[i] * 2;
      merged.push(result.length);
      result.push(value);
      score += value;
      i++;
    } else {
      result.push(tiles[i]);
    }
  }
  while (result.length < 4) result.push(0);
  return { line: result, score, merged };
}

export function slideBoard(board, direction) {
  if (!DIRECTIONS.has(direction)) throw new Error('Unknown direction');
  const result = [...board];
  const merged = [];
  const movements = [];
  let score = 0;
  for (let row = 0; row < 4; row++) {
    const indices = Array.from({ length: 4 }, (_, col) => {
      if (direction === 'left') return row * 4 + col;
      if (direction === 'right') return row * 4 + 3 - col;
      if (direction === 'up') return col * 4 + row;
      return (3 - col) * 4 + row;
    });
    const move = slideLine(indices.map(index => board[index]));
    const occupied = indices.filter(index => board[index]);
    let target = 0;
    for (let i = 0; i < occupied.length; i++) {
      const from = occupied[i], pair = board[from] === board[occupied[i + 1]];
      movements.push({ from, to: indices[target], value: board[from], merge: pair });
      if (pair) {
        movements.push({ from: occupied[++i], to: indices[target], value: board[from], merge: true });
      }
      target++;
    }
    indices.forEach((index, col) => { result[index] = move.line[col]; });
    merged.push(...move.merged.map(col => indices[col]));
    score += move.score;
  }
  return { board: result, score, merged, movements, changed: result.some((value, i) => value !== board[i]) };
}

export function spawnTile(board, random = Math.random) {
  const empty = board.flatMap((value, index) => value === 0 ? [index] : []);
  if (!empty.length) return { board: [...board], spawned: -1 };
  const index = empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
  const next = [...board];
  next[index] = random() < 0.9 ? 2 : 4;
  return { board: next, spawned: index };
}

export function create2048(best = 0, random = Math.random) {
  let board = Array(16).fill(0);
  board = spawnTile(board, random).board;
  board = spawnTile(board, random).board;
  return { board, score: 0, best, moves: 0, previous: null, winAcknowledged: false };
}

export function move2048(state, direction, random = Math.random) {
  const slide = slideBoard(state.board, direction);
  if (!slide.changed) return { state, changed: false, merged: [], spawned: -1 };
  const { board, spawned } = spawnTile(slide.board, random);
  const score = state.score + slide.score;
  return {
    state: {
      ...state, board, score, best: Math.max(state.best, score), moves: state.moves + 1,
      previous: { board: [...state.board], score: state.score, moves: state.moves, winAcknowledged: state.winAcknowledged },
    },
    changed: true, merged: slide.merged, movements: slide.movements, spawned, gained: slide.score,
  };
}

export function undo2048(state) {
  return state.previous ? { ...state, ...state.previous, previous: null } : state;
}

export function is2048Over(board) {
  if (board.includes(0)) return false;
  return board.every((value, i) =>
    (i % 4 === 3 || value !== board[i + 1]) && (i >= 12 || value !== board[i + 4]));
}

function validBoard(board) {
  return Array.isArray(board) && board.length === 16 && board.every(value =>
    Number.isInteger(value) && value >= 0 && value <= 2 ** 30 && (value === 0 || (value >= 2 && Number.isInteger(Math.log2(value)))));
}
const counter = value => Number.isSafeInteger(value) && value >= 0;

export function isValid2048(state) {
  return !!state && validBoard(state.board) && state.board.some(Boolean) &&
    counter(state.score) && counter(state.best) && state.best >= state.score && counter(state.moves) &&
    typeof state.winAcknowledged === 'boolean' &&
    (state.previous === null || (!!state.previous && validBoard(state.previous.board) &&
      counter(state.previous.score) && counter(state.previous.moves) && typeof state.previous.winAcknowledged === 'boolean'));
}
