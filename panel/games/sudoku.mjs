export const DIFFICULTIES = { easy: { label: 'Easy', clues: 40 }, medium: { label: 'Medium', clues: 34 }, hard: { label: 'Hard', clues: 28 } };
const ALL = 0b1111111110;
const rowOf = index => Math.floor(index / 9);
const colOf = index => index % 9;
const boxOf = index => Math.floor(index / 27) * 3 + Math.floor((index % 9) / 3);
const isGrid = grid => Array.isArray(grid) && grid.length === 81 && grid.every(value => Number.isInteger(value) && value >= 0 && value <= 9);

export function countSolutions(grid, limit = 2) {
  if (!isGrid(grid)) return 0;
  const cells = [...grid], rows = Array(9).fill(0), cols = Array(9).fill(0), boxes = Array(9).fill(0);
  for (let i = 0; i < 81; i++) {
    if (!cells[i]) continue;
    const bit = 1 << cells[i], row = rowOf(i), col = colOf(i), box = boxOf(i);
    if ((rows[row] | cols[col] | boxes[box]) & bit) return 0;
    rows[row] |= bit; cols[col] |= bit; boxes[box] |= bit;
  }
  let total = 0;
  function search() {
    if (total >= limit) return;
    let selected = -1, candidates = 0, smallest = 10;
    for (let i = 0; i < 81; i++) {
      if (cells[i]) continue;
      const mask = ALL & ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]);
      let count = 0;
      for (let bits = mask; bits; bits &= bits - 1) count++;
      if (!count) return;
      if (count < smallest) {
        selected = i; candidates = mask; smallest = count;
        if (count === 1) break;
      }
    }
    if (selected === -1) { total++; return; }
    const row = rowOf(selected), col = colOf(selected), box = boxOf(selected);
    for (let value = 1; value <= 9 && total < limit; value++) {
      const bit = 1 << value;
      if (!(candidates & bit)) continue;
      cells[selected] = value; rows[row] |= bit; cols[col] |= bit; boxes[box] |= bit;
      search();
      cells[selected] = 0; rows[row] &= ~bit; cols[col] &= ~bit; boxes[box] &= ~bit;
    }
  }
  search();
  return total;
}

