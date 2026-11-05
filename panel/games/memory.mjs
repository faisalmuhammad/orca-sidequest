export function createMemory(best = null, random = Math.random) {
  const cards = Array.from({ length: 16 }, (_, i) => i % 8);
  for (let i = 15; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return { cards, matched: [], open: [], attempts: 0, best, phase: 'ready' };
}
export function flipMemory(s, index) {
  if (
    s.phase !== 'play' ||
    s.open.length === 2 ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= 16 ||
    s.matched.includes(index) ||
    s.open.includes(index)
  )
    return s;
  const open = [...s.open, index];
  if (open.length === 1) return { ...s, open };
  const attempts = s.attempts + 1;
  if (s.cards[open[0]] !== s.cards[open[1]]) return { ...s, open, attempts };
  const matched = [...s.matched, ...open],
    complete = matched.length === 16;
  return {
    ...s,
    open: [],
    matched,
    attempts,
    phase: complete ? 'complete' : 'play',
    best: complete ? Math.min(s.best ?? Infinity, attempts) : s.best,
  };
}
export function isValidMemory(s) {
  return !!(
    s &&
    Array.isArray(s.cards) &&
    s.cards.length === 16 &&
    Array.from(
      { length: 8 },
      (_, v) => s.cards.filter((n) => n === v).length,
    ).every((n) => n === 2) &&
    Array.isArray(s.matched) &&
    s.matched.length % 2 === 0 &&
    new Set(s.matched).size === s.matched.length &&
    s.matched.every((i) => Number.isInteger(i) && i >= 0 && i < 16) &&
    Array.from(
      { length: 8 },
      (_, v) => s.matched.filter((i) => s.cards[i] === v).length,
    ).every((n) => n === 0 || n === 2) &&
    Array.isArray(s.open) &&
    s.open.length <= 2 &&
    new Set(s.open).size === s.open.length &&
    s.open.every(
      (i) => Number.isInteger(i) && i >= 0 && i < 16 && !s.matched.includes(i),
    ) &&
    Number.isSafeInteger(s.attempts) &&
    s.attempts >= 0 &&
    (s.best === null || (Number.isSafeInteger(s.best) && s.best >= 8)) &&
    ['ready', 'study', 'play', 'complete'].includes(s.phase) &&
    (s.phase !== 'complete' || s.matched.length === 16)
  );
}
