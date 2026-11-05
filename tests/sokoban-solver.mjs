// Test-only push search. Returns a playable solution; it never ships in the panel.
import { SOKOBAN_DIRECTIONS, sokobanNeighbor } from '../panel/games/sokoban.mjs';
export function solveSokoban(map, maxStates = 100000) {
  function walking(player, crates) {
    const blocked = new Set(crates), paths = new Map([[player, []]]), queue = [player];
    for (let i = 0; i < queue.length; i++) for (const direction of SOKOBAN_DIRECTIONS) {
      const next = sokobanNeighbor(map, queue[i], direction);
      if (map.floor[next] && !blocked.has(next) && !paths.has(next)) { paths.set(next, [...paths.get(queue[i]), direction]); queue.push(next); }
    }
    return paths;
  }
  const initial = { player: map.player, crates: [...map.crates].sort((a,b) => a-b), parent: null, step: [] };
  const queue = [initial], visited = new Set();
  function key(node, paths) { return node.crates.join(',') + ':' + Math.min(...paths.keys()); }
  visited.add(key(initial, walking(initial.player, initial.crates)));
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (current.crates.every(index => map.goals.includes(index))) {
      const chunks = []; for (let node = current; node.parent !== null; node = queue[node.parent]) chunks.unshift(node.step);
      return { path: chunks.flat(), visited: queue.length };
    }
    if (queue.length > maxStates) throw new Error('Solver limit: ' + map.name);
    const paths = walking(current.player, current.crates);
    for (const crate of current.crates) for (let d = 0; d < 4; d++) {
      const direction = SOKOBAN_DIRECTIONS[d], support = sokobanNeighbor(map, crate, SOKOBAN_DIRECTIONS[(d+2)%4]), destination = sokobanNeighbor(map, crate, direction);
      if (!paths.has(support) || !map.floor[destination] || current.crates.includes(destination) || map.deadTiles.includes(destination)) continue;
      const next = { player: crate, crates: current.crates.map(n => n === crate ? destination : n).sort((a,b) => a-b), parent: i, step: [...paths.get(support), direction] };
      const nextKey = key(next, walking(next.player, next.crates));
      if (!visited.has(nextKey)) { visited.add(nextKey); queue.push(next); }
    }
  }
  return null;
}
