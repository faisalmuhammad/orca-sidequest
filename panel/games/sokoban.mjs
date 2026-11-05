// Original compact levels, arranged from single-crate lessons to small deliveries.
const designs = [
  ['First Steps', ['######','#    #','# @$.#','#    #','######']],
  ['Looking Up', ['######','#  . #','#    #','#  $ #','#  @ #','######']],
  ['Room to Move', ['#######','#     #','#  $ .#','#   @ #','#     #','#######']],
  ['Around the Wall', ['#######','#     #','#     #','# #$ .#','#  @  #','#     #','#######']],
  ['Two Deliveries', ['#######','#   ..#','#     #','# $ $ #','#  @  #','#######']],
  ['Split Paths', ['#######','# . . #','#     #','# $ $ #','#     #','#  @  #','#######']],
  ['Side by Side', ['########','#      #','#    ..#','#  $$  #','# @    #','########']],
  ['Middle Aisle', ['#######','# . . #','#  #  #','# $ $ #','#  #  #','#  @  #','#######']],
  ['Parking Bay', ['########','#    ..#','# #    #','#  $ $ #','#  #   #','# @    #','########']],
  ['Crossroads', ['#######','# .   #','#  #  #','# $@$ #','#     #','#   . #','#######']],
  ['Three Stops', ['########','# . . .#','#      #','# $ $ $#','#  # # #','#   @  #','########']],
  ['Loading Dock', ['########','#   ...#','#      #','# $$$  #','#      #','#  @   #','########']],
  ['Two Rooms', ['########','# . # .#','#   #  #','#      #','# $ #$ #','#   #  #','#  @   #','########']],
  ['Through the Gap', ['########','#   # .#','#   #  #','#      #','# $ #  #','#   #  #','# @    #','########']],
  ['Keep the Exit Clear', ['########','#      #','# ###  #','# $  ..#','# $##  #','# @    #','########']],
  ['Switchback', ['########','#    ..#','#  #   #','#  $ $ #','#   #  #','#      #','# @    #','########']],
  ['Center Stage', ['########','#      #','# . . .#','#   #  #','# $ $ $#','#   @  #','########']],
  ['Careful Corners', ['########','# .  ..#','#      #','# $$ $ #','# #    #','#   @  #','#      #','########']],
  ['Final Delivery', ['########','# .... #','#      #','# $$   #','#   $$ #','#      #','# @    #','########']],
  ['Last Light', ['########','# .... #','#      #','# $#$  #','# $ $  #','#   #  #','# @    #','########']],
];
export const SOKOBAN_DIRECTIONS = ['up', 'right', 'down', 'left'];
export function sokobanNeighbor(level, index, direction) {
  const row = Math.floor(index / level.width), col = index % level.width;
  if (direction === 'up' && row > 0) return index - level.width;
  if (direction === 'down' && row < level.height - 1) return index + level.width;
  if (direction === 'left' && col > 0) return index - 1;
  if (direction === 'right' && col < level.width - 1) return index + 1;
  return -1;
}
const opposite = direction => SOKOBAN_DIRECTIONS[(SOKOBAN_DIRECTIONS.indexOf(direction) + 2) % 4];
function parseLevel([name, rows], index) {
  const width = rows[0].length, height = rows.length;
  if (rows.some(row => row.length !== width)) throw new Error('Uneven Sokoban level: ' + name);
  const cells = rows.join('').split(''), floor = cells.map(n => n !== '#');
  const goals = cells.flatMap((n, i) => '.+*'.includes(n) ? [i] : []);
  const crates = cells.flatMap((n, i) => '$*'.includes(n) ? [i] : []);
  const players = cells.flatMap((n, i) => '@+'.includes(n) ? [i] : []);
  if (players.length !== 1 || !goals.length || goals.length !== crates.length || cells.some(n => !'# .$@+*'.includes(n))) throw new Error('Invalid Sokoban level: ' + name);
  const level = { index, name, width, height, floor, goals, crates, player: players[0] };
  // Reverse pushes identify tiles from which a crate can never reach a goal.
  const reachable = new Set(goals), queue = [...goals];
  for (let at = 0; at < queue.length; at++) for (const direction of SOKOBAN_DIRECTIONS) {
    const from = sokobanNeighbor(level, queue[at], opposite(direction));
    const support = sokobanNeighbor(level, from, opposite(direction));
    if (floor[from] && floor[support] && !reachable.has(from)) { reachable.add(from); queue.push(from); }
  }
  level.deadTiles = floor.flatMap((n, i) => n && !reachable.has(i) ? [i] : []);
  return level;
}
export const SOKOBAN_LEVELS = designs.map(parseLevel);
const sorted = crates => [...crates].sort((a, b) => a - b);
export function createSokoban(old = null, selected = old?.level ?? 0) {
  const unlocked = old?.unlocked ?? 0;
  const level = Number.isInteger(selected) && selected >= 0 && selected <= unlocked && selected < SOKOBAN_LEVELS.length ? selected : old?.level ?? 0;
  const map = SOKOBAN_LEVELS[level];
  return { level, unlocked, player: map.player, crates: sorted(map.crates), moves: 0, pushes: 0, history: [], records: old?.records?.map(record => record ? { ...record } : null) ?? Array(SOKOBAN_LEVELS.length).fill(null) };
}
export function isSokobanComplete(s) { return s.crates.every(index => SOKOBAN_LEVELS[s.level].goals.includes(index)); }
export function sokobanDeadlocks(s) { return s.crates.filter(index => SOKOBAN_LEVELS[s.level].deadTiles.includes(index)); }
export function moveSokoban(s, direction) {
  if (!SOKOBAN_DIRECTIONS.includes(direction) || isSokobanComplete(s)) return s;
  const map = SOKOBAN_LEVELS[s.level], target = sokobanNeighbor(map, s.player, direction);
  if (!map.floor[target]) return s;
  const pushing = s.crates.includes(target), destination = sokobanNeighbor(map, target, direction);
  if (pushing && (!map.floor[destination] || s.crates.includes(destination))) return s;
  const next = { ...s, player: target, crates: pushing ? sorted(s.crates.map(index => index === target ? destination : index)) : s.crates, moves: s.moves + 1, pushes: s.pushes + Number(pushing), history: [...s.history, { player: s.player, crates: s.crates, moves: s.moves, pushes: s.pushes }].slice(-200) };
  if (isSokobanComplete(next)) {
    const record = s.records[s.level], better = !record || next.pushes < record.pushes || (next.pushes === record.pushes && next.moves < record.moves);
    next.records = s.records.map((value, i) => i === s.level && better ? { moves: next.moves, pushes: next.pushes } : value);
    next.unlocked = Math.max(s.unlocked, Math.min(SOKOBAN_LEVELS.length - 1, s.level + 1));
  }
  return next;
}
export function undoSokoban(s) { return s.history.length ? { ...s, ...s.history.at(-1), history: s.history.slice(0, -1) } : s; }
export function isValidSokoban(s) {
  if (!s || !Number.isInteger(s.level) || s.level < 0 || s.level >= SOKOBAN_LEVELS.length || !Number.isInteger(s.unlocked) || s.unlocked < s.level || s.unlocked >= SOKOBAN_LEVELS.length) return false;
  const map = SOKOBAN_LEVELS[s.level];
  const positionValid = value => value && Number.isInteger(value.player) && map.floor[value.player] === true && Array.isArray(value.crates) && value.crates.length === map.crates.length && value.crates.every((index, i) => Number.isInteger(index) && map.floor[index] === true && index !== value.player && (i === 0 || index > value.crates[i - 1])) && Number.isSafeInteger(value.moves) && value.moves >= 0 && Number.isSafeInteger(value.pushes) && value.pushes >= 0 && value.pushes <= value.moves;
  if (!positionValid(s) || !Array.isArray(s.records) || s.records.length !== SOKOBAN_LEVELS.length) return false;
  if (!s.records.every((record, i) => record === null ? i >= s.unlocked : i <= s.unlocked && Number.isSafeInteger(record.moves) && Number.isSafeInteger(record.pushes) && record.pushes > 0 && record.moves >= record.pushes)) return false;
  if (!Array.isArray(s.history) || s.history.length > Math.min(200, s.moves) || !s.history.every((entry, i) => positionValid(entry) && entry.moves === s.moves - s.history.length + i)) return false;
  const positions = [...s.history, s];
  for (let i = 1; i < positions.length; i++) {
    const before = { ...s, ...positions[i - 1], history: [] };
    if (isSokobanComplete(before)) return false;
    const after = positions[i];
    if (!SOKOBAN_DIRECTIONS.some(direction => { const next = moveSokoban(before, direction); return next !== before && next.player === after.player && next.pushes === after.pushes && next.crates.every((n, j) => n === after.crates[j]); })) return false;
  }
  const first = s.history[0] ?? s;
  if (first.moves === 0 && (first.player !== map.player || first.pushes !== 0 || !first.crates.every((n, i) => n === sorted(map.crates)[i]))) return false;
  const record = s.records[s.level];
  return !isSokobanComplete(s) || (record !== null && (record.pushes < s.pushes || (record.pushes === s.pushes && record.moves <= s.moves)));
}
