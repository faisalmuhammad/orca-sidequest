// Original generated paths shared by the two connection puzzles.
export const gridNeighbors = (index, size) => {
  const cells = [];
  if (index >= size) cells.push(index - size);
  if (index % size < size - 1) cells.push(index + 1);
  if (index < size * (size - 1)) cells.push(index + size);
  if (index % size) cells.push(index - 1);
  return cells;
};
export const adjacent = (a, b, size) => gridNeighbors(a, size).includes(b);
export const pick = (length, random = Math.random) => Math.min(length - 1, Math.max(0, Math.floor(random() * length)));
export const natural = value => Number.isSafeInteger(value) && value >= 0;
export function gridRoute(size, random = Math.random, boundary = false) {
  let path = Array.from({ length: size ** 2 }, (_, i) => {
    const row = Math.floor(i / size), col = i % size;
    return row * size + (row % 2 ? size - 1 - col : col);
  });
  const edge = i => i < size || i >= size * (size - 1) || i % size === 0 || i % size === size - 1;
  // Backbite reversals keep a Hamiltonian path, without retrying generation.
  for (let step = 0; step < size ** 2 * 12; step++) {
    if (pick(2, random)) path.reverse();
    const choices = gridNeighbors(path[0], size).map(i => path.indexOf(i)).filter(i => i > 1 && (!boundary || edge(path[i - 1])));
    if (choices.length) { const end = choices[pick(choices.length, random)]; path = path.slice(0, end).reverse().concat(path.slice(end)); }
  }
  return path;
}
export function validRoute(path, size) {
  return Array.isArray(path) && path.length === size ** 2 && new Set(path).size === path.length && path.every((n, i) => Number.isInteger(n) && n >= 0 && n < size ** 2 && (!i || adjacent(path[i - 1], n, size)));
}
