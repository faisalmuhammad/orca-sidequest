export const CODE_COLORS = ['Coral', 'Amber', 'Mint', 'Sky', 'Lilac', 'Rose'];
const validCode = code => Array.isArray(code) && code.length === 4 && code.every(n => Number.isInteger(n) && n >= 0 && n < 6);
export function codeFeedback(secret, code) {
  let exact = 0; const remainingSecret = Array(6).fill(0), remainingCode = Array(6).fill(0);
  for (let i = 0; i < 4; i++) {
    if (secret[i] === code[i]) exact++;
    else { remainingSecret[secret[i]]++; remainingCode[code[i]]++; }
  }
  return { exact, misplaced: remainingSecret.reduce((n, count, i) => n + Math.min(count, remainingCode[i]), 0) };
}
export function createCodebreaker(old = null, _difficulty, random = Math.random) {
  return { secret: Array.from({ length: 4 }, () => Math.floor(random() * 6)), draft: Array(4).fill(null), guesses: [], result: null, best: old?.best ?? null };
}
export function enterCode(s, index, color) {
  if (s.result || !Number.isInteger(index) || index < 0 || index > 3 || (color !== null && (!Number.isInteger(color) || color < 0 || color > 5)) || s.draft[index] === color) return s;
  const draft = [...s.draft]; draft[index] = color; return { ...s, draft };
}
export function submitCode(s) {
  if (s.result || !validCode(s.draft)) return s;
  const feedback = codeFeedback(s.secret, s.draft), guesses = [...s.guesses, { code: [...s.draft], ...feedback }];
  const result = feedback.exact === 4 ? 'won' : guesses.length === 10 ? 'lost' : null;
  return { ...s, guesses, draft: Array(4).fill(null), result, best: result === 'won' ? Math.min(s.best ?? Infinity, guesses.length) : s.best };
}
export function isValidCodebreaker(s) {
  if (!s || !validCode(s.secret) || !Array.isArray(s.draft) || s.draft.length !== 4 || !s.draft.every(n => n === null || (Number.isInteger(n) && n >= 0 && n < 6))) return false;
  if (!Array.isArray(s.guesses) || s.guesses.length > 10 || !s.guesses.every((g,i) => g && validCode(g.code) && g.exact === codeFeedback(s.secret,g.code).exact && g.misplaced === codeFeedback(s.secret,g.code).misplaced && (i === s.guesses.length - 1 || g.exact !== 4))) return false;
  if (![null,'won','lost'].includes(s.result) || (s.best !== null && (!Number.isSafeInteger(s.best) || s.best < 1 || s.best > 10))) return false;
  const result = s.guesses.at(-1)?.exact === 4 ? 'won' : s.guesses.length === 10 ? 'lost' : null;
  return s.result === result && (!s.result || s.draft.every(n => n === null)) && (result !== 'won' || (s.best !== null && s.best <= s.guesses.length));
}
