import { MINE_DIFFICULTIES, createMinesweeper, revealMine, flagMine, mineCountAt } from './games/minesweeper.mjs';
import { LIGHT_DIFFICULTIES, createLights, moveLights, undoLights, solveLights, isLightsComplete } from './games/lights.mjs';
import { celebration } from './effects.mjs';

export const QUICK_NAMES = { minesweeper: 'Minesweeper', lights: 'Lights Out' };
export const QUICK_CREATORS = { minesweeper: createMinesweeper, lights: createLights };
const duration = ms => `${Math.floor(ms / 60000).toString().padStart(2, '0')}:${(Math.floor(ms / 1000) % 60).toString().padStart(2, '0')}`;
export function quickCards(games, icon) {
  return Object.entries(QUICK_NAMES).map(([id, name], i) => {
    const s = games[id], done = s && (s.result || (id === 'lights' && isLightsComplete(s)));
    const status = done ? 'Done' : s && (s.started || s.moves) ? 'Resume' : 'Play';
    const meta = id === 'minesweeper' ? s?.started ? `${s.revealed.filter(Boolean).length} revealed · ${duration(s.elapsedMs)}` : 'A safe start. A little deduction.' : s ? `${s.moves} moves · ${s.board.filter(Boolean).length} lights on` : 'One tap changes the whole picture.';
    const art = id === 'minesweeper'
      ? `<div class="mini-mines">${[0,1,0,-1,0,2,1,0,1,0,0,-1,0,0,1,0].map(n => `<span class="${n === -1 ? 'mini-flag' : n === 0 ? 'mini-covered' : ''}">${n === -1 ? icon('flag') : n || ''}</span>`).join('')}</div>`
      : `<div class="mini-lights">${[0,1,0,1,1,1,0,1,0].map(n => `<span class="${n ? 'on' : ''}"><i></i></span>`).join('')}</div>`;
    return { id, html: `<button class="game-card" data-game="${id}" aria-label="${status === 'Done' ? 'Open' : status} ${name}"><div class="card-preview preview-${id}" aria-hidden="true"><span class="card-kicker">/ ${id === 'minesweeper' ? 'FOLLOW THE CLUES' : 'A SPARK OF LOGIC'}</span><div class="art-orbit orbit-one"></div>${art}<span class="art-spark spark-one">✦</span></div><div class="card-info"><div class="card-title-line"><span class="card-title">${name}</span><span class="card-arrow">${icon('arrow')}</span></div><p class="card-description">${id === 'minesweeper' ? 'Trust the numbers. Find the safe path.' : 'Clear your mind. Turn down the lights.'}</p><div class="card-meta"><span>${meta}</span><span class="card-state">${status}${icon('play')}</span></div></div></button>` };
  });
}

