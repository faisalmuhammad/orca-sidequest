import { bindGameKeyboard } from './keyboard.mjs';
import { create2048, move2048, undo2048, is2048Over, isValid2048 } from './games/2048.mjs';
import { DIFFICULTIES, createSudoku, peers, sudokuConflicts, enterSudoku, hintSudoku, autoNotesSudoku, newlyCompletedCells, undoSudoku, isSudokuComplete, isValidSudoku } from './games/sudoku.mjs';
import { createSaveStore, normalizeSave, emptySave } from './storage.mjs';
import { createSound, celebration } from './effects.mjs';
import { EXTRA_NAMES, EXTRA_CREATORS, extraCards, createExtraGames } from './extra-games.mjs';
import { createCheckers, isValidCheckers } from './games/checkers.mjs';
import { isValidBlocks } from './games/blocks.mjs';
import { isValidMemory } from './games/memory.mjs';
import { isValidMinesweeper } from './games/minesweeper.mjs';
import { isValidLights } from './games/lights.mjs';
import { isValidNonogram } from './games/nonograms.mjs';
import { isValidCodebreaker } from './games/codebreaker.mjs';
import { isValidSliding } from './games/sliding.mjs';
import { isValidConnect } from './games/connect.mjs';
import { isValidSokoban, isSokobanComplete } from './games/sokoban.mjs';
import { isValidWordle } from './games/wordle.mjs';
import { isValidSimon } from './games/simon.mjs';
import { isValidFlood } from './games/flood.mjs';

