// Keyboard input stays within the plugin frame and belongs to its active game.
// Resolve a board target when a toolbar click or reload left focus elsewhere.
export function bindGameKeyboard({ keys, area, focus, onKey, blocked = () => false, undo = false }) {
  const listener = event => {
    if (event.defaultPrevented || event.isComposing || event.altKey || blocked()) return;
    const target = event.target;
    if (target?.closest?.('input,textarea,select') || target?.isContentEditable) return;
    const undoKey = undo && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey;
    if ((event.ctrlKey || event.metaKey) && !undoKey) return;
    if (!keys(event)) return;
    const selector = typeof area === 'function' ? area() : area;
    if (!selector) return;
    const onBoard = node => !!node?.closest?.(selector);
    const activation = event.key === 'Enter' || event.key === ' ';
    // Preserve normal Enter/Space activation of toolbar and navigation controls.
    if (activation && target?.closest?.('button,a,[role="button"]') && !onBoard(target)) return;
    let boardTarget = target;
    if (!onBoard(boardTarget)) {
      focus();
      boardTarget = document.activeElement;
      // A game may be showing Start, Resume or Play again rather than its board.
      if (!onBoard(boardTarget) && undoKey) boardTarget = document.querySelector(selector);
      if (!onBoard(boardTarget)) {
        if (activation && boardTarget?.matches?.('button:not(:disabled)') && !boardTarget.closest('[inert]')) {
          event.preventDefault();
          if (!event.repeat) boardTarget.click();
        }
        return;
      }
    }
    if (boardTarget.closest('[inert]') && !undoKey) return;
    onKey(event, boardTarget);
    // Native button activation needs an explicit target if focus was recovered.
    if (activation && !event.defaultPrevented && boardTarget !== target && boardTarget.matches('button:not(:disabled)')) {
      event.preventDefault();
      if (!event.repeat) boardTarget.click();
    }
  };
  document.addEventListener('keydown', listener, true);
  return () => document.removeEventListener('keydown', listener, true);
}
