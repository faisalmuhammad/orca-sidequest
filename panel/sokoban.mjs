import { bindGameKeyboard } from './keyboard.mjs';
import { SOKOBAN_LEVELS, createSokoban, moveSokoban, undoSokoban, isSokobanComplete, sokobanDeadlocks, sokobanNeighbor } from './games/sokoban.mjs';
import { celebration } from './effects.mjs';
export { createSokoban };

export function sokobanCard(games, icon) {
  const s = games.sokoban, cleared = s?.records.filter(Boolean).length ?? 0;
  const status = cleared === SOKOBAN_LEVELS.length ? 'Done' : s?.moves || cleared ? 'Resume' : 'Play';
  const room = [0,0,0,0,0,0,1,1,3,0,0,4,2,1,0,0,1,1,1,0,0,0,0,0,0];
  return [{ id: 'sokoban', html: `<button class="game-card" data-game="sokoban" aria-label="${status === 'Done' ? 'Open' : status} Sokoban"><div class="card-preview preview-sokoban" aria-hidden="true"><span class="card-kicker">/ MAKE ROOM TO THINK</span><div class="mini-sokoban">${room.map(n => `<span class="${n === 0 ? 'wall' : 'floor'}">${n === 2 ? '<i class="mini-crate"></i>' : n === 3 ? '<i class="mini-goal"></i>' : n === 4 ? '<i class="mini-pusher"></i>' : ''}</span>`).join('')}</div><span class="art-spark spark-one">✦</span></div><div class="card-info"><div class="card-title-line"><span class="card-title">Sokoban</span><span class="card-arrow">${icon('arrow')}</span></div><p class="card-description">Make room. Deliver every crate.</p><div class="card-meta"><span>${s ? `${cleared}/20 levels · Level ${s.level + 1}` : '20 handcrafted levels'}</span><span class="card-state">${status}${icon('play')}</span></div></div></button>` }];
}