const app = document.getElementById('app');
const announcer = document.getElementById('announcer');
const dialog = document.getElementById('confirm-dialog');
const paths = {
  game: '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>',
  back: '<path d="m14 6-6 6 6 6"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  undo: '<path d="M3 10h11a6 6 0 0 1 0 12M3 10l5-5M3 10l5 5" transform="translate(0 -2)"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pencil: '<path d="m4 16-1 5 5-1L20 8l-4-4L4 16Zm9-9 4 4"/>',
  hint: '<path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  erase: '<path d="m3 14 9-10 9 8-8 9H8l-5-7Zm4-4 9 8M13 21h8"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  left: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  right: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  up: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
  down: '<path d="M12 5v14m-6-6 6 6 6-6"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 5-6 4H2v6h3l6 4V5Zm5 4 5 6m0-6-5 6"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 2M5 16a8 8 0 0 0 13 2"/>',
  crown: '<path d="m3 6 4 4 5-6 5 6 4-4-3 13H6L3 6Zm3 10h12"/>',
  leaf: '<path d="M20 4C7 2 2 8 5 15c4 7 16 4 15-11ZM4 21 16 9"/>',
  moon: '<path d="M20 15a9 9 0 0 1-11-11 9 9 0 1 0 11 11Z"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7V2Z"/>',
  flag: '<path d="M5 21V4m0 0c4-4 9 4 14 0v9c-5 4-10-4-14 0"/>',
  mine: '<circle cx="12" cy="12" r="5"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/><circle cx="10" cy="10" r="1"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  compact: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  expanded: '<rect x="3" y="3" width="18" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="7" rx="1.5"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const format = value => value.toLocaleString();
const ALL_NAMES = { '2048': '2048', sudoku: 'Sudoku', ...EXTRA_NAMES };
const RECOMMENDED_ORDER = ['2048','sudoku','checkers','blocks','memory','minesweeper','lights','nonograms','codebreaker','sliding','connect','sokoban','wordle','simon','flood'];
const CATEGORIES = [['Strategy',['2048','checkers','connect']],['Puzzle',['sudoku','nonograms','sliding','lights','sokoban','flood']],['Word & Logic',['wordle','codebreaker','minesweeper']],['Action & Memory',['blocks','memory','simon']]];
const duration = milliseconds => {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
};
const button = (action, label, symbol, extra = '') => `<button type="button" class="button" data-action="${action}" ${extra}>${symbol ? icon(symbol) : ''}${label}</button>`;
let save = emptySave(), initialized = false;
let selected = 0, pencil = false, checked = false, saveStatus = 'saved', touch = null, confirmation = null;
let clockStart = null, lastClockSave = 0, message = '', messageTone = '';
let chosenNumber = 0, motion = 0, moveQueue = [], tileAnimations = [], slideInProgress = false;
const sound = createSound(() => save.preferences.sound, error => { announce(error.message); console.warn('Sidequest sound:', error.message); });
const extras = createExtraGames({ getSave: () => save, persist, sound, icon, announce, onNew: confirmNew });
let localJournal;
try { localJournal = window.localStorage; } catch { /* Orca's host store still works without the journal. */ }
const store = createSaveStore({ storage: window.orca?.storage, journal: localJournal, onStatus: status => { saveStatus = status; updateSaveIndicator(); } });

function updateSaveIndicator() {
  const node = document.getElementById('save-indicator');
  if (!node) return;
  node.dataset.status = saveStatus;
  node.querySelector('span:last-child').textContent = { saved: 'Saved', saving: 'Saving', local: 'Device save', error: 'Not saved' }[saveStatus];
  node.title = { saved: 'Your progress is saved automatically', saving: 'Saving your progress', local: 'Saved on this device; Orca storage is unavailable', error: 'Progress could not be saved. Keep this panel open and try again.' }[saveStatus];
}

function announce(text) { announcer.textContent = text; }
function feedback(text, tone = '') {
  message = text; messageTone = tone;
  const node = document.getElementById('feedback');
  if (node) { node.textContent = text; node.dataset.tone = tone; }
  if (text) announce(text);
}
function clockCanRun() {
  return save.activeGame === 'sudoku' && save.games.sudoku && !save.games.sudoku.paused &&
    !isSudokuComplete(save.games.sudoku) && !document.hidden && document.hasFocus() && !dialog.open;
}
function checkpointClock() {
  if (clockStart === null || !save.games.sudoku) return;
  save.games.sudoku.elapsedMs += Math.max(0, Math.round(performance.now() - clockStart));
  clockStart = performance.now();
}
function syncClock() {
  if (clockCanRun()) { if (clockStart === null) clockStart = performance.now(); }
  else { checkpointClock(); clockStart = null; }
  updateTimer();
}
function updateTimer() {
  const node = document.getElementById('timer');
  if (node && save.games.sudoku) {
    const elapsed = save.games.sudoku.elapsedMs + (clockStart === null ? 0 : performance.now() - clockStart);
    node.textContent = duration(elapsed);
  }
}
function persist() { if (!initialized) return; checkpointClock(); void store.save(save); }

function brand() {
  const compact = save.preferences.libraryView === 'compact';
  return `<header class="brand"><div class="brand-mark">${icon('game')}</div><div class="brand-copy"><div class="brand-name">Sidequest<span class="brand-period">.</span></div><div class="brand-description">Small games. Good breaks.</div></div><div id="save-indicator" class="save-indicator" data-status="${saveStatus}"><span class="save-dot" aria-hidden="true"></span><span>Saved</span></div>${save.activeGame ? '' : `<button type="button" class="sound-button view-button" data-action="library-view" aria-label="Compact game view" aria-pressed="${compact}" aria-controls="game-library" title="Switch to ${compact ? 'expanded' : 'compact'} view">${icon(compact ? 'compact' : 'expanded')}</button>`}<button class="sound-button" id="sound-button" data-action="sound" aria-label="Turn sound ${save.preferences.sound ? 'off' : 'on'}" title="Turn sound ${save.preferences.sound ? 'off' : 'on'}" aria-pressed="${save.preferences.sound}">${icon(save.preferences.sound ? 'sound' : 'muted')}</button></header>`;
}

function renderHome() {
  const blocks = save.games['2048'], sudoku = save.games.sudoku;
  const progress = sudoku ? `${sudoku.values.filter(Boolean).length}/81 filled · ${duration(sudoku.elapsedMs)}` : 'Notes, hints & three difficulties';
  const blocksAction = blocks?.moves ? 'Resume game' : 'Play 2048';
  const sudokuAction = sudoku ? (isSudokuComplete(sudoku) ? 'Puzzle completed' : 'Resume puzzle') : 'Play Sudoku';
  const card2048 = { id: '2048', html: `<button class="game-card" data-game="2048" aria-label="${blocksAction}"><div class="card-preview preview-2048" aria-hidden="true"><span class="card-kicker">/ MERGE & MULTIPLY</span><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="preview-tiles">${[8,32,128,256].map(value => `<span class="preview-tile">${value}<i></i></span>`).join('')}</div><span class="art-spark spark-one">✦</span><span class="art-spark spark-two">+</span></div><div class="card-info"><div class="card-title-line"><span class="card-title">2048</span><span class="card-arrow">${icon('arrow')}</span></div><p class="card-description">Find your flow. Chase the next merge.</p><div class="card-meta"><span>${blocks ? `Best ${format(blocks.best)}` : 'Strategy meets serendipity'}</span><span class="card-state">${blocks?.moves ? 'Resume' : 'Play'}${icon('play')}</span></div></div></button>` };
  const cardSudoku = { id: 'sudoku', html: `<button class="game-card" data-game="sudoku" aria-label="${sudokuAction}"><div class="card-preview preview-sudoku" aria-hidden="true"><span class="card-kicker">/ A LITTLE CLARITY</span><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="preview-grid">${[5,0,3,0,7,0,2,0,9].map(value => `<span>${value || '<i></i>'}</span>`).join('')}</div><span class="art-spark spark-one">✦</span><span class="art-spark spark-two">+</span></div><div class="card-info"><div class="card-title-line"><span class="card-title">Sudoku</span><span class="card-arrow">${icon('arrow')}</span></div><p class="card-description">Clear the grid, one number at a time.</p><div class="card-meta"><span>${progress}</span><span class="card-state">${sudoku ? (isSudokuComplete(sudoku) ? 'Done' : 'Resume') : 'Play'}${icon('play')}</span></div></div></button>` };
  const allCards = [card2048, cardSudoku, ...extraCards(save.games, icon)];
  const order = save.preferences.sortOrder;
  let sorted;
  if (order === 'alpha') {
    sorted = allCards.slice().sort((a, b) => ALL_NAMES[a.id].localeCompare(ALL_NAMES[b.id]));
  } else if (order === 'recent') {
    sorted = allCards.slice().sort((a, b) => {
      const ta = save.lastPlayed[a.id] ?? 0, tb = save.lastPlayed[b.id] ?? 0;
      if (ta || tb) return tb - ta;
      return RECOMMENDED_ORDER.indexOf(a.id) - RECOMMENDED_ORDER.indexOf(b.id);
    });
  } else if (order === 'category') {
    sorted = [];
    for (const [label, ids] of CATEGORIES) {
      const group = ids.map(gid => allCards.find(c => c.id === gid)).filter(Boolean);
      if (group.length) {
        sorted.push({ id: '_cat_' + label, html: `<div class="category-label">${label}</div>` });
        sorted.push(...group);
      }
    }
  } else {
    sorted = allCards.slice().sort((a, b) => RECOMMENDED_ORDER.indexOf(a.id) - RECOMMENDED_ORDER.indexOf(b.id));
  }
  const sortOptions = [['recommended','Recommended'],['recent','Recently played'],['alpha','A–Z'],['category','Category']];
  return `<section class="welcome"><span class="eyebrow"><i class="live-spark"></i> BETWEEN TASKS</span><h1>Your next <br><span>quick break.</span></h1><p>Refresh your mind with a quick game while your agents work.</p><div class="hero-orbit" aria-hidden="true">${icon('spark')}</div></section>
    <div class="library-caption"><span>${2 + Object.keys(EXTRA_NAMES).length} to explore</span><select id="sort-select" class="sort-select" aria-label="Sort games">${sortOptions.map(([v,l])=>`<option value="${v}" ${save.preferences.sortOrder===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="game-list" id="game-library">
    ${sorted.map(c => c.html).join('\n      ')}</div>`;
}

function gameNav() {
  return `<nav class="game-nav" aria-label="Game picker"><button class="back-button" data-action="home">${icon('back')}All games</button><select id="game-select" class="game-select" aria-label="Switch game">${Object.entries({ '2048':'2048', sudoku:'Sudoku', ...EXTRA_NAMES }).map(([id,name]) => `<option value="${id}" ${save.activeGame === id ? 'selected' : ''}>${name}</option>`).join('')}</select></nav>`;
}

function render2048() {
  const game = save.games['2048'];
  return `${gameNav()}<section aria-label="2048 game"><div class="game-heading"><div><h1>2048</h1><p class="subtitle">Keep merging. Reach 2048.</p></div>${button('new-2048', 'New', 'plus', 'title="Start a new 2048 game"')}</div><div class="stats"><div class="stat"><span class="stat-label">SCORE</span><span class="stat-value" id="score">${format(game.score)}</span></div><div class="stat stat-best"><span class="stat-label">PERSONAL BEST</span><span class="stat-value" id="best">${format(game.best)}</span></div></div><div class="board-wrap"><div id="board-2048" class="board-2048" role="group" tabindex="0" aria-label="2048 board. Use arrow keys or W A S D to slide tiles."></div><div id="overlay-2048" class="board-overlay" hidden></div></div><div class="game-tools">${button('undo-2048', 'Undo', 'undo', 'id="undo-2048" title="Undo the last move"')}<span id="move-count" class="move-count">${game.moves} moves</span></div><div class="direction-controls" aria-label="Slide tiles">${['left','up','down','right'].map(direction => button(`move-${direction}`, '', direction, `aria-label="Slide ${direction}" title="Slide ${direction}"`)).join('')}</div><p class="instructions">Click the board, then use <kbd>↑ ↓ ← →</kbd> or <kbd>W A S D</kbd>.<br>Swipe or use the buttons to move.</p></section>`;
}

function update2048(animation = {}) {
  const game = save.games['2048'];
  const board = document.getElementById('board-2048');
  if (!board) return;
  board.innerHTML = Array.from({ length: 16 }, () => '<div class="board-cell" aria-hidden="true"></div>').join('') + '<div class="tile-layer">' + game.board.map((value, index) => {
    if (!value) return '';
    const classes = ['tile', value >= 128 ? 'tile-large' : '', value > 2048 ? 'tile-extra' : '', animation.spawned === index ? 'spawn' : '', animation.merged?.includes(index) ? 'merge' : ''].filter(Boolean).join(' ');
    return `<div class="${classes}" data-index="${index}" data-value="${value}" style="grid-row:${Math.floor(index / 4) + 1};grid-column:${index % 4 + 1}" aria-label="Row ${Math.floor(index / 4) + 1}, column ${index % 4 + 1}: ${value}"><span>${value}</span></div>`;
  }).join('') + '</div>';
  document.getElementById('score').textContent = format(game.score);
  document.getElementById('best').textContent = format(game.best);
  document.getElementById('move-count').textContent = `${game.moves} ${game.moves === 1 ? 'move' : 'moves'}`;
  document.getElementById('undo-2048').disabled = !game.previous;
  const highest = Math.max(...game.board), target = highest * 2;
  document.getElementById('next-tile').textContent = format(target);
  document.getElementById('highest-tile').textContent = `Best tile ${format(highest)}`;
  document.getElementById('milestone-fill').style.width = `${Math.log2(highest) / Math.log2(target) * 100}%`;
  const over = is2048Over(game.board), won = game.board.some(value => value >= 2048) && !game.winAcknowledged;
  const overlay = document.getElementById('overlay-2048');
  overlay.hidden = !over && !won;
  board.inert = !overlay.hidden;
  if (!overlay.hidden) {
    overlay.innerHTML = `${won ? celebration() : ''}<span class="overlay-icon">${icon(won ? 'spark' : 'game')}</span><span class="eyebrow">${won ? '2048 REACHED' : 'ROUND COMPLETE'}</span><h2>${won ? 'You made 2048!' : 'No more moves.'}</h2><p>${won ? 'Keep going to reach your next milestone.' : `You scored ${format(game.score)}. Try another round.`}</p><div class="overlay-actions">${won ? button('continue-2048', 'Keep going', 'play') : game.previous ? button('undo-2048', 'Undo', 'undo') : ''}${button('new-2048', 'New game', 'plus')}</div>`;
  }
}

function cancelMotion() {
  motion++; slideInProgress = false; moveQueue = [];
  tileAnimations.forEach(animation => animation.cancel()); tileAnimations = [];
}
async function animate2048(result) {
  const board = document.getElementById('board-2048');
  const cell = board?.querySelector('.board-cell');
  if (!cell || matchMedia('(prefers-reduced-motion: reduce)').matches) { update2048(result); return; }
  const token = ++motion, step = cell.getBoundingClientRect().width + parseFloat(getComputedStyle(board).columnGap);
  slideInProgress = true;
  document.getElementById('score').textContent = format(result.state.score);
  document.getElementById('best').textContent = format(result.state.best);
  document.getElementById('undo-2048').disabled = !result.state.previous;
  tileAnimations = result.movements.flatMap(({ from, to, merge }) => {
    const node = board.querySelector(`[data-index="${from}"]`);
    if (!node || from === to) return [];
    node.style.zIndex = merge ? '3' : '2';
    const x = ((to % 4) - (from % 4)) * step, y = (Math.floor(to / 4) - Math.floor(from / 4)) * step;
    return [node.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${x}px,${y}px)` }], { duration: 145, easing: 'cubic-bezier(.2,.75,.3,1)', fill: 'forwards' })];
  });
  await Promise.all(tileAnimations.map(animation => animation.finished.catch(() => {})));
  if (token !== motion) return;
  tileAnimations = []; slideInProgress = false;
  update2048(result);
  if (moveQueue.length) { const direction = moveQueue.shift(); move(direction); }
}
function scoreBurst(points) {
  if (!points) return;
  const score = document.getElementById('score');
  score.parentElement.querySelector('.score-gain')?.remove();
  const gain = document.createElement('span'); gain.className = 'score-gain'; gain.textContent = `+${format(points)}`;
  score.parentElement.append(gain); gain.addEventListener('animationend', () => gain.remove(), { once: true });
}