export function createQuickGames({ getSave, persist, sound, icon, announce, onNew }) {
  let mounted = null, root = null, flagMode = false, hint = -1, suspended = false, revealOrigin = 0;
  let clockStart = null, timer = null, lastClockSave = 0, cleanup = [];
  const state = () => getSave().games[mounted];
  const btn = (action, label, symbol, attrs = '') => `<button type="button" class="button" data-quick="${action}" ${attrs}>${symbol ? icon(symbol) : ''}${label}</button>`;
  function render(id) {
    const mines = id === 'minesweeper', s = getSave().games[id];
    const difficulties = mines ? MINE_DIFFICULTIES : LIGHT_DIFFICULTIES;
    return `<section id="quick-game" class="quick-game ${id}-game" aria-label="${QUICK_NAMES[id]} game"><div class="game-heading"><div><h1>${QUICK_NAMES[id]}</h1><p class="subtitle">${mines ? 'Trust the clues. Find the safe path.' : 'A little logic. A little light.'}</p></div>${btn('new', 'New', 'plus')}</div><div class="quick-options"><select id="quick-difficulty" aria-label="${QUICK_NAMES[id]} difficulty">${Object.entries(difficulties).map(([key, rule]) => `<option value="${key}" ${s.difficulty === key ? 'selected' : ''}>${rule.label}</option>`).join('')}</select><span class="quick-difficulty-note">${mines ? `${s.mineCount} mines` : 'Every puzzle is solvable'}</span></div><div class="stats"><div class="stat"><span class="stat-label">${mines ? 'MINES LEFT' : 'MOVES'}</span><span class="stat-value" id="quick-score"></span></div><div class="stat stat-best"><span class="stat-label">${mines ? 'TIME' : 'LIGHTS ON'}</span><span class="stat-value" id="quick-secondary"></span></div></div><div class="board-wrap"><div id="quick-board" class="${mines ? 'mines-board' : 'lights-board'}" role="group" aria-label="${QUICK_NAMES[id]} board" style="--grid-size:${s.size}"></div><div id="quick-overlay" class="board-overlay" hidden></div></div><div class="quick-tools">${mines ? `<div class="mine-input-mode" role="group" aria-label="Cell action">${btn('reveal-mode', 'Reveal', 'target', 'id="mine-reveal-mode" aria-pressed="true"')}${btn('flag-mode', 'Flag', 'flag', 'id="mine-flag-mode" aria-pressed="false"')}</div>` : `${btn('undo', 'Undo', 'undo', 'id="lights-undo"')}${btn('hint', 'Hint', 'hint', 'id="lights-hint"')}`}</div><p id="quick-feedback" class="quick-feedback" role="status"></p><p id="quick-best" class="quick-best"></p><p class="instructions">${mines ? 'Reveal a tile. Numbers count nearby mines.<br>Right-click or use Flag to mark a mine.<br><kbd>← ↑ ↓ →</kbd> navigate · <kbd>F</kbd> flag · <kbd>Enter</kbd> reveal' : 'Tap a tile to toggle it and its neighbors.<br>Turn every light off to finish.<br><kbd>← ↑ ↓ →</kbd> navigate · <kbd>Enter</kbd> toggle'}</p></section>`;
  }
  function checkpoint() {
    if (clockStart === null || mounted !== 'minesweeper') return;
    state().elapsedMs += Math.max(0, Math.round(performance.now() - clockStart));
    clockStart = performance.now();
  }
  function clockCanRun() { return mounted === 'minesweeper' && state().started && !state().result && !suspended && !document.hidden && document.hasFocus() && !document.getElementById('confirm-dialog').open; }
  function syncClock() {
    if (clockCanRun()) { if (clockStart === null) clockStart = performance.now(); }
    else { checkpoint(); clockStart = null; }
    if (mounted === 'minesweeper') root.querySelector('#quick-secondary').textContent = duration(state().elapsedMs + (clockStart === null ? 0 : performance.now() - clockStart));
  }
  function update() {
    if (!root) return;
    const s = state(), mines = mounted === 'minesweeper', board = root.querySelector('#quick-board');
    const focused = board.contains(document.activeElement), focusIndex = document.activeElement.dataset.quickCell;
    const old = [...board.children].map(node => node.classList.contains('on'));
    const previouslyRevealed = [...board.children].map(node => node.classList.contains('revealed'));
    if (board.children.length !== s.size ** 2) board.innerHTML = Array.from({ length: s.size ** 2 }, (_, i) => `<button type="button" data-quick-cell="${i}" tabindex="${i === 0 ? 0 : -1}"></button>`).join('');
    [...board.children].forEach((node, i) => {
      const position = `Row ${Math.floor(i / s.size) + 1}, column ${i % s.size + 1}`;
      if (mines) {
        const shownMine = s.result && s.mines[i], wrongFlag = s.result === 'lost' && s.flags[i] && !s.mines[i];
        const count = s.revealed[i] && !s.mines[i] ? mineCountAt(s, i) : 0;
        const content = shownMine ? icon('mine') : wrongFlag ? icon('close') : s.flags[i] ? icon('flag') : count ? count : '';
        node.className = `mine-cell${s.revealed[i] || shownMine ? ' revealed' : ''}${s.flags[i] ? ' flagged' : ''}${shownMine ? ' mine' : ''}${s.exploded === i ? ' exploded' : ''}${wrongFlag ? ' wrong-flag' : ''}`;
        if (node.innerHTML !== String(content)) node.innerHTML = content;
        node.dataset.count = count;
        node.setAttribute('aria-label', `${position}: ${shownMine ? 'mine' : wrongFlag ? 'incorrect flag' : s.flags[i] ? 'flagged' : s.revealed[i] ? count ? `${count} nearby ${count === 1 ? 'mine' : 'mines'}` : 'clear' : 'covered'}`);
        node.setAttribute('aria-pressed', String(s.flags[i]));
        if (previouslyRevealed.length && s.revealed[i] && !previouslyRevealed[i]) {
          const distance = Math.abs(Math.floor(i / s.size) - Math.floor(revealOrigin / s.size)) + Math.abs(i % s.size - revealOrigin % s.size);
          node.style.setProperty('--reveal-delay', `${Math.min(160, distance * 16)}ms`);
          node.classList.add('mine-reveal');
        }
      } else {
        node.className = `light-cell${s.board[i] ? ' on' : ''}${hint === i ? ' hinted' : ''}`;
        if (!node.firstChild) node.innerHTML = `<span class="light-lens"><i></i></span><span class="light-coordinate" aria-hidden="true">${Math.floor(i / s.size) + 1}.${i % s.size + 1}</span>`;
        node.setAttribute('aria-label', `${position}: ${s.board[i] ? 'on' : 'off'}${hint === i ? ', suggested move' : ''}`);
        node.setAttribute('aria-pressed', String(!!s.board[i]));
        if (old.length && old[i] !== !!s.board[i]) node.classList.add('light-changed');
      }
    });
    const won = mines ? s.result === 'won' : isLightsComplete(s), done = mines ? !!s.result : won;
    root.querySelector('#quick-score').textContent = mines ? s.mineCount - s.flags.filter(Boolean).length : s.moves;
    if (!mines) root.querySelector('#quick-secondary').textContent = s.board.filter(Boolean).length;
    const best = s.best[s.difficulty];
    root.querySelector('#quick-best').textContent = `Personal best · ${best === null ? 'Set your first record' : mines ? duration(best) : `${best} moves`}${mines ? '' : ` · Puzzle minimum ${solveLights(s.initial, s.size).length}`}`;
    const feedback = root.querySelector('#quick-feedback');
    if (mines) {
      root.querySelector('#mine-reveal-mode').setAttribute('aria-pressed', String(!flagMode));
      root.querySelector('#mine-flag-mode').setAttribute('aria-pressed', String(flagMode));
      board.classList.toggle('flag-mode', flagMode);
      feedback.textContent = s.result === 'won' ? 'Every safe tile found.' : s.result === 'lost' ? 'The clues will lead you further next time.' : !s.started ? 'Your first reveal and its neighbors are safe.' : flagMode ? 'Flag mode · tap a covered tile to mark it.' : 'A number opens its neighbors when enough flags surround it.';
    } else {
      root.querySelector('#lights-undo').disabled = !s.history.length;
      root.querySelector('#lights-hint').disabled = done;
      feedback.textContent = won ? 'All lights off. Nicely done.' : hint >= 0 ? 'Try the outlined tile. It is part of a shortest solution.' : 'Each tap toggles a cross. A second tap reverses it.';
    }
    const overlay = root.querySelector('#quick-overlay');
    overlay.hidden = !done; board.inert = done;
    if (done) overlay.innerHTML = `${won ? celebration() : ''}<span class="overlay-icon">${icon(won ? 'spark' : 'mine')}</span><span class="eyebrow">${won ? 'PUZZLE COMPLETE' : 'ROUND COMPLETE'}</span><h2>${mines ? won ? 'A clear path.' : 'One hidden surprise.' : 'A moment of clarity.'}</h2><p>${mines ? won ? `All ${s.size ** 2 - s.mineCount} safe tiles found · ${duration(s.elapsedMs)}` : 'Reveal a fresh board and follow the clues.' : `${s.moves} moves · minimum ${solveLights(s.initial, s.size).length}`}</p>${btn('new', 'Play again', 'play')}${mines && !won ? btn('review', 'Review board', 'target') : ''}`;
    if (focused && !done) board.querySelector(`[data-quick-cell="${focusIndex}"]`)?.focus({ preventScroll: true });
    syncClock();
  }
  function apply(next, before) {
    if (next === before) return;
    getSave().games[mounted] = next; persist(); update();
    const won = mounted === 'minesweeper' ? next.result === 'won' : isLightsComplete(next);
    void sound.play(won ? 'win' : next.result === 'lost' ? 'error' : 'tick');
    announce(won ? `${QUICK_NAMES[mounted]} complete.` : next.result === 'lost' ? 'A mine was revealed. Try a fresh board.' : mounted === 'minesweeper' ? `${next.revealed.filter(Boolean).length} safe tiles revealed. ${next.flags.filter(Boolean).length} flags placed.` : `${next.board.filter(Boolean).length} lights remain.`);
  }
  function choose(index, flag = false) {
    if (suspended) return;
    checkpoint(); const before = state();
    revealOrigin = index; boardFocus(index);
    hint = -1;
    apply(mounted === 'minesweeper' ? flag ? flagMine(before, index) : revealMine(before, index) : moveLights(before, index), before);
  }
  function click(e) {
    const target = e.target.closest('button');
    if (!target || target.disabled) return;
    if (target.dataset.quickCell !== undefined) { choose(Number(target.dataset.quickCell), flagMode); return; }
    const action = target.dataset.quick;
    if (action === 'new') { checkpoint(); onNew(mounted); }
    else if (action === 'flag-mode' || action === 'reveal-mode') { flagMode = action === 'flag-mode'; update(); }
    else if (action === 'undo') { hint = -1; apply(undoLights(state()), state()); }
    else if (action === 'hint') { hint = solveLights(state().board, state().size)[0] ?? -1; update(); boardFocus(hint); announce('A suggested tile is outlined.'); }
    else if (action === 'review') { root.querySelector('#quick-overlay').hidden = true; root.querySelector('#quick-board').inert = false; boardFocus(0); }
  }
  function boardFocus(index) {
    const nodes = root?.querySelectorAll('[data-quick-cell]');
    if (!nodes?.length) return;
    if (index === undefined) index = [...nodes].findIndex(node => node.tabIndex === 0);
    nodes.forEach((node, i) => { node.tabIndex = i === Math.max(0, index) ? 0 : -1; });
    nodes[Math.max(0, index)]?.focus({ preventScroll: true });
  }
  function keydown(e) {
    if (suspended || e.altKey || e.ctrlKey || e.metaKey || e.target.dataset.quickCell === undefined || document.getElementById('confirm-dialog').open) return;
    const index = Number(e.target.dataset.quickCell), size = state().size; let next = index;
    if (e.key === 'ArrowLeft' && index % size) next--;
    if (e.key === 'ArrowRight' && index % size < size - 1) next++;
    if (e.key === 'ArrowUp' && index >= size) next -= size;
    if (e.key === 'ArrowDown' && index < size * (size - 1)) next += size;
    if (e.key.startsWith('Arrow')) { e.preventDefault(); boardFocus(next); }
    else if (mounted === 'minesweeper' && e.key.toLowerCase() === 'f') { e.preventDefault(); if (!e.repeat) choose(index, true); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) choose(index, mounted === 'minesweeper' && e.key === ' ' && flagMode); }
  }
  function mount(id) {
    mounted = id; root = document.getElementById('quick-game'); flagMode = false; hint = -1; suspended = false;
    const context = e => { if (id === 'minesweeper' && e.target.closest('[data-quick-cell]')) { e.preventDefault(); choose(Number(e.target.closest('[data-quick-cell]').dataset.quickCell), true); } };
    const change = e => { if (e.target.id === 'quick-difficulty') { const difficulty = e.target.value; e.target.value = state().difficulty; checkpoint(); onNew(id, difficulty); } };
    const activity = () => { syncClock(); persist(); };
    const blur = () => { checkpoint(); clockStart = null; persist(); };
    root.addEventListener('click', click); root.addEventListener('keydown', keydown); root.addEventListener('contextmenu', context); root.addEventListener('change', change);
    window.addEventListener('blur', blur); window.addEventListener('pagehide', blur); window.addEventListener('focus', activity); document.addEventListener('visibilitychange', activity);
    const element = root;
    cleanup.push(() => { element.removeEventListener('click', click); element.removeEventListener('keydown', keydown); element.removeEventListener('contextmenu', context); element.removeEventListener('change', change); window.removeEventListener('blur', blur); window.removeEventListener('pagehide', blur); window.removeEventListener('focus', activity); document.removeEventListener('visibilitychange', activity); });
    if (id === 'minesweeper') timer = setInterval(() => { syncClock(); if (clockStart !== null && performance.now() - lastClockSave > 30000) { checkpoint(); persist(); lastClockSave = performance.now(); } }, 1000);
    update();
  }
  function dispose() {
    if (!mounted) return;
    checkpoint(); clockStart = null; persist(); clearInterval(timer); timer = null;
    cleanup.forEach(fn => fn()); cleanup = []; root = null; mounted = null;
  }
  function focus() { if (!root) return; if (!root.querySelector('#quick-overlay').hidden) root.querySelector('#quick-overlay [data-quick="new"]')?.focus({ preventScroll: true }); else boardFocus(); }
  function suspend() { if (!mounted) return; checkpoint(); suspended = true; syncClock(); persist(); }
  function resume() { if (!mounted) return; suspended = false; syncClock(); }
  return { render, mount, dispose, focus, suspend, resume, isMounted: () => mounted !== null };
}
