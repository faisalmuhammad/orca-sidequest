import { bindGameKeyboard } from './keyboard.mjs';
import {
  createCheckers,
  checkersMoves,
  moveCheckers,
  undoCheckers,
  chooseCheckersMove,
} from './games/checkers.mjs';
import {
  createBlocks,
  BLOCK_TYPES,
  blockCells,
  ghostBlock,
  translateBlock,
  rotateBlock,
  hardDropBlock,
  holdBlock,
  tickBlock,
} from './games/blocks.mjs';
import { createMemory, flipMemory } from './games/memory.mjs';
import { QUICK_NAMES, QUICK_CREATORS, quickCards, createQuickGames } from './quick-games.mjs';
import { MORE_NAMES, MORE_CREATORS, moreCards, createMoreGames } from './more-games.mjs';
import { ARCADE_NAMES, arcadeCards } from './arcade-cards.mjs';
import { ARCADE_CREATORS, createArcadeGames } from './arcade-games.mjs';
import { createSokoban, sokobanCard, createSokobanPanel } from './sokoban.mjs';
export const EXTRA_NAMES = {
  checkers: 'Checkers',
  blocks: 'Falling Blocks',
  memory: 'Memory',
  ...QUICK_NAMES,
  ...MORE_NAMES,
  sokoban: 'Sokoban',
  ...ARCADE_NAMES,
};
export const EXTRA_CREATORS = {
  checkers: () => createCheckers(),
  blocks: (old) => createBlocks(old?.best ?? 0),
  memory: (old) => createMemory(old?.best ?? null),
  ...QUICK_CREATORS,
  ...MORE_CREATORS,
  sokoban: createSokoban,
  ...ARCADE_CREATORS,
};
export function extraCards(games, icon) {
  const own = Object.entries(EXTRA_NAMES)
    .filter(([id]) => id !== 'sokoban' && !Object.hasOwn(ARCADE_NAMES, id) && !Object.hasOwn(QUICK_NAMES, id) && !Object.hasOwn(MORE_NAMES, id))
    .map(([id, name]) => {
      const state = games[id],
        meta =
          id === 'checkers'
            ? state
              ? state.result
                ? 'Round complete'
                : state.moves + ' turns'
              : 'Play the computer or a friend'
            : id === 'blocks'
              ? state
                ? 'Best ' + state.best.toLocaleString()
                : 'Make room. Keep the stack moving.'
              : state
                ? state.attempts +
                  ' guesses · ' +
                  state.matched.length / 2 +
                  '/8 pairs'
                : 'Study the cards. Find their pairs.';
      const art =
        id === 'checkers'
          ? '<div class="mini-checkers">' +
            Array.from(
              { length: 16 },
              (_, n) =>
                '<span>' +
                ([1, 3, 12, 14].includes(n)
                  ? '<i class="' + (n < 8 ? 'ink' : 'coral') + '"></i>'
                  : '') +
                '</span>',
            ).join('') +
            '</div>'
          : id === 'blocks'
            ? '<div class="mini-stack">' +
              [
                0, 0, 3, 0, 0, 0, 0, 3, 3, 3, 0, 0, 2, 2, 0, 0, 4, 4, 2, 2, 0,
                4, 4, 0,
              ]
                .map((n) => '<i data-block="' + n + '"></i>')
                .join('') +
              '</div>'
            : '<div class="mini-memory"><span>' +
              icon('spark') +
              '</span><span>' +
              icon('game') +
              '</span><span>' +
              icon('spark') +
              '</span></div>';
      return {
        id,
        html:
        '<button class="game-card" data-game="' +
        id +
        '" aria-label="' +
        (state ? 'Resume ' : 'Play ') +
        name +
        '"><div class="card-preview preview-' +
        id +
        '" aria-hidden="true"><span class="card-kicker">/ ' +
        {
          checkers: 'THINK A MOVE AHEAD',
          blocks: 'FIND YOUR RHYTHM',
          memory: 'A MOMENT TO REMEMBER',
        }[id] +
        '</span><div class="art-orbit orbit-one"></div>' +
        art +
        '<span class="art-spark spark-one">✦</span></div><div class="card-info"><div class="card-title-line"><span class="card-title">' +
        name +
        '</span><span class="card-arrow">' +
        icon('arrow') +
        '</span></div><p class="card-description">' +
        {
          checkers: 'A small board. A new strategy.',
          blocks: 'Fit the pieces. Clear the lines.',
          memory: 'A familiar face, twice.',
        }[id] +
        '</p><div class="card-meta"><span>' +
        meta +
        '</span><span class="card-state">' +
        (state ? 'Resume' : 'Play') +
        icon('play') +
        '</span></div></div></button>'
      };
    });
  return [...own, ...quickCards(games, icon), ...moreCards(games, icon), ...sokobanCard(games, icon), ...arcadeCards(games, icon)];
}
export function createExtraGames({
  getSave,
  persist,
  sound,
  icon,
  announce,
  onNew,
}) {
  const arcade = createArcadeGames({ getSave, persist, sound, icon, announce, onNew });
  const quick = createQuickGames({ getSave, persist, sound, icon, announce, onNew });
  const more = createMoreGames({ getSave, persist, sound, icon, announce, onNew });
  const sokoban = createSokobanPanel({ getSave, persist, sound, icon, announce, onNew });
  let mounted = null,
    root = null,
    selected = -1,
    checkerFocus = 40,
    memoryFocus = 0,
    aiTimer = null,
    memoryTimer = null,
    studyTimer = null,
    gravityTimer = null,
    cleanup = [];
  let checkerMotion = 0,
    checkerAnimations = [],
    checkerMoving = false;
  let suspended = false;
  const btn = (action, label, symbol = '', attrs = '') =>
    '<button type="button" class="button" data-extra="' +
    action +
    '" ' +
    attrs +
    '>' +
    (symbol ? icon(symbol) : '') +
    label +
    '</button>';
  const state = () => getSave().games[mounted];
  function set(next) {
    if (next === state()) return false;
    getSave().games[mounted] = next;
    persist();
    update();
    return true;
  }
  function heading(id, subtitle) {
    return (
      '<div class="game-heading"><div><h1>' +
      EXTRA_NAMES[id] +
      '</h1><p class="subtitle">' +
      subtitle +
      '</p></div>' +
      btn('new', 'New', 'plus') +
      '</div>'
    );
  }
  function render(id) {
    if (Object.hasOwn(ARCADE_NAMES, id)) return arcade.render(id);
    if (id === 'sokoban') return sokoban.render();
    if (Object.hasOwn(MORE_NAMES, id)) return more.render(id);
    if (Object.hasOwn(QUICK_NAMES, id)) return quick.render(id);
    if (id === 'checkers')
      return (
        '<section id="extra-game" aria-label="Checkers game">' +
        heading(id, 'Think ahead. Make your move.') +
        '<div class="checkers-topline"><select id="checkers-mode" aria-label="Checkers opponent"><option value="computer">Vs computer</option><option value="local">Two players</option></select><span id="checkers-turn"></span></div><div class="board-wrap"><div id="checkers-board" class="checkers-board" role="group" aria-label="Checkers board. Arrow keys select. Enter chooses a piece or destination."></div><div class="board-overlay" id="extra-overlay" hidden></div></div><div class="game-tools">' +
        btn('undo', 'Undo', 'undo', 'id="checkers-undo"') +
        '<span id="checkers-count" class="move-count"></span></div><p class="instructions">Ringed pieces can move. Choose one, then a highlighted square.<br>Captures are required. Keep jumping when you can.<br><kbd>Arrows</kbd> navigate · <kbd>Enter / Space</kbd> choose</p></section>'
      );
    if (id === 'blocks')
      return (
        '<section id="extra-game" aria-label="Falling Blocks game">' +
        heading(id, 'Find the fit. Clear the line.') +
        '<div class="stats"><div class="stat"><span class="stat-label">SCORE</span><span class="stat-value" id="blocks-score"></span></div><div class="stat stat-best"><span class="stat-label">PERSONAL BEST</span><span class="stat-value" id="blocks-best"></span></div></div><div class="blocks-layout"><div class="board-wrap"><div id="blocks-board" class="blocks-board" role="group" tabindex="0" aria-label="Falling Blocks board. Arrow keys move, up rotates, space drops, C holds."></div><div class="board-overlay" id="extra-overlay" hidden></div></div><aside class="blocks-side"><span class="eyebrow">UP NEXT</span><div id="blocks-next"></div><span class="eyebrow">HOLD · C</span><button id="blocks-hold" data-extra="hold" aria-label="Hold piece" class="hold-preview"></button><div class="blocks-level"><span>LEVEL</span><strong id="blocks-level"></strong></div><div class="blocks-level"><span>LINES</span><strong id="blocks-lines"></strong></div>' +
        btn('pause', '', 'pause', 'id="blocks-pause" aria-label="Pause game"') +
        '</aside></div><div class="blocks-controls">' +
        btn('left', '', 'left', 'aria-label="Move piece left"') +
        btn('rotate', '', 'refresh', 'aria-label="Rotate piece"') +
        btn('right', '', 'right', 'aria-label="Move piece right"') +
        btn('soft', '', 'down', 'aria-label="Move piece down"') +
        btn('drop', 'Drop', 'down', 'aria-label="Drop piece"') +
        '</div><p class="instructions"><kbd>← →</kbd> move · <kbd>↑ / X / Z</kbd> rotate<br><kbd>Space</kbd> drop · <kbd>C</kbd> hold · <kbd>P</kbd> pause</p><p id="blocks-feedback" class="feedback"></p></section>'
      );
    return (
      '<section id="extra-game" aria-label="Memory game">' +
      heading(id, 'Study the cards. Remember the pairs.') +
      '<div class="stats"><div class="stat"><span class="stat-label">GUESSES</span><span class="stat-value" id="memory-guesses"></span></div><div class="stat stat-best"><span class="stat-label">PAIRS FOUND</span><span class="stat-value" id="memory-pairs"></span></div></div><div class="board-wrap"><div class="memory-board" id="memory-board" role="group" aria-label="Memory cards"></div><div class="board-overlay" id="extra-overlay" hidden></div></div><div class="memory-caption" id="memory-caption" role="status"></div><p class="instructions">Remember the symbols, then find matching pairs.<br>Choose two cards each turn.<br><kbd>Arrows</kbd> navigate · <kbd>Enter / Space</kbd> flip</p></section>'
    );
  }
  function overlay(html) {
    const node = root.querySelector('#extra-overlay');
    node.hidden = !html;
    if (html) node.innerHTML = html;
  }
  function updateCheckers() {
    root.querySelector('#checkers-board').setAttribute('aria-busy', 'false');
    const s = state(),
      moves = checkersMoves(s),
      thinking = s.mode === 'computer' && s.turn === -1 && !s.result;
    if (thinking || s.result) selected = -1;
    else if (s.forced !== null) selected = s.forced;
    const targets = thinking ? [] : moves.filter((m) => m.from === selected).map((m) => m.to),
      sources = new Set(thinking ? [] : moves.map((m) => m.from)),
      mustCapture = moves.some((m) => m.capture !== null);
    const focused = root
        .querySelector('#checkers-board')
        .contains(document.activeElement),
      focusIndex = document.activeElement.dataset.square;
    root.querySelector('#checkers-board').innerHTML = s.board
      .map(
        (p, i) =>
          '<button class="checker-square ' +
          ((Math.floor(i / 8) + (i % 8)) % 2 ? 'dark-square' : 'light-square') +
          (selected === i ? ' selected' : '') +
          (sources.has(i) ? ' movable' + (mustCapture ? ' capture-ready' : '') : '') +
          (targets.includes(i) ? ' legal' : '') +
          '" data-square="' +
          i +
          '" aria-label="Row ' +
          (Math.floor(i / 8) + 1) +
          ', column ' +
          ((i % 8) + 1) +
          ': ' +
          (p
            ? (p > 0 ? 'coral' : 'ink') +
              ' ' +
              (Math.abs(p) === 2 ? 'king' : 'piece') +
              (sources.has(i) ? ', can move' : '')
            : targets.includes(i)
              ? 'legal destination'
              : 'empty') +
          '" tabindex="' +
          (i === (focused ? Number(focusIndex) : checkerFocus) ? 0 : -1) +
          '">' +
          (p
            ? '<span class="checker-piece ' +
              (p > 0 ? 'coral' : 'ink') +
              (Math.abs(p) === 2 ? ' king' : '') +
              '">' +
              (Math.abs(p) === 2 ? icon('crown') : '<i></i>') +
              '</span>'
            : targets.includes(i)
              ? '<i class="legal-dot"></i>'
              : '') +
          '</button>',
      )
      .join('');
    if (focused)
      root
        .querySelector('[data-square="' + (focusIndex ?? selected) + '"]')
        ?.focus({ preventScroll: true });
    root.querySelector('#checkers-mode').value = s.mode;
    root.querySelector('#checkers-turn').textContent = s.result
      ? 'Round complete'
      : thinking
        ? 'Thinking…'
        : s.forced !== null
          ? 'Keep jumping'
          : (s.turn === 1 ? 'Coral' : 'Ink') + ' to move' + (mustCapture ? ' · Capture required' : '');
    root.querySelector('#checkers-undo').disabled = !s.history.length;
    root.querySelector('#checkers-count').textContent =
      s.board.filter((p) => p > 0).length +
      ' coral · ' +
      s.board.filter((p) => p < 0).length +
      ' ink';
    overlay(
      s.result
        ? '<span class="overlay-icon">' +
            icon('game') +
            '</span><h2>' +
            (s.result === 'draw'
              ? 'A balanced game.'
              : s.mode === 'computer'
                ? s.result === 1
                  ? 'You won!'
                  : 'Computer wins.'
                : (s.result === 1 ? 'Coral' : 'Ink') + ' wins!') +
            '</h2><p>' +
            s.moves +
            ' turns played.</p>' +
            btn('new', 'Play again', 'play')
        : '',
    );
    if (thinking && !aiTimer && !suspended)
      aiTimer = setTimeout(() => {
        aiTimer = null;
        if (mounted !== 'checkers') return;
        const m = chooseCheckersMove(state());
        if (m) void playChecker(m.from, m.to);
      }, 280);
  }
  function cancelCheckersMotion() {
    checkerMotion++;
    checkerMoving = false;
    checkerAnimations.forEach((a) => a.cancel());
    checkerAnimations = [];
  }
  async function playChecker(from, to) {
    if (checkerMoving) return;
    const before = state(),
      move = checkersMoves(before).find((m) => m.from === from && m.to === to);
    if (!move) return;
    const next = moveCheckers(before, from, to),
      token = ++checkerMotion;
    const source = root.querySelector('[data-square="' + from + '"]'),
      destination = root.querySelector('[data-square="' + to + '"]'),
      piece = source?.querySelector('.checker-piece');
    getSave().games.checkers = next;
    persist();
    checkerMoving = true;
    root.querySelector('#checkers-turn').textContent = 'Moving…';
    root.querySelector('#checkers-board').setAttribute('aria-busy', 'true');
    void sound.play(
      next.result ? 'win' : move.capture !== null ? 'merge' : 'tick',
    );
    if (
      piece &&
      destination &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const start = source.getBoundingClientRect(),
        end = destination.getBoundingClientRect();
      source.style.zIndex = '4';
      checkerAnimations = [
        piece.animate(
          [
            { transform: 'translate(0,0) scale(1)' },
            {
              transform:
                'translate(' +
                (end.x - start.x) * 0.5 +
                'px,' +
                (end.y - start.y) * 0.5 +
                'px) scale(1.12)',
              offset: 0.5,
            },
            {
              transform:
                'translate(' +
                (end.x - start.x) +
                'px,' +
                (end.y - start.y) +
                'px) scale(1)',
            },
          ],
          {
            duration: 230,
            easing: 'cubic-bezier(.22,.7,.25,1)',
            fill: 'forwards',
          },
        ),
      ];
      if (move.capture !== null) {
        const captured = root.querySelector(
          '[data-square="' + move.capture + '"] .checker-piece',
        );
        if (captured)
          checkerAnimations.push(
            captured.animate(
              [
                { opacity: 1, transform: 'scale(1)' },
                { opacity: 0, transform: 'scale(.5)' },
              ],
              {
                duration: 190,
                delay: 75,
                easing: 'ease-out',
                fill: 'forwards',
              },
            ),
          );
      }
      await Promise.all(
        checkerAnimations.map((a) => a.finished.catch(() => {})),
      );
    }
    if (token !== checkerMotion || mounted !== 'checkers') return;
    checkerMoving = false;
    checkerAnimations = [];
    selected = next.forced ?? -1;
    update();
    if (Math.abs(before.board[from]) === 1 && Math.abs(next.board[to]) === 2)
      root
        .querySelector('[data-square="' + to + '"] .checker-piece')
        ?.classList.add('crowned');
    announce(
      next.forced !== null
        ? 'Keep jumping.'
        : next.result
          ? 'Round complete.'
          : (next.turn === 1 ? 'Coral' : 'Ink') + ' to move.',
    );
  }
  function miniature(type) {
    if (!type) return '<span class="empty-hold">—</span>';
    const cells = blockCells({ type, x: 0, y: 0, rotation: 0 });
    return (
      '<span class="piece-mini">' +
      Array.from(
        { length: 16 },
        (_, i) =>
          '<i data-block="' +
          (cells.some(([x, y]) => x === i % 4 && y === Math.floor(i / 4))
            ? BLOCK_TYPES.indexOf(type) + 1
            : 0) +
          '"></i>',
      ).join('') +
      '</span>'
    );
  }
  function updateBlocks() {
    const s = state(),
      board = root.querySelector('#blocks-board');
    const active = new Map(
      blockCells(s.active)
        .filter(([, y]) => y >= 0)
        .map(([x, y]) => [y * 10 + x, BLOCK_TYPES.indexOf(s.active.type) + 1]),
    );
    const ghost = new Set(
      blockCells(ghostBlock(s))
        .filter(([, y]) => y >= 0)
        .map(([x, y]) => y * 10 + x),
    );
    board.innerHTML = s.board
      .map(
        (v, i) =>
          '<i class="block-cell' +
          (!v && ghost.has(i) && !active.has(i) ? ' ghost' : '') +
          '" data-block="' +
          (active.get(i) ?? v) +
          '"></i>',
      )
      .join('');
    root.querySelector('#blocks-score').textContent = s.score.toLocaleString();
    root.querySelector('#blocks-best').textContent = s.best.toLocaleString();
    root.querySelector('#blocks-lines').textContent = s.lines;
    root.querySelector('#blocks-level').textContent =
      Math.floor(s.lines / 10) + 1;
    root.querySelector('#blocks-next').innerHTML = s.queue
      .slice(0, 3)
      .map(miniature)
      .join('');
    root.querySelector('#blocks-hold').innerHTML = miniature(s.hold);
    root.querySelector('#blocks-hold').disabled =
      s.holdUsed || s.paused || s.over;
    const pause = root.querySelector('#blocks-pause');
    pause.innerHTML = icon(s.paused ? 'play' : 'pause');
    pause.setAttribute('aria-label', s.paused ? 'Resume game' : 'Pause game');
    pause.disabled = s.over;
    overlay(
      s.over
        ? '<span class="overlay-icon">' +
            icon('game') +
            '</span><h2>Nice run.</h2><p>' +
            s.score.toLocaleString() +
            ' points<br>' +
            s.lines +
            ' lines cleared</p>' +
            btn('new', 'Play again', 'play')
        : s.paused
          ? '<span class="overlay-icon">' +
            icon('game') +
            '</span><h2>' +
            (s.pieces ? 'Take a breath.' : 'Ready to stack?') +
            '</h2><p>The ghost shows where your piece will land.</p>' +
            btn('resume', s.pieces ? 'Resume' : 'Start', 'play')
          : '',
    );
    board.inert = s.paused || s.over;
  }
  const symbols = [
    'spark',
    'target',
    'game',
    'star',
    'hint',
    'leaf',
    'moon',
    'bolt',
  ];
  function updateMemory() {
    const s = state(),
      focused = root
        .querySelector('#memory-board')
        .contains(document.activeElement),
      index = document.activeElement.dataset.card;
    root.querySelector('#memory-board').innerHTML = s.cards
      .map((v, i) => {
        const matched = s.matched.includes(i),
          visible = s.phase === 'study' || matched || s.open.includes(i);
        return (
          '<button class="memory-card ' +
          (visible ? ' revealed' : '') +
          (matched ? ' matched' : '') +
          '" data-card="' +
          i +
          '" ' +
          (matched || s.phase !== 'play' ? 'disabled' : '') +
          ' aria-label="Card ' +
          (i + 1) +
          ': ' +
          (visible ? symbols[v] : 'face down') +
          '"><span class="card-back">' +
          icon('game') +
          '</span><span class="card-face" data-symbol="' +
          v +
          '">' +
          icon(symbols[v]) +
          '</span></button>'
        );
      })
      .join('');
    if (focused && index !== undefined)
      root
        .querySelector('[data-card="' + index + '"]')
        ?.focus({ preventScroll: true });
    root.querySelector('#memory-guesses').textContent = s.attempts;
    root.querySelector('#memory-pairs').textContent =
      s.matched.length / 2 + ' / 8';
    root.querySelector('#memory-caption').textContent =
      s.phase === 'study'
        ? 'Take a good look…'
        : s.phase === 'play'
          ? s.open.length === 1
            ? 'Where is its match?'
            : s.open.length === 2
              ? 'Keep those two in mind.'
              : 'Choose a card.'
          : 'Personal best: ' + (s.best ?? '—') + ' guesses';
    overlay(
      s.phase === 'ready'
        ? '<span class="overlay-icon">' +
            icon('game') +
            '</span><h2>A moment to remember.</h2><p>You’ll have three seconds to study the cards.</p>' +
            btn('study', 'Start', 'play')
        : s.phase === 'complete'
          ? '<span class="overlay-icon">' +
            icon('spark') +
            '</span><h2>All paired up!</h2><p>' +
            s.attempts +
            ' guesses · ' +
            Math.round((8 / s.attempts) * 100) +
            '% accuracy</p>' +
            btn('new', 'Play again', 'play')
          : '',
    );
    if (s.open.length === 2 && !memoryTimer)
      memoryTimer = setTimeout(() => {
        memoryTimer = null;
        if (mounted === 'memory') set({ ...state(), open: [] });
      }, 850);
  }
  function update() {
    if (!root) return;
    if (mounted === 'checkers') updateCheckers();
    else if (mounted === 'blocks') updateBlocks();
    else updateMemory();
  }
  function blockAction(action) {
    const before = state();
    let next = before;
    if (action === 'pause' || action === 'resume')
      next = {
        ...before,
        paused: action === 'resume' ? false : !before.paused,
      };
    else if (action === 'left' || action === 'right')
      next = translateBlock(before, action === 'left' ? -1 : 1, 0);
    else if (action === 'rotate' || action === 'rotate-back')
      next = rotateBlock(before, action === 'rotate' ? 1 : -1);
    else if (action === 'drop') next = hardDropBlock(before);
    else if (action === 'hold') next = holdBlock(before);
    else if (action === 'soft') {
      next = tickBlock(before);
      if (next !== before && next.pieces === before.pieces)
        next = {
          ...next,
          score: next.score + 1,
          best: Math.max(next.best, next.score + 1),
        };
    }
    if (set(next)) {
      if (next.lines > before.lines) {
        void sound.play('complete');
        announce(next.lines - before.lines + ' lines cleared.');
        root.querySelector('#blocks-feedback').textContent =
          '+' +
          (next.score - before.score) +
          ' · ' +
          (next.lines - before.lines) +
          ' lines cleared';
      } else if (action === 'drop') void sound.play('merge');
    }
    if (
      action === 'pause' ||
      action === 'resume' ||
      action === 'drop' ||
      action === 'soft'
    )
      gravityReset();
    if (!state().paused) focus();
  }
  function gravityReset() {
    clearTimeout(gravityTimer);
    gravityTimer = null;
    if (mounted !== 'blocks' || state().paused || state().over) return;
    gravityTimer = setTimeout(
      () => {
        gravityTimer = null;
        if (mounted === 'blocks') {
          set(tickBlock(state()));
          gravityReset();
        }
      },
      Math.max(90, 800 * Math.pow(0.8, Math.floor(state().lines / 10))),
    );
  }
  function chooseSquare(i) {
    checkerFocus = i;
    const s = state();
    if (checkerMoving || s.result || (s.mode === 'computer' && s.turn === -1))
      return;
    const legal = checkersMoves(s);
    if (legal.some((m) => m.from === selected && m.to === i)) {
      void playChecker(selected, i);
    } else if (legal.some((m) => m.from === i)) {
      selected = i;
      update();
    }
    root
      .querySelector('[data-square="' + i + '"]')
      ?.focus({ preventScroll: true });
  }
  function click(e) {
    const target = e.target.closest('button');
    if (!target || target.disabled) return;
    if (target.dataset.square !== undefined) {
      chooseSquare(Number(target.dataset.square));
      return;
    }
    if (target.dataset.card !== undefined) {
      memoryFocus = Number(target.dataset.card);
      const before = state();
      if (set(flipMemory(before, Number(target.dataset.card))))
        void sound.play(
          state().phase === 'complete'
            ? 'win'
            : state().matched.length > before.matched.length
              ? 'complete'
              : 'tick',
        );
      return;
    }
    const action = target.dataset.extra;
    if (!action) return;
    if (action === 'new') onNew(mounted);
    else if (action === 'undo') {
      clearTimeout(aiTimer);
      aiTimer = null;
      cancelCheckersMotion();
      selected = -1;
      set(undoCheckers(state()));
    } else if (action === 'study') {
      set({ ...state(), phase: 'study' });
      studyTimer = setTimeout(() => {
        studyTimer = null;
        if (mounted === 'memory') set({ ...state(), phase: 'play' });
      }, 3000);
    } else if (mounted === 'blocks') blockAction(action);
  }
  function keydown(e, target = e.target) {
    if (
      suspended || e.isComposing ||
      e.altKey ||
      e.ctrlKey ||
      e.metaKey ||
      target.closest('select') ||
      document.getElementById('confirm-dialog').open
    )
      return;
    if (mounted === 'blocks' && target.closest('#extra-game')) {
      if (['Enter', ' '].includes(e.key) && target.closest('button')) return;
      const action =
        {
          ArrowLeft: 'left',
          ArrowRight: 'right',
          ArrowUp: 'rotate',
          ArrowDown: 'soft',
          ' ': 'drop',
          x: 'rotate',
          z: 'rotate-back',
          c: 'hold',
          p: 'pause',
        }[e.key] ??
        { x: 'rotate', z: 'rotate-back', c: 'hold', p: 'pause' }[
          e.key.toLowerCase()
        ];
      if (action) {
        e.preventDefault();
        if (!e.repeat || ['left', 'right', 'soft'].includes(action))
          blockAction(action);
      }
    } else if (
      mounted === 'checkers' &&
      target.dataset.square !== undefined
    ) {
      let i = Number(target.dataset.square),
        next = i;
      if (e.key === 'ArrowLeft' && i % 8) next--;
      if (e.key === 'ArrowRight' && i % 8 < 7) next++;
      if (e.key === 'ArrowUp' && i >= 8) next -= 8;
      if (e.key === 'ArrowDown' && i < 56) next += 8;
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        checkerFocus = next;
        root
          .querySelector('[data-square="' + next + '"]')
          ?.focus({ preventScroll: true });
      }
    } else if (mounted === 'memory' && target.dataset.card !== undefined && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const index = Number(target.dataset.card), step = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-4,ArrowDown:4}[e.key];
      if (step === undefined) return;
      let next = index + step;
      while (next >= 0 && next < 16 && (Math.abs(step) === 4 || Math.floor(next/4) === Math.floor(index/4))) {
        const card = root.querySelector('[data-card="' + next + '"]');
        if (!card.disabled) { memoryFocus = next; card.focus({preventScroll:true}); break; }
        next += step;
      }
    }
  }
  function pause() {
    if (mounted === 'blocks' && !state().paused && !state().over) {
      set({ ...state(), paused: true });
      gravityReset();
    }
  }
  function mount(id) {
    if (Object.hasOwn(ARCADE_NAMES, id)) { arcade.mount(id); return; }
    if (id === 'sokoban') { sokoban.mount(); return; }
    if (Object.hasOwn(MORE_NAMES, id)) { more.mount(id); return; }
    if (Object.hasOwn(QUICK_NAMES, id)) { quick.mount(id); return; }
    mounted = id;
    root = document.getElementById('extra-game');
    selected = -1; checkerFocus = 40; memoryFocus = 0;
    suspended = false;
    if (id === 'memory' && state().phase === 'study')
      getSave().games[id] = { ...state(), phase: 'ready' };
    if (id === 'blocks') getSave().games[id] = { ...state(), paused: true };
    root.addEventListener('click', click);
    const unbindKeyboard = bindGameKeyboard({
      area: id === 'blocks' ? '#extra-game' : id === 'checkers' ? '#checkers-board' : '#memory-board',
      focus, onKey: keydown, blocked: () => suspended || document.getElementById('confirm-dialog').open,
      keys: e => e.key.startsWith('Arrow') || ['Enter', ' '].includes(e.key) || (mounted === 'blocks' && /^[xzcp]$/i.test(e.key)),
    });
    const focusin = e => {
      if (e.target.dataset.square !== undefined) { checkerFocus = Number(e.target.dataset.square); root.querySelectorAll('[data-square]').forEach(node => {node.tabIndex = node === e.target ? 0 : -1;}); }
      if (e.target.dataset.card !== undefined) memoryFocus = Number(e.target.dataset.card);
    };
    root.addEventListener('focus', focusin, true);
    const element = root;
    cleanup.push(() => { unbindKeyboard(); element.removeEventListener('click', click); element.removeEventListener('focus', focusin, true); });
    const change = (e) => {
      if (e.target.id === 'checkers-mode') onNew('checkers', e.target.value);
    };
    root.addEventListener('change', change);
    cleanup.push(() => root?.removeEventListener('change', change));
    window.addEventListener('blur', pause);
    window.addEventListener('pagehide', pause);
    const hidden = () => {
      if (document.hidden) pause();
    };
    document.addEventListener('visibilitychange', hidden);
    cleanup.push(() => {
      window.removeEventListener('blur', pause);
      window.removeEventListener('pagehide', pause);
      document.removeEventListener('visibilitychange', hidden);
    });
    update();
    persist();
  }
  function dispose() {
    arcade.dispose();
    sokoban.dispose();
    more.dispose();
    quick.dispose();
    cancelCheckersMotion();
    clearTimeout(aiTimer);
    clearTimeout(memoryTimer);
    clearTimeout(studyTimer);
    clearTimeout(gravityTimer);
    aiTimer = memoryTimer = studyTimer = gravityTimer = null;
    pause();
    if (mounted === 'memory' && state().open.length === 2) {
      getSave().games.memory = { ...state(), open: [] };
      persist();
    }
    cleanup.forEach((fn) => fn());
    cleanup = [];
    mounted = null;
    root = null;
  }
  function focus() {
    if (arcade.isMounted()) { arcade.focus(); return; }
    if (sokoban.isMounted()) { sokoban.focus(); return; }
    if (more.isMounted()) { more.focus(); return; }
    if (quick.isMounted()) { quick.focus(); return; }
    const overlay = root?.querySelector('#extra-overlay');
    if (overlay && !overlay.hidden) { overlay.querySelector('button')?.focus({preventScroll:true}); return; }
    const remembered = root?.querySelector(mounted === 'checkers' ? '[data-square="' + checkerFocus + '"]' : '[data-card="' + memoryFocus + '"]:not(:disabled)');
    if (mounted !== 'blocks' && remembered) { remembered.focus({preventScroll:true}); return; }
    root
      ?.querySelector(
        mounted === 'blocks'
          ? '#blocks-board'
          : mounted === 'checkers'
            ? '[tabindex="0"]'
            : '.memory-card:not(:disabled)',
      )
      ?.focus({ preventScroll: true });
  }
  function suspend() {
    arcade.suspend();
    sokoban.suspend();
    more.suspend();
    quick.suspend();
    suspended = true;
    clearTimeout(aiTimer);
    aiTimer = null;
    cancelCheckersMotion();
    pause();
    if (mounted === 'checkers') update();
  }
  function resume() {
    arcade.resume();
    sokoban.resume();
    more.resume();
    quick.resume();
    suspended = false;
    if (mounted === 'checkers') update();
  }
  return { render, mount, dispose, focus, suspend, resume };
}