function renderSudoku() {
  const game = save.games.sudoku;
  return `${gameNav()}<section aria-label="Sudoku game"><div class="game-heading"><div><h1>Sudoku</h1><p class="subtitle">Find the right number for every cell.</p></div>${button('new-sudoku', 'New', 'plus', 'title="Start a new Sudoku puzzle"')}</div><div class="sudoku-topline"><select class="difficulty-select" id="difficulty-select" aria-label="New puzzle difficulty">${Object.entries(DIFFICULTIES).map(([value, level]) => `<option value="${value}" ${game.difficulty === value ? 'selected' : ''}>${level.label}</option>`).join('')}</select><span id="timer" class="timer" aria-label="Time played">${duration(game.elapsedMs)}</span><button id="pause-sudoku" class="timer-button" data-action="pause-sudoku" aria-label="Pause timer" title="Pause timer">${icon('pause')}</button></div><div class="board-wrap"><div id="sudoku-board" class="sudoku-board" role="group" aria-label="Sudoku board. Arrow keys select a cell. Type 1 to 9, or Backspace to erase."></div><div id="overlay-sudoku" class="board-overlay" hidden></div></div><div class="sudoku-progress"><span id="filled-count">0/81 filled</span><div class="progress-track" aria-hidden="true"><div id="progress-fill" class="progress-fill"></div></div></div><div class="sudoku-tools">${button('pencil', 'Notes', 'pencil', 'id="pencil-button" aria-pressed="false" title="Toggle pencil notes (N)"')}${button('undo-sudoku', 'Undo', 'undo', 'id="undo-sudoku" title="Undo the last entry"')}${button('hint-sudoku', 'Hint', 'hint', 'id="hint-sudoku" title="Reveal the selected cell, or the next unfinished cell"')}${button('check-sudoku', 'Check', 'check', 'id="check-sudoku" title="Check entered numbers"')}</div><div id="number-pad" class="number-pad" aria-label="Enter a number"></div><div class="sudoku-bottom">${button('erase-sudoku', 'Erase', 'erase', 'id="erase-sudoku"')}<span id="notes-label" class="notes-label">Numbers mode</span></div><p id="feedback" class="feedback" data-tone="${messageTone}"></p><p class="instructions"><kbd>1–9</kbd> enter · <kbd>↑ ↓ ← →</kbd> navigate · <kbd>N</kbd> notes<br>Timer rests when you leave the game.</p></section>`;
}

