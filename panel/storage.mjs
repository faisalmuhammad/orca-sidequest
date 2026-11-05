export const SAVE_KEY = 'sidequest.v1';
export const emptySave = () => ({ version: 1, updatedAt: 0, activeGame: null, games: { '2048': null, sudoku: null, checkers: null, blocks: null, memory: null, minesweeper: null, lights: null, nonograms: null, codebreaker: null, sliding: null, connect: null, sokoban: null }, preferences: { sound: false, numberFirst: false, libraryView: 'compact' } });

export function normalizeSave(value, validators) {
  const save = emptySave();
  const recovered = [];
  if (!value || value.version !== 1 || typeof value.games !== 'object' || value.games === null) return { save, recovered };
  save.updatedAt = Number.isSafeInteger(value.updatedAt) && value.updatedAt >= 0 ? value.updatedAt : 0;
  save.activeGame = Object.keys(save.games).includes(value.activeGame) ? value.activeGame : null;
  save.preferences.sound = value.preferences?.sound === true;
  save.preferences.numberFirst = value.preferences?.numberFirst === true;
  save.preferences.libraryView = value.preferences?.libraryView === 'expanded' ? 'expanded' : 'compact';
  for (const game of Object.keys(save.games)) {
    if (value.games[game] == null) continue;
    if (validators[game]?.(value.games[game])) save.games[game] = value.games[game];
    else recovered.push(game);
  }
  if (save.activeGame && !save.games[save.activeGame]) save.activeGame = null;
  return { save, recovered };
}

// One write at a time, coalescing pending snapshots. A slow older write never wins.
// A synchronous journal survives closing a frame before the host write finishes.
export function createSaveStore({ storage, journal, onStatus = () => {} }) {
  let pending = null, running = null, lastTimestamp = 0;
  let journalAvailable = !!journal;
  function journalRead() {
    try { return JSON.parse(journal?.getItem(SAVE_KEY) ?? 'null'); } catch { return null; }
  }
  function journalWrite(value) {
    if (!journal) return false;
    try { journal.setItem(SAVE_KEY, JSON.stringify(value)); journalAvailable = true; return true; }
    catch { journalAvailable = false; return false; }
  }
  async function drain() {
    let failed = false;
    while (pending) {
      const value = pending;
      pending = null;
      try {
        if (storage) await storage.set(SAVE_KEY, value);
        else if (!journalAvailable) throw new Error('Storage unavailable');
        failed = false;
      } catch { failed = true; }
    }
    running = null;
    onStatus(failed ? (journalAvailable ? 'local' : 'error') : 'saved');
  }
  return {
    async load() {
      const local = journalRead();
      let primary = null, failed = false;
      try { primary = storage ? await storage.get(SAVE_KEY) : local; } catch { failed = true; }
      const compatible = value => value?.version === 1 && value.games && typeof value.games === 'object';
      const value = compatible(local) && (!compatible(primary) || local.updatedAt > primary.updatedAt) ? local : primary;
      lastTimestamp = Number.isSafeInteger(value?.updatedAt) ? value.updatedAt : 0;
      onStatus(failed ? (local ? 'local' : 'error') : 'saved');
      return value;
    },
    save(value) {
      const snapshot = structuredClone(value);
      snapshot.updatedAt = Math.max(Date.now(), lastTimestamp + 1);
      lastTimestamp = snapshot.updatedAt;
      journalWrite(snapshot);
      pending = snapshot;
      onStatus('saving');
      if (!running) {
        // Schedule the drain after assigning the promise, including journal-only previews.
        running = Promise.resolve().then(drain);
      }
      return running;
    },
    async flush() { while (running) await running; },
  };
}