function shuffle(items, random) {
  const values = [...items];
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export function createSudoku(difficulty = 'easy', random = Math.random) {
  if (!DIFFICULTIES[difficulty]) throw new Error('Unknown difficulty');
  const order = () => shuffle([0, 1, 2], random).flatMap(group => shuffle([0, 1, 2], random).map(i => group * 3 + i));
  const rows = order(), cols = order(), digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  const solution = rows.flatMap(row => cols.map(col => digits[(row * 3 + Math.floor(row / 3) + col) % 9]));
  const puzzle = [...solution];
  let clues = 81;
  for (const index of shuffle(Array.from({ length: 81 }, (_, i) => i), random)) {
    if (clues <= DIFFICULTIES[difficulty].clues) break;
    const value = puzzle[index];
    puzzle[index] = 0;
    if (countSolutions(puzzle) !== 1) puzzle[index] = value;
    else clues--;
  }
  return { puzzle, solution, values: [...puzzle], notes: Array(81).fill(0), difficulty, elapsedMs: 0, hintsUsed: 0, history: [], paused: false };
}

export function peers(index) {
  return Array.from({ length: 81 }, (_, i) => i).filter(i =>
    i !== index && (rowOf(i) === rowOf(index) || colOf(i) === colOf(index) || boxOf(i) === boxOf(index)));
}

export function sudokuConflicts(values) {
  const conflicts = new Set();
  for (let i = 0; i < 81; i++) {
    if (values[i] && peers(i).some(j => values[j] === values[i])) conflicts.add(i);
  }
  return conflicts;
}

export function candidates(values, index) {
  if (values[index]) return [];
  const used = new Set(peers(index).map(peer => values[peer]));
  return [1,2,3,4,5,6,7,8,9].filter(value => !used.has(value));
}

export function autoNotesSudoku(state) {
  if (isSudokuComplete(state) || state.paused) return state;
  const notes = state.values.map((value, index) => value ? 0 : candidates(state.values, index).reduce((mask, value) => mask | (1 << value), 0));
  if (notes.every((value, i) => value === state.notes[i])) return state;
  return { ...state, notes, history: [...state.history, { values: [...state.values], notes: [...state.notes], hintsUsed: state.hintsUsed }].slice(-100) };
}

export function hintExplanation(state, index) {
  const value = state.solution[index];
  const values = [...state.values];
  values[index] = 0;
  const allowed = candidates(values, index);
  const row = rowOf(index) + 1, col = colOf(index) + 1;
  if (allowed.length === 1 && allowed[0] === value) return `Only ${value} fits row ${row}, column ${col}. Its peers rule out every other number.`;
  if (!sudokuConflicts(values).size) {
    const units = [
      { name: `row ${row}`, cells: peers(index).filter(i => rowOf(i) === rowOf(index)) },
      { name: `column ${col}`, cells: peers(index).filter(i => colOf(i) === colOf(index)) },
      { name: 'this 3 × 3 box', cells: peers(index).filter(i => boxOf(i) === boxOf(index)) },
    ];
    if (allowed.includes(value)) {
      const unit = units.find(unit => !unit.cells.some(i => values[i] === value || candidates(values, i).includes(value)));
      if (unit) return `${value} has only one possible place in ${unit.name}: this cell.`;
    }
  }
  return `${value} belongs in row ${row}, column ${col}. This is a revealed number; the current clues need more steps to explain it.`;
}

export function newlyCompletedCells(before, after, solution) {
  const cells = new Set();
  for (let unit = 0; unit < 9; unit++) {
    const groups = [
      Array.from({ length: 9 }, (_, i) => unit * 9 + i),
      Array.from({ length: 9 }, (_, i) => i * 9 + unit),
      Array.from({ length: 81 }, (_, i) => i).filter(i => boxOf(i) === unit),
    ];
    for (const group of groups) {
      if (group.every(i => after[i] === solution[i]) && !group.every(i => before[i] === solution[i])) {
        group.forEach(i => cells.add(i));
      }
    }
  }
  return [...cells];
}

export function isSudokuComplete(state) {
  return state.values.every((value, index) => value === state.solution[index]);
}

export function enterSudoku(state, index, value, pencil = false) {
  if (!Number.isInteger(index) || index < 0 || index > 80 || !Number.isInteger(value) || value < 0 || value > 9 || state.puzzle[index] || isSudokuComplete(state)) return state;
  if (pencil && value && state.values[index]) return state;
  const values = [...state.values], notes = [...state.notes];
  if (pencil && value) notes[index] ^= 1 << value;
  else { values[index] = value; notes[index] = 0; }
  if (values[index] === state.values[index] && notes[index] === state.notes[index]) return state;
  // A snapshot also restores notes removed from peer cells by an entry.
  const history = [...state.history, { values: [...state.values], notes: [...state.notes], hintsUsed: state.hintsUsed }].slice(-100);
  if (value && !pencil) {
    for (const peer of peers(index)) notes[peer] &= ~(1 << value);
  }
  return { ...state, values, notes, history };
}

export function hintSudoku(state, selected) {
  const index = Number.isInteger(selected) && selected >= 0 && selected < 81 && !state.puzzle[selected] && state.values[selected] !== state.solution[selected]
    ? selected : state.values.findIndex((value, i) => value !== state.solution[i]);
  if (index < 0) return { state, index: -1 };
  const next = enterSudoku(state, index, state.solution[index]);
  return { state: { ...next, hintsUsed: state.hintsUsed + 1 }, index, explanation: hintExplanation(state, index) };
}

export function undoSudoku(state) {
  if (!state.history.length) return state;
  return { ...state, ...state.history.at(-1), history: state.history.slice(0, -1) };
}

const validNotes = notes => Array.isArray(notes) && notes.length === 81 && notes.every(mask => Number.isInteger(mask) && mask >= 0 && mask <= ALL && (mask & ~ALL) === 0);
const counter = value => Number.isSafeInteger(value) && value >= 0;
export function isValidSudoku(state) {
  return !!state && Object.hasOwn(DIFFICULTIES, state.difficulty) && isGrid(state.puzzle) && isGrid(state.solution) &&
    state.solution.every(Boolean) && countSolutions(state.solution) === 1 &&
    isGrid(state.values) && state.puzzle.every((value, i) => !value || (value === state.solution[i] && value === state.values[i])) &&
    countSolutions(state.puzzle) === 1 && validNotes(state.notes) && counter(state.elapsedMs) && counter(state.hintsUsed) &&
    typeof state.paused === 'boolean' && Array.isArray(state.history) && state.history.length <= 100 &&
    state.history.every(entry => !!entry && isGrid(entry.values) && validNotes(entry.notes) && counter(entry.hintsUsed) &&
      state.puzzle.every((value, i) => !value || entry.values[i] === value));
}