function updateSudoku(animation = {}) {
  const game = save.games.sudoku, board = document.getElementById('sudoku-board');
  if (!board) return;
  const focused = board.contains(document.activeElement), conflicts = sudokuConflicts(game.values);
  const related = new Set(peers(selected)), selectedValue = game.values[selected];
  board.innerHTML = game.values.map((value, index) => {
    const invalid = conflicts.has(index) || (checked && value && value !== game.solution[index]);
    const classes = ['sudoku-cell', game.puzzle[index] ? 'given' : '', related.has(index) ? 'peer' : '', selectedValue && value === selectedValue ? 'same' : '', selected === index ? 'selected' : '', invalid ? 'conflict' : '', animation.completed?.includes(index) ? 'unit-complete' : '', animation.changed === index ? 'entry-pop' : ''].filter(Boolean).join(' ');
    const notes = Array.from({ length: 9 }, (_, i) => i + 1).filter(value => game.notes[index] & (1 << value));
    const label = `Row ${Math.floor(index / 9) + 1}, column ${index % 9 + 1}: ${value || (notes.length ? `notes ${notes.join(', ')}` : 'empty')}${game.puzzle[index] ? ', given' : ''}${invalid ? ', conflict' : ''}`;
    const content = value ? `<span class="cell-value">${value}</span>` : (notes.length ? `<span class="cell-notes" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<span>${notes.includes(i + 1) ? i + 1 : ''}</span>`).join('')}</span>` : '');
    return `<button type="button" class="${classes}" data-cell="${index}" tabindex="${selected === index ? 0 : -1}" aria-label="${label}" ${invalid ? 'aria-invalid="true"' : ''}>${content}</button>`;
  }).join('');
  if (focused) focusSudoku();
  document.getElementById('pencil-button').setAttribute('aria-pressed', String(pencil));
  document.getElementById('undo-sudoku').disabled = !game.history.length || game.paused;
  const complete = isSudokuComplete(game);
  document.getElementById('hint-sudoku').disabled = complete || game.paused;
  document.getElementById('check-sudoku').disabled = complete || game.paused;
  document.getElementById('erase-sudoku').disabled = !!game.puzzle[selected] || complete || game.paused || (!game.values[selected] && !game.notes[selected]);
  document.getElementById('notes-label').textContent = save.preferences.numberFirst ? (chosenNumber ? `Click cells to place ${chosenNumber}${pencil ? ' as a note' : ''}` : 'Choose a number, then place it in cells') : (pencil ? 'Pencil notes on · tap numbers to toggle' : 'Choose a cell, then enter a number');
  document.getElementById('number-first').setAttribute('aria-pressed', String(save.preferences.numberFirst));
  document.getElementById('number-first').disabled = complete || game.paused;
  document.getElementById('auto-notes').disabled = complete || game.paused;
  document.getElementById('pencil-button').disabled = complete || game.paused;
  const filled = game.values.filter(Boolean).length;
  document.getElementById('filled-count').textContent = `${filled}/81 filled`;
  document.getElementById('progress-fill').style.width = `${filled / 81 * 100}%`;
  document.getElementById('number-pad').innerHTML = Array.from({ length: 9 }, (_, i) => {
    const value = i + 1, left = Math.max(0, 9 - game.values.filter(cell => cell === value).length);
    return `<button class="number-key ${left === 0 ? 'finished' : ''} ${save.preferences.numberFirst && chosenNumber === value ? 'chosen' : ''}" data-number="${value}" aria-label="Enter ${value}, ${left} remaining" ${complete || game.paused || (!save.preferences.numberFirst && game.puzzle[selected]) ? 'disabled' : ''}>${value}<small aria-hidden="true">${left || '·'}</small></button>`;
  }).join('');
  const pause = document.getElementById('pause-sudoku');
  pause.innerHTML = icon(game.paused ? 'play' : 'pause');
  pause.setAttribute('aria-label', game.paused ? 'Resume timer' : 'Pause timer');
  pause.title = game.paused ? 'Resume timer' : 'Pause timer';
  pause.disabled = complete;
  const overlay = document.getElementById('overlay-sudoku');
  overlay.hidden = !complete && !game.paused;
  board.inert = !overlay.hidden;
  if (!overlay.hidden) {
    overlay.innerHTML = complete ? `${celebration()}<span class="overlay-icon">${icon('check')}</span><span class="eyebrow">PUZZLE COMPLETE</span><h2>Everything fits.</h2><p>Solved in ${duration(game.elapsedMs)}${game.hintsUsed ? ` with ${game.hintsUsed} ${game.hintsUsed === 1 ? 'hint' : 'hints'}` : ' without hints'}.</p>${button('new-sudoku', 'Next puzzle', 'plus')}` : `<span class="overlay-icon">${icon('pause')}</span><h2>Game paused.</h2><p>Resume whenever you’re ready.</p>${button('pause-sudoku', 'Resume', 'play')}`;
  }
  document.getElementById('feedback').textContent = message;
  updateTimer();
}

function focusSudoku() { document.querySelector(`[data-cell="${selected}"]`)?.focus({ preventScroll: true }); }
function focusBoard() {
  const overlay = document.getElementById(save.activeGame === 'sudoku' ? 'overlay-sudoku' : 'overlay-2048');
  if (overlay && !overlay.hidden) { overlay.querySelector('button')?.focus({ preventScroll: true }); return; }
  if (save.activeGame === 'sudoku') focusSudoku();
  else if (EXTRA_NAMES[save.activeGame]) extras.focus();
  else document.getElementById('board-2048')?.focus({ preventScroll: true });
}
function setupGameControls() {
  if (save.activeGame === '2048') {
    const milestone = document.createElement('div');
    milestone.className = 'milestone';
    milestone.innerHTML = '<div><span class="milestone-label">NEXT MILESTONE</span><strong id="next-tile">4</strong></div><div class="milestone-track" aria-hidden="true"><i id="milestone-fill"></i></div><span id="highest-tile" class="milestone-highest">Best tile 2</span>';
    document.querySelector('.board-wrap').before(milestone);
  }
  if (save.activeGame === 'sudoku') {
    const tools = document.querySelector('.sudoku-bottom');
    const hint = document.createElement('div'); hint.className = 'input-hint';
    hint.append(document.getElementById('notes-label')); tools.after(hint);
    tools.insertAdjacentHTML('beforeend', button('auto-notes', 'Auto notes', 'spark', 'id="auto-notes" title="Fill candidate notes in empty cells"') + button('number-first', 'Number first', '', 'id="number-first" aria-pressed="false" title="Choose a number, then click cells to place it"'));
  }
}
function render(focus = false) {
  cancelMotion();
  extras.dispose();
  app.dataset.game = save.activeGame ?? 'home';
  app.dataset.libraryView = save.preferences.libraryView;
  app.innerHTML = brand() + (save.activeGame === '2048' ? render2048() : save.activeGame === 'sudoku' ? renderSudoku() : EXTRA_NAMES[save.activeGame] ? gameNav() + extras.render(save.activeGame) : renderHome());
  setupGameControls();
  app.setAttribute('aria-busy', 'false');
  updateSaveIndicator();
  if (save.activeGame === '2048') update2048();
  if (save.activeGame === 'sudoku') updateSudoku();
  if (EXTRA_NAMES[save.activeGame]) extras.mount(save.activeGame);
  syncClock();
  if (focus) focusBoard();
}

function switchGame(game) {
  checkpointClock(); clockStart = null;
  extras.dispose();
  if (game && !save.games[game]) save.games[game] = game === '2048' ? create2048() : game === 'sudoku' ? createSudoku() : EXTRA_CREATORS[game]();
  if (game) save.lastPlayed[game] = Date.now();
  save.activeGame = game;
  checked = false; message = ''; messageTone = '';
  if (game === 'sudoku') selected = Math.max(0, save.games.sudoku.values.findIndex(value => !value));
  persist(); render(!!game);
  if (!game) document.querySelector('.game-card')?.focus({ preventScroll: true });
}

function move(direction) {
  const game = save.games['2048'];
  if (slideInProgress) { if (moveQueue.length < 2) moveQueue.push(direction); return; }
  if (save.activeGame !== '2048' || is2048Over(game.board) || (game.board.some(value => value >= 2048) && !game.winAcknowledged)) return;
  const result = move2048(game, direction);
  if (!result.changed) { announce('No tiles can move that way.'); return; }
  save.games['2048'] = result.state; persist(); void animate2048(result); scoreBurst(result.gained);
  void sound.play(result.state.board.some(value => value >= 2048) && !result.state.winAcknowledged ? 'win' : result.gained ? 'merge' : 'tick', Math.max(...result.state.board));
  announce(is2048Over(result.state.board) ? `Game over. Score ${result.state.score}.` : result.state.board.some(value => value >= 2048) && !result.state.winAcknowledged ? 'You reached 2048! Keep going or start a new game.' : `${result.gained ? `Merged for ${result.gained} points. ` : ''}Score ${result.state.score}.`);
}

function applySudoku(next, text = '', tone = '') {
  if (next === save.games.sudoku) return;
  const before = save.games.sudoku.values;
  const completed = newlyCompletedCells(before, next.values, next.solution);
  const changed = next.values.findIndex((value, i) => value !== before[i]);
  checkpointClock();
  // The reducer was made before the clock checkpoint; carry the new time forward.
  next.elapsedMs = save.games.sudoku.elapsedMs;
  save.games.sudoku = next; checked = false;
  feedback(text, tone); syncClock(); persist(); updateSudoku({ completed, changed });
  void sound.play(isSudokuComplete(next) ? 'win' : completed.length ? 'complete' : sudokuConflicts(next.values).size ? 'error' : 'tick');
  if (isSudokuComplete(next)) announce(`Sudoku completed in ${duration(next.elapsedMs)}.`);
}
function enterNumber(value) {
  const game = save.games.sudoku;
  if (game.paused) return;
  if (game.puzzle[selected]) { feedback('Choose an empty cell to enter a number.'); return; }
  applySudoku(enterSudoku(game, selected, value, pencil));
  focusSudoku();
}
function confirmNew(game, difficulty) {
  const state = save.games[game];
  const hasProgress = game === '2048' ? state.moves > 0 : game === 'sudoku' ? state.history.length > 0 || state.elapsedMs > 1000 : game === 'checkers' ? state.moves > 0 || state.forced !== null : game === 'blocks' ? state.pieces > 0 || !state.paused : game === 'minesweeper' ? state.started || state.flags.some(Boolean) : ['lights','nonograms','sliding','connect','sokoban'].includes(game) ? state.moves > 0 : game === 'codebreaker' ? state.guesses.length > 0 || state.draft.some(n => n !== null) : game === 'wordle' ? state.guesses.length > 0 || state.draft.length > 0 : game === 'simon' ? state.round > 1 || state.input.length > 0 : game === 'flood' ? state.moves > 0 : state.attempts > 0 || state.phase === 'play';
  const start = () => {
    clockStart = null;
    extras.dispose();
    save.games[game] = game === '2048' ? create2048(state.best) : game === 'sudoku' ? createSudoku(difficulty ?? state.difficulty) : game === 'checkers' ? createCheckers(difficulty ?? state.mode) : EXTRA_CREATORS[game](state, difficulty);
    selected = game === 'sudoku' ? save.games.sudoku.values.findIndex(value => !value) : 0;
    pencil = false; checked = false; message = ''; messageTone = ''; persist(); render(true);
  };
  if (!hasProgress || (game === '2048' ? is2048Over(state.board) : game === 'sudoku' ? isSudokuComplete(state) : state.result || state.over || state.phase === 'complete' || (game === 'lights' && state.board.every(n => n === 0)) || (game === 'nonograms' && state.cells.every((n,i) => (n === 1 ? 1 : 0) === state.solution[i])) || (game === 'sliding' && state.board.every((n,i) => n === (i+1) % state.board.length)) || (game === 'sokoban' && isSokobanComplete(state)))) { start(); return; }
  document.getElementById('confirm-title').textContent = game === 'sokoban' ? Number.isInteger(difficulty) && difficulty !== state.level ? 'Switch levels?' : 'Restart this level?' : 'Start a new game?';
  document.getElementById('confirm-description').textContent = game === 'sokoban' ? 'Your moves in this level will be reset. Completed levels and records stay saved.' : 'Your current game will be replaced. Your personal best stays.';
  if (game === 'checkers') document.getElementById('checkers-mode').value = state.mode;
  extras.suspend();
  confirmation = start; dialog.returnValue = ''; dialog.showModal(); syncClock();
}
dialog.addEventListener('close', () => {
  const action = confirmation; confirmation = null;
  if (dialog.returnValue === 'confirm') action?.();
  extras.resume();
  syncClock(); focusBoard();
});

app.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target || target.disabled) return;
  if (target.dataset.game) { switchGame(target.dataset.game); return; }
  if (target.dataset.cell !== undefined) { selected = Number(target.dataset.cell); if (save.preferences.numberFirst && chosenNumber && !save.games.sudoku.puzzle[selected]) enterNumber(chosenNumber); else { updateSudoku(); focusSudoku(); } return; }
  if (target.dataset.number) { if (save.preferences.numberFirst) { chosenNumber = Number(target.dataset.number); updateSudoku(); focusSudoku(); } else enterNumber(Number(target.dataset.number)); return; }
  const action = target.dataset.action;
  if (action?.startsWith('move-')) { move(action.slice(5)); focusBoard(); return; }
  if (action === 'sound') {
    save.preferences.sound = !save.preferences.sound; persist();
    target.innerHTML = icon(save.preferences.sound ? 'sound' : 'muted');
    target.setAttribute('aria-label', `Turn sound ${save.preferences.sound ? 'off' : 'on'}`);
    target.title = `Turn sound ${save.preferences.sound ? 'off' : 'on'}`; target.setAttribute('aria-pressed', String(save.preferences.sound));
    void sound.play('complete');
  } else if (action === 'library-view') {
    save.preferences.libraryView = save.preferences.libraryView === 'compact' ? 'expanded' : 'compact';
    persist(); render(); document.querySelector('[data-action="library-view"]')?.focus({ preventScroll: true });
    announce(`${save.preferences.libraryView === 'compact' ? 'Compact' : 'Expanded'} game view selected.`);
  } else if (action === 'home') switchGame(null);
  else if (action === 'new-2048') confirmNew('2048');
  else if (action === 'undo-2048') { cancelMotion(); save.games['2048'] = undo2048(save.games['2048']); persist(); update2048(); focusBoard(); announce('Last move undone.'); }
  else if (action === 'continue-2048') { save.games['2048'].winAcknowledged = true; persist(); update2048(); focusBoard(); }
  else if (action === 'new-sudoku') confirmNew('sudoku');
  else if (action === 'number-first') { save.preferences.numberFirst = !save.preferences.numberFirst; chosenNumber = 0; persist(); updateSudoku(); focusSudoku(); }
  else if (action === 'auto-notes') { applySudoku(autoNotesSudoku(save.games.sudoku), 'Candidate notes filled. You can undo this.', 'success'); focusSudoku(); }
  else if (action === 'pencil') { pencil = !pencil; updateSudoku(); focusSudoku(); }
  else if (action === 'erase-sudoku') enterNumber(0);
  else if (action === 'undo-sudoku') { applySudoku(undoSudoku(save.games.sudoku), 'Last entry undone.'); focusSudoku(); }
  else if (action === 'hint-sudoku') {
    const hint = hintSudoku(save.games.sudoku, selected); selected = hint.index < 0 ? selected : hint.index;
    applySudoku(hint.state, hint.explanation ?? 'This puzzle is complete.', 'success'); focusSudoku();
  } else if (action === 'check-sudoku') {
    checked = true; const game = save.games.sudoku;
    const errors = game.values.filter((value, index) => value && value !== game.solution[index]).length;
    feedback(errors ? `${errors} ${errors === 1 ? 'entry needs' : 'entries need'} another look.` : 'All entered numbers look good.', errors ? 'error' : 'success');
    updateSudoku(); focusSudoku();
  } else if (action === 'pause-sudoku') {
    checkpointClock(); save.games.sudoku.paused = !save.games.sudoku.paused;
    syncClock(); persist(); updateSudoku(); if (!save.games.sudoku.paused) focusSudoku();
  }
});
app.addEventListener('change', event => {
  if (event.target.id === 'game-select') switchGame(event.target.value);
  if (event.target.id === 'difficulty-select') { const value = event.target.value; event.target.value = save.games.sudoku.difficulty; confirmNew('sudoku', value); }
  if (event.target.id === 'sort-select') { save.preferences.sortOrder = event.target.value; persist(); render(); document.getElementById('sort-select')?.focus({ preventScroll: true }); }
});
function keydown(event, target = event.target) {
  if (dialog.open || event.altKey || event.target.closest('select')) return;
  const board = target.closest('#board-2048, #sudoku-board');
  if (!board) return;
  if (event.metaKey || event.ctrlKey) {
    if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      if (save.activeGame === '2048') { cancelMotion(); save.games['2048'] = undo2048(save.games['2048']); persist(); update2048(); }
      else applySudoku(undoSudoku(save.games.sudoku), 'Last entry undone.');
    }
    return;
  }
  const directions = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
  if (save.activeGame === '2048') {
    const direction = directions[event.key] ?? directions[event.key.toLowerCase()];
    if (direction) { event.preventDefault(); if (!event.repeat || !slideInProgress) move(direction); }
  } else {
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      if (event.key === 'ArrowLeft') selected = selected % 9 === 0 ? selected : selected - 1;
      if (event.key === 'ArrowRight') selected = selected % 9 === 8 ? selected : selected + 1;
      if (event.key === 'ArrowUp') selected = selected < 9 ? selected : selected - 9;
      if (event.key === 'ArrowDown') selected = selected >= 72 ? selected : selected + 9;
      updateSudoku(); focusSudoku();
    } else if (/^[1-9]$/.test(event.key)) { event.preventDefault(); if (save.preferences.numberFirst) { chosenNumber = Number(event.key); updateSudoku(); } else enterNumber(Number(event.key)); }
    else if (['Backspace', 'Delete', '0'].includes(event.key)) { event.preventDefault(); enterNumber(0); }
    else if (event.key.toLowerCase() === 'n') { event.preventDefault(); pencil = !pencil; updateSudoku(); }
  }
 }
bindGameKeyboard({
  area: () => save.activeGame === '2048' ? '#board-2048' : '#sudoku-board',
  focus: focusBoard, onKey: keydown, undo: true,
  blocked: () => !initialized || dialog.open,
  keys: event => ['2048', 'sudoku'].includes(save.activeGame) && (
    ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') ||
    event.key.startsWith('Arrow') || ['Enter', ' '].includes(event.key) ||
    (save.activeGame === '2048' ? /^[wasd]$/i.test(event.key) : /^[1-9n0]$/i.test(event.key) || ['Backspace', 'Delete'].includes(event.key))
  ),
});
app.addEventListener('pointerdown', event => {
  const board = event.target.closest('#board-2048');
  if (board && event.isPrimary) { touch = { id: event.pointerId, x: event.clientX, y: event.clientY }; board.setPointerCapture(event.pointerId); board.focus({ preventScroll: true }); }
});
app.addEventListener('pointerup', event => {
  if (!touch || touch.id !== event.pointerId) return;
  const dx = event.clientX - touch.x, dy = event.clientY - touch.y; touch = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) >= 24) move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
});
app.addEventListener('pointercancel', () => { touch = null; });
document.addEventListener('visibilitychange', () => { syncClock(); persist(); });
window.addEventListener('blur', () => { checkpointClock(); clockStart = null; persist(); });
window.addEventListener('focus', syncClock);
window.addEventListener('pagehide', () => { checkpointClock(); clockStart = null; persist(); });
setInterval(() => {
  syncClock();
  if (clockStart !== null && performance.now() - lastClockSave >= 30000) { lastClockSave = performance.now(); persist(); }
}, 1000);

try {
  const restored = normalizeSave(await store.load(), { '2048': isValid2048, sudoku: isValidSudoku, checkers:isValidCheckers, blocks:isValidBlocks, memory:isValidMemory, minesweeper:isValidMinesweeper, lights:isValidLights, nonograms:isValidNonogram, codebreaker:isValidCodebreaker, sliding:isValidSliding, connect:isValidConnect, sokoban:isValidSokoban, wordle:isValidWordle, simon:isValidSimon, flood:isValidFlood });
  save = restored.save; initialized = true;
  if (save.activeGame === 'sudoku') selected = Math.max(0, save.games.sudoku.values.findIndex(value => !value));
  render();
  if (restored.recovered.length) {
    announce('Some saved game data could not be restored. Your other games are still available.');
    save.activeGame = null; render();
  }
} catch (error) {
  app.setAttribute('aria-busy', 'false');
  app.replaceChildren(Object.assign(document.createElement('p'), { className: 'loading', textContent: 'Sidequest could not open. Reload the plugin to try again.' }));
  console.error('Sidequest startup failed:', error);
}