export function createSokobanPanel({ getSave, persist, sound, icon, announce, onNew }) {
  let root = null, moving = false, suspended = false, token = 0, animations = [], queue = [], touch = null, unbindKeyboard = null;
  const state = () => getSave().games.sokoban;
  const button = (action, label, symbol, attrs = '') => `<button type="button" class="button" data-soko="${action}" ${attrs}>${symbol ? icon(symbol) : ''}${label}</button>`;
  function render() {
    return `<section id="sokoban-game" class="quick-game sokoban-game" aria-label="Sokoban game"><div class="game-heading"><div><h1>Sokoban</h1><p class="subtitle">Make room. Deliver every crate.</p></div>${button('restart', 'Restart', 'refresh')}</div><div class="sokoban-level-nav">${button('previous', '', 'back', 'id="soko-previous" aria-label="Previous level"')}<select id="sokoban-level" aria-label="Sokoban level"></select>${button('next', '', 'arrow', 'id="soko-next" aria-label="Next level"')}</div><div class="stats soko-stats"><div class="stat"><span class="stat-label">MOVES</span><span class="stat-value" id="soko-moves"></span></div><div class="stat stat-best"><span class="stat-label">PUSHES</span><span class="stat-value" id="soko-pushes"></span></div><div class="stat soko-goals"><span class="stat-label">ON TARGET</span><span class="stat-value" id="soko-goals"></span></div></div><div class="board-wrap"><div id="sokoban-board" class="sokoban-board" role="group" tabindex="0" aria-label="Sokoban board. Use arrow keys or W A S D to move and push crates."></div><div class="board-overlay" id="soko-overlay" hidden></div></div><div class="game-tools">${button('undo', 'Undo', 'undo', 'id="soko-undo"')}<span id="soko-progress" class="move-count"></span></div><div class="direction-controls" aria-label="Move the player">${['left','up','down','right'].map(direction => button(direction, '', direction, `aria-label="Move ${direction}"`)).join('')}</div><p id="soko-feedback" class="quick-feedback" role="status"></p><p id="soko-best" class="quick-best"></p><p class="instructions">Push every crate onto a glowing target.<br>Crates move one at a time; leave room to get behind them.<br><kbd>↑ ↓ ← →</kbd> / <kbd>W A S D</kbd> move · <kbd>⌘ / Ctrl Z</kbd> undo<br>Swipe or use the buttons to move.</p></section>`;
  }
  function update() {
    if (!root) return;
    const s = state(), map = SOKOBAN_LEVELS[s.level], done = isSokobanComplete(s), dead = sokobanDeadlocks(s);
    const board = root.querySelector('#sokoban-board');
    board.setAttribute('aria-busy', 'false'); board.style.setProperty('--soko-columns', map.width); board.style.setProperty('--soko-rows', map.height);
    board.innerHTML = `<div class="soko-ground">${map.floor.map((floor, index) => {
      const goal = map.goals.includes(index), crate = s.crates.includes(index);
      const label = `Row ${Math.floor(index / map.width) + 1}, column ${index % map.width + 1}: ${!floor ? 'wall' : index === s.player ? 'player' : crate ? 'crate' : goal ? 'target' : 'floor'}${goal && (crate || index === s.player) ? ', on target' : ''}`;
      return `<span class="soko-cell ${floor ? 'soko-floor' : 'soko-wall'}${goal ? ' soko-target' : ''}" data-soko-index="${index}" role="img" aria-label="${label}">${goal ? '<i class="target-ring"></i>' : ''}</span>`;
    }).join('')}<div class="soko-actors" aria-hidden="true">${s.crates.map(index => `<span class="soko-crate${map.goals.includes(index) ? ' on-target' : ''}${dead.includes(index) ? ' stuck' : ''}" data-crate="${index}" style="grid-row:${Math.floor(index / map.width) + 1};grid-column:${index % map.width + 1}"><i></i>${map.goals.includes(index) ? icon('check') : ''}</span>`).join('')}<span class="soko-player" style="grid-row:${Math.floor(s.player / map.width) + 1};grid-column:${s.player % map.width + 1}"><i class="soko-face"><b></b><b></b></i><i class="soko-step"></i></span></div></div>`;
    root.querySelector('#soko-moves').textContent = s.moves; root.querySelector('#soko-pushes').textContent = s.pushes;
    root.querySelector('#soko-goals').textContent = s.crates.filter(index => map.goals.includes(index)).length + '/' + map.goals.length;
    root.querySelector('#soko-undo').disabled = !s.history.length;
    root.querySelector('#soko-progress').textContent = s.records.filter(Boolean).length + '/20 levels solved';
    root.querySelector('#soko-previous').disabled = s.level === 0; root.querySelector('#soko-next').disabled = s.level >= s.unlocked;
    root.querySelector('#sokoban-level').innerHTML = SOKOBAN_LEVELS.map((level, index) => `<option value="${index}" ${index === s.level ? 'selected' : ''} ${index > s.unlocked ? 'disabled' : ''}>${String(index + 1).padStart(2, '0')} · ${level.name}${s.records[index] ? ' ✓' : ''}</option>`).join('');
    const best = s.records[s.level];
    root.querySelector('#soko-best').textContent = best ? `Level best · ${best.pushes} ${best.pushes === 1 ? 'push' : 'pushes'} · ${best.moves} ${best.moves === 1 ? 'move' : 'moves'}` : 'Solve this level to set your first record.';
    root.querySelector('#soko-feedback').textContent = done ? 'Every crate delivered.' : dead.length ? 'A crate cannot reach a target from here. Undo to try another path.' : 'You can push a crate, but you cannot pull it back.';
    root.querySelector('#soko-feedback').dataset.tone = dead.length ? 'error' : '';
    const overlay = root.querySelector('#soko-overlay'); overlay.hidden = !done; board.inert = done;
    if (done) overlay.innerHTML = `${celebration()}<span class="overlay-icon">${icon('spark')}</span><span class="eyebrow">${s.records.every(Boolean) ? 'ALL 20 LEVELS CLEAR' : 'LEVEL ' + (s.level + 1) + ' COMPLETE'}</span><h2>${s.level === 19 ? 'Every delivery made.' : 'Everything delivered.'}</h2><p>${s.pushes} ${s.pushes === 1 ? 'push' : 'pushes'} · ${s.moves} ${s.moves === 1 ? 'move' : 'moves'}</p>${s.level < 19 ? button('next', 'Next level', 'arrow') : button('first', 'Replay levels', 'play')}${button('restart', 'Replay this level', 'refresh')}`;
  }
  function cancel() { token++; moving = false; animations.forEach(animation => animation.cancel()); animations = []; queue = []; touch = null; }
  function focus() { if (!root) return; const overlay = root.querySelector('#soko-overlay'); (overlay.hidden ? root.querySelector('#sokoban-board') : overlay.querySelector('button'))?.focus({ preventScroll: true }); }
  async function move(direction) {
    if (!root || suspended) return;
    if (moving) { if (queue.length < 2) queue.push(direction); return; }
    const before = state(), next = moveSokoban(before, direction);
    if (next === before) { if (!isSokobanComplete(before)) announce('That direction is blocked.'); return; }
    const map = SOKOBAN_LEVELS[before.level], board = root.querySelector('#sokoban-board'), current = ++token;
    const source = board.querySelector(`[data-soko-index="${before.player}"]`).getBoundingClientRect();
    const destination = board.querySelector(`[data-soko-index="${next.player}"]`).getBoundingClientRect();
    const dx = destination.x - source.x, dy = destination.y - source.y, pushing = next.pushes > before.pushes;
    getSave().games.sokoban = next; persist(); moving = true; board.setAttribute('aria-busy', 'true');
    root.querySelector('#soko-moves').textContent = next.moves; root.querySelector('#soko-pushes').textContent = next.pushes;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const player = board.querySelector('.soko-player');
      animations = [player.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px)` }], { duration: pushing ? 170 : 130, easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'forwards' })];
      if (pushing) { const crate = board.querySelector(`[data-crate="${next.player}"]`); animations.push(crate.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px)` }], { duration: 170, easing: 'cubic-bezier(.2,.7,.25,1)', fill: 'forwards' })); }
      await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
    }
    if (current !== token || !root) return;
    moving = false; animations = []; update();
    const done = isSokobanComplete(next), reached = next.crates.filter(index => map.goals.includes(index)).length > before.crates.filter(index => map.goals.includes(index)).length;
    void sound.play(done ? 'win' : reached ? 'complete' : pushing ? 'merge' : 'tick');
    announce(done ? `Sokoban level ${next.level + 1} complete. ${next.pushes} pushes, ${next.moves} moves.` : sokobanDeadlocks(next).length ? 'A crate cannot reach a target. Undo to try another path.' : `${pushing ? 'Crate pushed.' : 'Player moved.'} ${next.moves} moves.`);
    focus();
    if (!done && queue.length) void move(queue.shift()); else queue = [];
  }
  function undo() {
    cancel(); const next = undoSokoban(state()); if (next === state()) return;
    getSave().games.sokoban = next; persist(); update(); focus(); announce('Last Sokoban move undone.');
  }
  function click(event) {
    const target = event.target.closest('button'); if (!target || target.disabled || suspended) return;
    const action = target.dataset.soko;
    if (['up','right','down','left'].includes(action)) void move(action);
    else if (action === 'undo') undo();
    else if (action === 'restart') onNew('sokoban');
    else if (action === 'previous') onNew('sokoban', state().level - 1);
    else if (action === 'next' && state().level < state().unlocked) onNew('sokoban', state().level + 1);
    else if (action === 'first') onNew('sokoban', 0);
  }
  function keydown(event, target = event.target) {
    if (suspended || event.altKey || target.closest('select') || document.getElementById('confirm-dialog').open) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); return; }
    if (event.ctrlKey || event.metaKey || !target.closest('#sokoban-board')) return;
    const direction = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left', w: 'up', d: 'right', s: 'down', a: 'left' }[event.key] ?? { w: 'up', d: 'right', s: 'down', a: 'left' }[event.key.toLowerCase()];
    if (direction) { event.preventDefault(); void move(direction); }
    else if (event.key.toLowerCase() === 'r' && !event.repeat) { event.preventDefault(); onNew('sokoban'); }
  }
  function change(event) { if (event.target.id === 'sokoban-level') { const level = Number(event.target.value); event.target.value = String(state().level); onNew('sokoban', level); } }
  function pointerdown(event) {
    const board = event.target.closest('#sokoban-board'); if (!board || !event.isPrimary || event.button !== 0 || suspended) return;
    touch = { id: event.pointerId, x: event.clientX, y: event.clientY, index: Number(event.target.closest('[data-soko-index]')?.dataset.sokoIndex ?? -1) };
    board.setPointerCapture(event.pointerId); board.focus({ preventScroll: true });
  }
  function pointerup(event) {
    if (!touch || touch.id !== event.pointerId) return;
    const start = touch; touch = null; const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= 22) void move(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
    else if (start.index >= 0) { const map = SOKOBAN_LEVELS[state().level], direction = ['up','right','down','left'].find(value => sokobanNeighbor(map, state().player, value) === start.index); if (direction) void move(direction); }
  }
  const pointercancel = () => { touch = null; };
  function mount() {
    root = document.getElementById('sokoban-game'); suspended = false;
    unbindKeyboard = bindGameKeyboard({ area: '#sokoban-board', focus, onKey: keydown, undo: true, blocked: () => suspended || document.getElementById('confirm-dialog').open, keys: e => e.key.startsWith('Arrow') || /^[wasdr]$/i.test(e.key) || ['Enter', ' '].includes(e.key) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') });
    root.addEventListener('click', click); root.addEventListener('change', change);
    root.addEventListener('pointerdown', pointerdown); root.addEventListener('pointerup', pointerup); root.addEventListener('pointercancel', pointercancel); update();
  }
  function dispose() {
    cancel(); if (!root) return;
    root.removeEventListener('click', click); unbindKeyboard?.(); unbindKeyboard = null; root.removeEventListener('change', change);
    root.removeEventListener('pointerdown', pointerdown); root.removeEventListener('pointerup', pointerup); root.removeEventListener('pointercancel', pointercancel); root = null;
  }
  function suspend() { if (!root) return; suspended = true; cancel(); update(); }
  function resume() { suspended = false; }
  return { render, mount, dispose, focus, suspend, resume, isMounted: () => root !== null };
}
