import { bindGameKeyboard } from './keyboard.mjs';
import { celebration } from './effects.mjs';
import { ARCADE_NAMES, ARCADE_COLORS as colors, ARCADE_SUBTITLES as subtitles, arcadeComplete as complete } from './arcade-cards.mjs';
import { drawArcade } from './arcade-canvas.mjs';
import { createSnake, stepSnake, turnSnake, isValidSnake, SNAKE_SPEEDS } from './games/snake.mjs';
import { createPipes, rotatePipe, hintPipe, undoPipes, pipeNetwork, isValidPipes, PIPE_DIFFICULTIES } from './games/pipes.mjs';
import { createBubbles, fireBubble, swapBubbles, undoBubbles, isValidBubbles } from './games/bubbles.mjs';
import { createReversi, moveReversi, undoReversi, chooseReversiMove, reversiMoves, reversiFlips, isValidReversi } from './games/reversi.mjs';
import { createBreakout, stepBreakout, launchBreakout, steerBreakout, isValidBreakout, BREAKOUT_DIFFICULTIES } from './games/breakout.mjs';
import { createFlow, beginFlow, extendFlow, finishFlow, undoFlow, hintFlow, flowConnected, isFlowComplete, isValidFlow, FLOW_DIFFICULTIES, FLOW_COLORS } from './games/flow.mjs';
export const ARCADE_CREATORS = { snake: createSnake, pipes: createPipes, bubbles: createBubbles, reversi: createReversi, breakout: createBreakout, flow: createFlow };
export const ARCADE_VALIDATORS = { snake: isValidSnake, pipes: isValidPipes, bubbles: isValidBubbles, reversi: isValidReversi, breakout: isValidBreakout, flow: isValidFlow };
function pipeArt(mask) {
  const bend = { 3: 'M50 0V25Q50 50 75 50H100', 6: 'M100 50H75Q50 50 50 75V100', 12: 'M50 100V75Q50 50 25 50H0', 9: 'M0 50H25Q50 50 50 25V0' };
  const path = bend[mask] ?? (mask === 5 ? 'M50 0V100' : 'M0 50H100');
  return '<svg viewBox="0 0 100 100" aria-hidden="true"><path class="pipe-shadow" d="' + path + '"/><path class="pipe-line" d="' + path + '"/></svg>';
}
export function createArcadeGames({ getSave, persist, sound, icon, announce, onNew }) {
  let mounted = null, root = null, cursor = 0, suspended = false, busy = false, aiTimer = null, raf = null, lastTime = 0, accumulator = 0, lastSave = 0, sequence = 0, projectile = null, sparks = [], trail = [], pointer = null, ignoreClickUntil = 0, cleanup = [];
  const pressed = new Set(), state = () => getSave().games[mounted];
  const btn = (action, text, glyph = '', extra = '') => '<button type="button" class="button" data-arcade="' + action + '" ' + extra + '>' + (glyph ? icon(glyph) : '') + text + '</button>';
  const real = id => id === 'snake' || id === 'breakout';
  const rules = id => id === 'pipes' ? PIPE_DIFFICULTIES : id === 'flow' ? FLOW_DIFFICULTIES : id === 'snake' ? SNAKE_SPEEDS : BREAKOUT_DIFFICULTIES;
  function options(id, s) {
    if (id === 'reversi') return '<div class="quick-options"><select id="arcade-mode" aria-label="Reversi opponent"><option value="computer"' + (s.mode === 'computer' ? ' selected' : '') + '>Vs computer</option><option value="local"' + (s.mode === 'local' ? ' selected' : '') + '>Two players</option></select><span id="arcade-turn"></span></div>';
    if (id === 'bubbles') return '<p class="arcade-rule">Match three or more · bank shots off the walls</p>';
    return '<div class="quick-options"><select id="arcade-difficulty" aria-label="' + ARCADE_NAMES[id] + ' difficulty">' + Object.entries(rules(id)).map(([key, rule]) => '<option value="' + key + '"' + (s.difficulty === key ? ' selected' : '') + '>' + rule.label + '</option>').join('') + '</select><span class="quick-difficulty-note">' + (id === 'pipes' || id === 'flow' ? 'Every puzzle is solvable' : 'Your pace, your game') + '</span></div>';
  }
  function render(id) {
    const s = getSave().games[id], grid = ['pipes', 'flow', 'reversi'].includes(id);
    const instructions = {
      snake: 'Collect the amber fruit. Keep clear of the walls and your tail.<br><kbd>Arrows / WASD</kbd> turn · <kbd>Space / P</kbd> pause',
      pipes: 'Rotate pieces to connect IN to OUT through every tile, without leaks.<br><kbd>Arrows</kbd> navigate · <kbd>Enter / Space</kbd> rotate<br>Right-click or <kbd>Shift + Enter</kbd> turns the other way.',
      bubbles: 'Match three to pop. Disconnected bubbles fall away.<br><kbd>← → / A D</kbd> aim · <kbd>Enter / Space</kbd> fire · <kbd>X</kbd> swap<br>Five misses bring a new row. Tap the board to aim and fire.',
      reversi: 'Place a disc to enclose and flip the other color.<br>A player without a legal move passes automatically.<br><kbd>Arrows</kbd> navigate · <kbd>Enter / Space</kbd> place',
      breakout: 'Keep the ball in play. Clear every brick.<br><kbd>← → / A D</kbd> move · <kbd>Enter / Space</kbd> launch<br><kbd>P</kbd> pause · Drag or move the pointer to steer.',
      flow: 'Join matching numbers without crossing. Use every square.<br>Drag a path, or <kbd>Enter</kbd> start / finish and <kbd>Arrows</kbd> draw.<br><kbd>Escape</kbd> cancels a path · <kbd>Ctrl / Cmd + Z</kbd> undo'
    };
    const board = grid ? '<div id="' + id + '-board" class="arcade-grid ' + id + '-board" role="group" aria-label="' + ARCADE_NAMES[id] + ' board" style="--grid-size:' + (id === 'reversi' ? 8 : s.size) + '"></div>' : '<canvas id="arcade-canvas" width="640" height="' + (id === 'snake' ? 640 : id === 'breakout' ? 880 : 840) + '" class="arcade-canvas ' + id + '-canvas" tabindex="0" role="img" aria-label="' + ARCADE_NAMES[id] + ' board. ' + (id === 'snake' ? 'Arrow keys or W A S D steer. Space starts or pauses.' : id === 'breakout' ? 'Left and right move the paddle. Space launches. P pauses.' : 'Left and right aim. Space fires. X swaps colors.') + '"></canvas>';
    const controls = id === 'snake' ? '<div class="direction-controls">' + ['left', 'up', 'down', 'right'].map(d => btn(d, '', d, 'aria-label="Turn ' + d + '"')).join('') + '</div>' : id === 'breakout' ? '<div class="direction-controls">' + btn('left', '', 'left', 'aria-label="Move paddle left"') + btn('launch', 'Launch', 'play', 'id="arcade-launch"') + btn('right', '', 'right', 'aria-label="Move paddle right"') + '</div>' : id === 'bubbles' ? '<div class="direction-controls">' + btn('aim-left', '', 'left', 'aria-label="Aim left"') + btn('fire', 'Fire', 'target', 'id="arcade-fire"') + btn('aim-right', '', 'right', 'aria-label="Aim right"') + btn('swap', 'Swap', 'refresh') + '</div>' : '';
    const tools = real(id) ? btn('pause', 'Start', 'play', 'id="arcade-pause"') : btn('undo', 'Undo', 'undo', 'id="arcade-undo"') + (['pipes', 'flow'].includes(id) ? btn('hint', 'Hint', 'hint', 'id="arcade-hint"') : '');
    return '<section id="arcade-game" class="arcade-game ' + id + '-game" aria-label="' + ARCADE_NAMES[id] + ' game"><div class="game-heading"><div><h1>' + ARCADE_NAMES[id] + '</h1><p class="subtitle">' + subtitles[id] + '</p></div>' + btn('new', 'New', 'plus') + '</div>' + options(id, s) + '<div class="stats"><div class="stat"><span class="stat-label" id="arcade-score-label"></span><span class="stat-value" id="arcade-score"></span></div><div class="stat stat-best"><span class="stat-label" id="arcade-secondary-label"></span><span class="stat-value" id="arcade-secondary"></span></div></div><div class="board-wrap arcade-board-wrap">' + board + '<div id="arcade-overlay" class="board-overlay" hidden></div></div>' + controls + '<div class="game-tools">' + tools + '<span id="arcade-best" class="move-count"></span></div><p class="quick-feedback" id="arcade-feedback"></p><p class="instructions">' + instructions[id] + '</p></section>';
  }
  function set(next) { if (!mounted || next === state()) return; if (mounted === 'flow' && next.active !== null && isFlowComplete(next)) next = finishFlow(next); getSave().games[mounted] = next; persist(); update(); }
  function message(text) { const node = root?.querySelector('#arcade-feedback'); if (node) node.textContent = text; }
  function overlay(html, won = false) { const node = root.querySelector('#arcade-overlay'); node.hidden = !html; if (html) node.innerHTML = (won ? celebration() : '') + html; }
  function draw() { const canvas = root?.querySelector('canvas'); if (canvas) drawArcade(canvas, mounted, shotBoard ?? state(), { projectile, trail, sparks }); }
  function updateGrid() {
    const s = state(), board = root.querySelector('#' + mounted + '-board'), focused = board.contains(document.activeElement); let cells;
    if (mounted === 'pipes') {
      const network = pipeNetwork(s), names = ['north', 'east', 'south', 'west'];
      cells = s.tiles.map((mask, i) => '<button type="button" class="pipe-cell' + (network.powered.has(i) ? ' powered' : '') + (network.leaks.includes(i) ? ' leaking' : '') + '" data-arcade-cell="' + i + '" tabindex="' + (i === cursor ? 0 : -1) + '" aria-label="Row ' + (Math.floor(i / s.size) + 1) + ', column ' + (i % s.size + 1) + ': pipe open ' + names.filter((_, d) => mask & (1 << d)).join(', ') + (i === s.source ? ', inlet' : i === s.sink ? ', outlet' : '') + '">' + pipeArt(mask) + (i === s.source || i === s.sink ? '<span class="pipe-port">' + (i === s.source ? 'IN' : 'OUT') + '</span>' : '') + '</button>');
      message(network.won ? 'A complete connection.' : network.powered.size + '/' + s.tiles.length + ' tiles flowing · ' + network.leaks.length + ' open connections');
    } else if (mounted === 'reversi') {
      const thinking = s.mode === 'computer' && s.turn === -1 && !s.result, legal = thinking ? [] : reversiMoves(s);
      cells = s.board.map((p, i) => '<button type="button" class="reversi-cell' + (legal.includes(i) ? ' playable' : '') + (s.lastMove === i ? ' last-move' : '') + '" data-arcade-cell="' + i + '" tabindex="' + (i === cursor ? 0 : -1) + '" aria-label="Row ' + (Math.floor(i / 8) + 1) + ', column ' + (i % 8 + 1) + ': ' + (p ? p === 1 ? 'ink disc' : 'pearl disc' : legal.includes(i) ? 'legal move' : 'empty') + '">' + (p ? '<span class="reversi-disc" data-player="' + p + '"></span>' : legal.includes(i) ? '<span class="reversi-guide">' + reversiFlips(s.board, i, s.turn).length + '</span>' : '') + '</button>');
      root.querySelector('#arcade-turn').textContent = s.result ? 'Round complete' : thinking ? 'Thinking…' : (s.turn === 1 ? s.mode === 'computer' ? 'Your' : 'Ink' : 'Pearl') + ' turn';
      message(s.passed !== null ? (s.passed === 1 ? 'Ink' : 'Pearl') + ' has no move and passes.' : s.result ? 'Every disc counts.' : 'Highlighted squares show how many discs you can flip.');
      if (thinking && !suspended && !document.hidden && !aiTimer) aiTimer = setTimeout(() => { aiTimer = null; if (mounted !== 'reversi' || suspended) return; const move = chooseReversiMove(state()); if (move !== null) playReversi(move); }, 400);
    } else {
      const occupied = new Map(); s.paths.forEach((path, c) => path.forEach(i => occupied.set(i, c)));
      cells = Array.from({ length: s.size ** 2 }, (_, i) => {
        const endpoint = s.pairs.findIndex(pair => pair.includes(i)), color = endpoint >= 0 ? endpoint : occupied.get(i);
        return '<button type="button" class="flow-cell' + (endpoint >= 0 ? ' endpoint' : '') + (s.active !== null && color === s.active ? ' drawing' : '') + '" data-arcade-cell="' + i + '" tabindex="' + (i === cursor ? 0 : -1) + '"' + (color !== undefined ? ' style="--path-color:' + colors[color] + '"' : '') + ' aria-label="Row ' + (Math.floor(i / s.size) + 1) + ', column ' + (i % s.size + 1) + ': ' + (endpoint >= 0 ? FLOW_COLORS[endpoint] + ' endpoint ' + (endpoint + 1) : color !== undefined ? FLOW_COLORS[color] + ' path' : 'empty') + '">' + (endpoint >= 0 ? '<span class="flow-endpoint">' + (endpoint + 1) + '</span>' : '') + '</button>';
      });
      const paths = s.paths.map((p, c) => p.length > 1 ? '<polyline points="' + p.map(i => (i % s.size * 100 + 50) + ',' + (Math.floor(i / s.size) * 100 + 50)).join(' ') + '" stroke="' + colors[c] + '"/>' : '').join('');
      cells.push('<svg class="flow-paths" viewBox="0 0 ' + (s.size * 100) + ' ' + (s.size * 100) + '" aria-hidden="true">' + paths + '</svg>');
      const filled = s.paths.reduce((n, p) => n + p.length, 0), connected = s.paths.filter((_, c) => flowConnected(s, c)).length;
      message(isFlowComplete(s) ? 'Every color connected. Every square covered.' : s.active !== null ? 'Drawing ' + FLOW_COLORS[s.active] + ' · Enter finishes · Escape cancels' : connected + '/' + s.pairs.length + ' pairs connected · ' + filled + '/' + s.size ** 2 + ' squares covered');
    }
    board.innerHTML = cells.join(''); board.inert = complete(mounted, s);
    if (focused && !board.inert) board.querySelector('[data-arcade-cell="' + cursor + '"]')?.focus({ preventScroll: true });
  }
  function update() {
    if (!root) return; const s = state(), done = complete(mounted, s) && !busy;
    root.querySelector('#arcade-score-label').textContent = mounted === 'reversi' ? 'INK' : ['pipes', 'flow'].includes(mounted) ? 'MOVES' : 'SCORE';
    root.querySelector('#arcade-score').textContent = mounted === 'reversi' ? s.board.filter(p => p === 1).length : ['pipes', 'flow'].includes(mounted) ? s.moves : s.score;
    root.querySelector('#arcade-secondary-label').textContent = mounted === 'reversi' ? 'PEARL' : mounted === 'breakout' ? 'LIVES' : mounted === 'bubbles' ? 'ROW IN' : mounted === 'pipes' ? 'CONNECTED' : mounted === 'flow' ? 'PAIRS' : 'BEST';
    root.querySelector('#arcade-secondary').textContent = mounted === 'reversi' ? s.board.filter(p => p === -1).length : mounted === 'breakout' ? s.lives : mounted === 'bubbles' ? 5 - s.misses : mounted === 'pipes' ? pipeNetwork(s).powered.size + '/' + s.tiles.length : mounted === 'flow' ? s.paths.filter((_, c) => flowConnected(s, c)).length + '/' + s.pairs.length : s.best;
    root.querySelector('#arcade-best').textContent = mounted === 'reversi' ? s.moves + ' discs played' : ['pipes', 'flow'].includes(mounted) ? s.hints ? s.hints + ' hints used' : 'Best · ' + (s.best[s.difficulty] ?? '—') : 'Best · ' + s.best;
    const undo = root.querySelector('#arcade-undo'); if (undo) undo.disabled = !s.history.length || busy;
    const hint = root.querySelector('#arcade-hint'); if (hint) hint.disabled = done;
    if (['pipes', 'flow', 'reversi'].includes(mounted)) updateGrid(); else draw();
    if (done) {
      const won = mounted === 'reversi' ? s.result !== 'draw' && (s.mode === 'local' || s.result === 1) : mounted === 'pipes' || mounted === 'flow' || s.result === 'won' || s.phase === 'won';
      const title = mounted === 'pipes' ? 'All connected.' : mounted === 'flow' ? 'A perfect flow.' : mounted === 'reversi' ? s.result === 'draw' ? 'An even board.' : (s.result === 1 ? 'Ink' : 'Pearl') + ' wins.' : won ? 'Board cleared!' : mounted === 'snake' ? 'One more turn?' : 'Try a new angle.';
      overlay('<h2>' + title + '</h2><p>' + (mounted === 'reversi' ? 'Ink ' + s.board.filter(p => p === 1).length + ' · Pearl ' + s.board.filter(p => p === -1).length : ['pipes', 'flow'].includes(mounted) ? s.moves + ' moves' : 'Score ' + s.score) + '</p>' + btn('new', 'Play again', 'play'), won);
    } else if (real(mounted) && s.paused) overlay('<span class="overlay-icon">' + icon(s.ticks || s.phase === 'playing' ? 'pause' : 'play') + '</span><h2>' + (mounted === 'breakout' && s.phase === 'ready' ? 'Find your angle.' : mounted === 'snake' && !s.ticks ? 'Ready to grow?' : 'Take your time.') + '</h2><p>' + (mounted === 'snake' ? 'Steer with arrows or WASD.' : 'Move the paddle, then launch.') + '</p>' + btn('start', mounted === 'breakout' && s.phase === 'ready' ? 'Launch ball' : mounted === 'snake' && !s.ticks ? 'Start' : 'Resume', 'play'));
    else overlay('');
    if (real(mounted)) { const button = root.querySelector('#arcade-pause'); button.innerHTML = icon(s.paused ? 'play' : 'pause') + (s.paused ? mounted === 'snake' && !s.ticks ? 'Start' : 'Resume' : 'Pause'); button.disabled = done; }
    if (mounted === 'bubbles') { root.querySelector('#arcade-fire').disabled = done || busy; message('Next color · ' + ['Mint', 'Coral', 'Amber', 'Violet'][s.next] + ' · ' + s.shots + ' shots'); }
    if (mounted === 'snake') message(s.paused ? 'Your game is saved. Resume when you are ready.' : 'Room to grow · ' + s.body.length + ' segments');
    if (mounted === 'breakout') message(s.phase === 'ready' ? s.lives < 3 ? 'A fresh ball. Your progress stays.' : 'Launch when your paddle is in position.' : s.paused ? 'Paused. Your game is saved.' : s.bricks.filter(Boolean).length + ' bricks left · ' + (s.combo > 1 ? Math.min(5, s.combo) + '× combo' : 'Aim with the paddle edges'));
  }
  function playReversi(index) {
    const before = state(), flips = reversiFlips(before.board, index, before.turn), next = moveReversi(before, index); if (next === before) return;
    cursor = index; set(next); for (const i of flips) root.querySelector('[data-arcade-cell="' + i + '"] .reversi-disc')?.classList.add('flipped');
    void sound.play(next.result ? 'win' : 'merge'); announce(next.result ? 'Reversi round complete.' : flips.length + ' discs flipped.');
  }
  function focus() {
    if (!root) return; const overlayNode = root.querySelector('#arcade-overlay');
    if (!overlayNode.hidden) { overlayNode.querySelector('button')?.focus({ preventScroll: true }); return; }
    (root.querySelector('[data-arcade-cell="' + cursor + '"]') ?? root.querySelector('canvas'))?.focus({ preventScroll: true });
  }
  function choose(index, reverse = false) {
    if (suspended || busy || complete(mounted, state())) return; cursor = index;
    if (mounted === 'pipes') { const next = rotatePipe(state(), index, reverse ? -1 : 1); set(next); void sound.play(pipeNetwork(next).won ? 'win' : 'tick'); }
    else if (mounted === 'reversi') { if (state().mode !== 'computer' || state().turn === 1) playReversi(index); }
    else if (mounted === 'flow') { set(state().active === null ? beginFlow(state(), index) : finishFlow(state())); if (isFlowComplete(state())) void sound.play('win'); }
    focus();
  }
  function toggle(start = false) {
    const s = state(); if (!real(mounted) || complete(mounted, s)) return; pressed.clear();
    set(mounted === 'snake' ? { ...s, paused: start ? false : !s.paused } : start ? launchBreakout(s) : s.phase === 'ready' ? launchBreakout(s) : { ...s, paused: !s.paused });
    lastTime = 0; accumulator = 0; focus();
  }
  function action(name) {
    if (!mounted || suspended) return;
    if (name === 'new') { onNew(mounted); return; }
    if (name === 'start' || name === 'launch') { toggle(true); return; }
    if (name === 'pause') { toggle(); return; }
    if (busy) return;
    if (name === 'undo') { clearTimeout(aiTimer); aiTimer = null; set(mounted === 'pipes' ? undoPipes(state()) : mounted === 'flow' ? undoFlow(state()) : mounted === 'reversi' ? undoReversi(state()) : undoBubbles(state())); }
    else if (name === 'hint') { set(mounted === 'pipes' ? hintPipe(state()) : hintFlow(state())); announce('A connection revealed. Hinted games do not set personal records.'); }
    else if (mounted === 'snake' && ['up', 'right', 'down', 'left'].includes(name)) set(turnSnake(state(), name));
    else if (mounted === 'breakout' && ['left', 'right'].includes(name)) set(steerBreakout(state(), state().paddle + (name === 'left' ? -20 : 20)));
    else if (mounted === 'bubbles') {
      if (name === 'fire') void shoot(); else if (name === 'swap') set(swapBubbles(state())); else if (name.startsWith('aim-')) set({ ...state(), aim: Math.max(-70, Math.min(70, state().aim + (name === 'aim-left' ? -3 : 3))) });
    }
    focus();
  }
  function keydown(e) {
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && key === 'z') { e.preventDefault(); action('undo'); return; }
    if (e.target.closest('button[data-arcade]') && ['enter', ' '].includes(key)) return;
    if (mounted === 'snake') {
      const direction = { arrowup: 'up', w: 'up', arrowright: 'right', d: 'right', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left' }[key];
      if (direction) { e.preventDefault(); set(turnSnake(state(), direction)); } else if (['p', ' ', 'enter'].includes(key)) { e.preventDefault(); if (!e.repeat) toggle(); }
    } else if (mounted === 'breakout') {
      if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) { e.preventDefault(); pressed.add(['arrowleft', 'a'].includes(key) ? 'left' : 'right'); if (state().phase === 'ready' || state().paused) set(steerBreakout(state(), state().paddle + (['arrowleft', 'a'].includes(key) ? -14 : 14))); }
      else if (['enter', ' '].includes(key)) { e.preventDefault(); if (!e.repeat) toggle(true); } else if (key === 'p') { e.preventDefault(); if (!e.repeat) toggle(); }
    } else if (mounted === 'bubbles') {
      if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) { e.preventDefault(); action(['arrowleft', 'a'].includes(key) ? 'aim-left' : 'aim-right'); }
      else if (key === 'x') { e.preventDefault(); if (!e.repeat) action('swap'); } else if (['enter', ' '].includes(key)) { e.preventDefault(); if (!e.repeat) action('fire'); }
    } else {
      if (key === 'escape' && mounted === 'flow' && state().active !== null) { e.preventDefault(); set(undoFlow(state())); focus(); return; }
      if (['enter', ' '].includes(key)) { e.preventDefault(); if (!e.repeat) choose(cursor, e.shiftKey); return; }
      const size = mounted === 'reversi' ? 8 : state().size, previous = cursor;
      if (key === 'arrowleft' && cursor % size) cursor--; if (key === 'arrowright' && cursor % size < size - 1) cursor++; if (key === 'arrowup' && cursor >= size) cursor -= size; if (key === 'arrowdown' && cursor < size * (size - 1)) cursor += size;
      if (key.startsWith('arrow')) { e.preventDefault(); if (mounted === 'flow' && state().active !== null && cursor !== previous) set(extendFlow(state(), cursor)); root.querySelectorAll('[data-arcade-cell]').forEach(n => n.tabIndex = Number(n.dataset.arcadeCell) === cursor ? 0 : -1); focus(); }
    }
  }
  function pause() {
    pressed.clear(); pointer = null; clearTimeout(aiTimer); aiTimer = null;
    if (mounted && real(mounted) && !state().paused) set({ ...state(), paused: true });
    if (mounted === 'flow' && state().active !== null) set(finishFlow(state()));
  }
  function pointerPosition(e) { const canvas = root.querySelector('canvas'), box = canvas.getBoundingClientRect(); return { x: (e.clientX - box.left) * 320 / box.width, y: (e.clientY - box.top) * (canvas.height / 2) / box.height }; }
  function flowIndex(e) { const board = root.querySelector('#flow-board'), box = board.getBoundingClientRect(), size = state().size, row = Math.floor((e.clientY - box.top) / box.height * size), col = Math.floor((e.clientX - box.left) / box.width * size); return row >= 0 && col >= 0 && row < size && col < size ? row * size + col : -1; }
  function pointerdown(e) {
    if (!e.isPrimary || e.button !== 0 || suspended || busy || complete(mounted, state())) return;
    const cell = e.target.closest('[data-arcade-cell]'), canvas = e.target.closest('canvas'), move = e.target.closest('[data-arcade="left"],[data-arcade="right"]');
    if (mounted === 'flow' && cell) { e.preventDefault(); if (state().active !== null) set(finishFlow(state())); cursor = Number(cell.dataset.arcadeCell); set(beginFlow(state(), cursor)); if (state().active !== null) { const board = root.querySelector('#flow-board'); board.setPointerCapture(e.pointerId); pointer = { id: e.pointerId }; } focus(); }
    else if (canvas) {
      e.preventDefault(); canvas.setPointerCapture(e.pointerId); pointer = { id: e.pointerId, ...pointerPosition(e) }; canvas.focus({ preventScroll: true });
      if (mounted === 'breakout') { set(steerBreakout(state(), pointer.x)); if (state().phase === 'ready' || state().paused) toggle(true); }
      else if (mounted === 'bubbles') set({ ...state(), aim: Math.max(-70, Math.min(70, Math.atan2(pointer.x - 160, Math.max(40, 391 - pointer.y)) * 180 / Math.PI)) });
    } else if (mounted === 'breakout' && move) { pressed.add(move.dataset.arcade); move.setPointerCapture(e.pointerId); pointer = { id: e.pointerId, control: true }; }
  }
  function pointermove(e) {
    if (!root || suspended || busy) return;
    if (mounted === 'breakout' && e.target.closest('canvas') && (e.pointerType === 'mouse' || pointer?.id === e.pointerId)) { getSave().games.breakout = steerBreakout(state(), pointerPosition(e).x); draw(); }
    if (!pointer || pointer.id !== e.pointerId || pointer.control) return;
    if (mounted === 'flow') {
      const index = flowIndex(e); if (index < 0) return; const s = state(), from = s.paths[s.active]?.at(-1); if (from === undefined) return;
      const size = s.size, sameRow = Math.floor(from / size) === Math.floor(index / size), sameCol = from % size === index % size;
      if (!sameRow && !sameCol) return; let next = s, pos = from; const step = sameRow ? Math.sign(index - from) : Math.sign(index - from) * size;
      while (pos !== index) { pos += step; const extended = extendFlow(next, pos); if (extended === next) break; next = extended; }
      cursor = next.paths[next.active].at(-1); set(next);
    } else if (mounted === 'bubbles') { const p = pointerPosition(e); set({ ...state(), aim: Math.max(-70, Math.min(70, Math.atan2(p.x - 160, Math.max(40, 391 - p.y)) * 180 / Math.PI)) }); }
  }
  function pointerup(e) {
    if (!pointer || pointer.id !== e.pointerId) return; const start = pointer; pointer = null; pressed.clear();
    if (mounted === 'flow') { set(finishFlow(state())); ignoreClickUntil = performance.now() + 350; if (isFlowComplete(state())) void sound.play('win'); }
    else if (mounted === 'bubbles') void shoot();
    else if (mounted === 'snake') { const p = pointerPosition(e), dx = p.x - start.x, dy = p.y - start.y; if (Math.max(Math.abs(dx), Math.abs(dy)) > 14) set(turnSnake(state(), Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up')); }
    persist();
  }
  function frame(time) {
    if (!root || !real(mounted)) return; raf = requestAnimationFrame(frame);
    if (suspended || state().paused || complete(mounted, state())) { lastTime = 0; return; }
    const elapsed = lastTime ? Math.min(0.08, (time - lastTime) / 1000) : 0; lastTime = time; const before = state();
    if (mounted === 'snake') { accumulator += elapsed * 1000; const interval = SNAKE_SPEEDS[before.difficulty].interval; if (accumulator >= interval) { accumulator %= interval; getSave().games.snake = stepSnake(before); persist(); } }
    else getSave().games.breakout = stepBreakout(before, elapsed, (pressed.has('right') ? 1 : 0) - (pressed.has('left') ? 1 : 0));
    const next = state(); if (next.score !== before.score) { void sound.play('tick'); sparks.push({ x: mounted === 'snake' ? next.body[0] % 16 * 20 + 10 : next.ball.x, y: mounted === 'snake' ? Math.floor(next.body[0] / 16) * 20 + 10 : next.ball.y, color: '#efc768', born: time }); }
    if (mounted === 'breakout') { trail.push({ x: next.ball.x, y: next.ball.y }); if (trail.length > 9) trail.shift(); }
    sparks = sparks.filter(p => time - p.born < 450);
    if (time - lastSave > 600 || next.score !== before.score || next.phase !== before.phase || next.result !== before.result) { persist(); lastSave = time; update(); } else draw();
    if (complete(mounted, next) && !complete(mounted, before)) { void sound.play(next.result === 'lost' || next.phase === 'lost' ? 'error' : 'win'); announce(ARCADE_NAMES[mounted] + ' round complete. Score ' + next.score + '.'); }
  }
  let shotBoard = null, shotTimer = null;
  function stopShot() {
    sequence++; cancelAnimationFrame(raf); clearTimeout(shotTimer); shotTimer = null;
    shotBoard = null; projectile = null; busy = false;
  }
  function shoot() {
    if (!root || mounted !== 'bubbles' || suspended || busy || state().result) return;
    const before = state(), shot = fireBubble(before), token = ++sequence;
    // Gameplay and saves must not depend on an animation frame being delivered.
    getSave().games.bubbles = shot.state; persist(); shotBoard = before; busy = true; update();
    root.querySelector('[data-arcade="new"]').disabled = true;
    const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.min(420, shot.path.length * 4), started = performance.now();
    let finished = false;
    function finish() {
      if (finished || token !== sequence || mounted !== 'bubbles' || !root) return; finished = true;
      clearTimeout(shotTimer); shotTimer = null; cancelAnimationFrame(raf);
      shotBoard = null; projectile = null; busy = false; update(); root.querySelector('[data-arcade="new"]').disabled = false;
      sparks = shot.popped.map(p => ({ ...p, color: colors[p.color], born: performance.now() }));
      void sound.play(shot.state.result === 'won' ? 'win' : shot.state.result === 'lost' ? 'error' : shot.popped.length ? 'merge' : 'tick');
      announce(shot.popped.length ? shot.popped.length + ' bubbles cleared.' : 'Bubble placed.');
      if (sparks.length && duration) { const end = performance.now() + 450; function fade() { if (token !== sequence || !root) return; draw(); if (performance.now() < end) raf = requestAnimationFrame(fade); } raf = requestAnimationFrame(fade); }
      focus();
    }
    function animate() {
      if (finished || token !== sequence || !root) return;
      const progress = Math.max(0, Math.min(1, (performance.now() - started) / duration));
      projectile = { ...shot.path[Math.min(shot.path.length - 1, Math.floor(progress * (shot.path.length - 1)))], color: before.current }; draw();
      if (progress < 1) raf = requestAnimationFrame(animate); else finish();
    }
    if (!duration) finish();
    else { raf = requestAnimationFrame(animate); shotTimer = setTimeout(finish, duration + 80); }
  }
  function mount(id) {
    mounted = id; root = document.getElementById('arcade-game'); cursor = id === 'reversi' ? reversiMoves(state())[0] ?? 0 : id === 'flow' ? state().pairs[0][0] : 0;
    suspended = false; busy = false; lastTime = 0; accumulator = 0; trail = []; sparks = [];
    if (real(id)) getSave().games[id] = { ...state(), paused: true }; if (id === 'flow' && state().active !== null) getSave().games[id] = finishFlow(state());
    const click = e => { const button = e.target.closest('button'); if (!button || button.disabled) return; if (button.dataset.arcadeCell !== undefined) { if (id === 'flow' && e.detail && performance.now() < ignoreClickUntil) return; choose(Number(button.dataset.arcadeCell), e.shiftKey); } else if (button.dataset.arcade) action(button.dataset.arcade); };
    const change = e => { if (e.target.id === 'arcade-difficulty' || e.target.id === 'arcade-mode') { const value = e.target.value; e.target.value = state().difficulty ?? state().mode; onNew(id, value); } };
    const context = e => { const cell = e.target.closest('[data-arcade-cell]'); if (id === 'pipes' && cell) { e.preventDefault(); choose(Number(cell.dataset.arcadeCell), true); } };
    const focusin = e => { if (e.target.dataset.arcadeCell !== undefined) cursor = Number(e.target.dataset.arcadeCell); };
    const keyup = e => { if (['ArrowLeft', 'a', 'A'].includes(e.key)) pressed.delete('left'); if (['ArrowRight', 'd', 'D'].includes(e.key)) pressed.delete('right'); };
    const visibility = () => { if (document.hidden) pause(); else if (id === 'reversi') update(); }, active = () => { if (id === 'reversi' && !suspended) update(); };
    const unbind = bindGameKeyboard({ area: ['pipes', 'flow', 'reversi'].includes(id) ? '#' + id + '-board' : '#arcade-canvas,#arcade-overlay', focus, onKey: keydown, undo: !real(id), blocked: () => suspended || busy || document.getElementById('confirm-dialog').open, keys: e => e.key.startsWith('Arrow') || ['Enter', ' '].includes(e.key) || (id === 'flow' && e.key === 'Escape') || (id === 'snake' && /^[wasdp]$/i.test(e.key)) || (id === 'breakout' && /^[adp]$/i.test(e.key)) || (id === 'bubbles' && /^[adx]$/i.test(e.key)) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') });
    const cancel = () => { pointer = null; pressed.clear(); if (id === 'flow' && state().active !== null) set(undoFlow(state())); };
    for (const [event, handler] of [['click', click], ['change', change], ['contextmenu', context], ['pointerdown', pointerdown], ['pointermove', pointermove], ['pointerup', pointerup], ['pointercancel', cancel]]) { root.addEventListener(event, handler); const element = root; cleanup.push(() => element.removeEventListener(event, handler)); }
    root.addEventListener('focus', focusin, true); const element = root; cleanup.push(() => element.removeEventListener('focus', focusin, true));
    document.addEventListener('keyup', keyup, true); document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', pause); window.addEventListener('pagehide', pause); window.addEventListener('focus', active);
    cleanup.push(unbind, () => { document.removeEventListener('keyup', keyup, true); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', pause); window.removeEventListener('pagehide', pause); window.removeEventListener('focus', active); });
    update(); persist(); if (real(id)) raf = requestAnimationFrame(frame);
  }
  function dispose() { if (!root) return; pause(); stopShot(); raf = null; clearTimeout(aiTimer); aiTimer = null; cleanup.forEach(fn => fn()); cleanup = []; pressed.clear(); root = null; mounted = null; busy = false; projectile = null; }
  function suspend() { if (!root) return; pause(); suspended = true; if (mounted === 'bubbles') { stopShot(); update(); } }
  function resume() { suspended = false; if (root) { root.querySelector('[data-arcade="new"]').disabled = false; update(); } }
  return { render, mount, dispose, focus, suspend, resume, isMounted: () => mounted !== null };
}
