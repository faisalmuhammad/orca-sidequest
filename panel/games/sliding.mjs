export const SLIDING_DIFFICULTIES = { quick: { label: 'Quick · 3 × 3', size: 3 }, classic: { label: 'Classic · 4 × 4', size: 4 } };
const goal = size => Array.from({ length: size ** 2 }, (_,i) => (i+1) % (size ** 2));
function neighbors(index,size) {
  const cells = [];
  if (index % size) cells.push(index-1); if (index % size < size-1) cells.push(index+1);
  if (index >= size) cells.push(index-size); if (index < size*(size-1)) cells.push(index+size); return cells;
}
function swap(board,a,b) { const next=[...board]; [next[a],next[b]]=[next[b],next[a]]; return next; }
export function isSlidingComplete(s) { return s.board.every((n,i) => n === (i+1) % s.board.length); }
export function isSlidingSolvable(board,size) {
  let inversions = 0;
  for(let i=0;i<board.length;i++) for(let j=i+1;j<board.length;j++) if(board[i] && board[j] && board[i]>board[j]) inversions++;
  return size % 2 ? inversions % 2 === 0 : (inversions + size - Math.floor(board.indexOf(0)/size)) % 2 === 1;
}
export function createSliding(old=null,difficulty=old?.difficulty ?? 'quick',random=Math.random) {
  if(!Object.hasOwn(SLIDING_DIFFICULTIES,difficulty)) difficulty='quick';
  const {size}=SLIDING_DIFFICULTIES[difficulty]; let board=goal(size), blank=board.length-1, previous=-1;
  for(let i=0;i<(size===3?80:160);i++) {
    const options=neighbors(blank,size).filter(n=>n!==previous), target=options[Math.floor(random()*options.length)];
    board=swap(board,blank,target); previous=blank; blank=target;
  }
  if(isSlidingComplete({board})) board=swap(board,blank,neighbors(blank,size)[0]);
  return {difficulty,size,board,initial:[...board],moves:0,history:[],best:{quick:null,classic:null,...old?.best}};
}
export function slideTile(s,index) {
  const blank=s.board.indexOf(0);
  if(isSlidingComplete(s) || !Number.isInteger(index) || !neighbors(blank,s.size).includes(index)) return s;
  const board=swap(s.board,index,blank), moves=s.moves+1;
  return {...s,board,moves,history:[...s.history,{board:s.board,moves:s.moves}].slice(-100),best:isSlidingComplete({board})?{...s.best,[s.difficulty]:Math.min(s.best[s.difficulty]??Infinity,moves)}:s.best};
}
export function undoSliding(s) { return s.history.length?{...s,...s.history.at(-1),history:s.history.slice(0,-1)}:s; }
export function isValidSliding(s) {
  if(!s || !Object.hasOwn(SLIDING_DIFFICULTIES,s.difficulty??'') || s.size!==SLIDING_DIFFICULTIES[s.difficulty].size) return false;
  const validBoard=board=>Array.isArray(board)&&board.length===s.size**2&&new Set(board).size===board.length&&board.every(n=>Number.isInteger(n)&&n>=0&&n<board.length)&&isSlidingSolvable(board,s.size);
  if(!validBoard(s.board)||!validBoard(s.initial)||isSlidingComplete({board:s.initial})||!Number.isSafeInteger(s.moves)||s.moves<0) return false;
  if(!s.best||!Object.keys(SLIDING_DIFFICULTIES).every(key=>s.best[key]===null||(Number.isSafeInteger(s.best[key])&&s.best[key]>0))) return false;
  if(!Array.isArray(s.history)||s.history.length>Math.min(100,s.moves)||!s.history.every((entry,i)=>entry&&validBoard(entry.board)&&entry.moves===s.moves-s.history.length+i&&!isSlidingComplete(entry))) return false;
  const boards=[...s.history.map(entry=>entry.board),s.board];
  if(boards.some((board,i)=>i>0&&!neighbors(boards[i-1].indexOf(0),s.size).some(index=>swap(boards[i-1],index,boards[i-1].indexOf(0)).every((n,j)=>n===board[j])))) return false;
  if(s.moves===0&&!s.board.every((n,i)=>n===s.initial[i])) return false;
  if(s.history[0]?.moves===0&&!s.history[0].board.every((n,i)=>n===s.initial[i])) return false;
  return !isSlidingComplete(s)||(s.moves>0&&s.best[s.difficulty]!==null&&s.best[s.difficulty]<=s.moves);
}
