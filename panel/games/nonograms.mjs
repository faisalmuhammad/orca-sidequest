export const NONOGRAM_DIFFICULTIES = { quick: { label: 'Quick · 5 × 5', size: 5 }, classic: { label: 'Classic · 8 × 8', size: 8 } };
const PICTURES = {
  quick: [
    ['01010','11111','11111','01110','00100'],
    ['00100','01110','11111','00100','00100'],
    ['00100','01110','11111','10101','11111'],
    ['11110','10011','10001','11111','01110'],
    ['00100','01110','01110','11111','10101'],
    ['01110','11011','11111','01110','00100'],
  ],
  classic: [
    ['01100110','11111111','11111111','11111111','01111110','00111100','00011000','00000000'],
    ['00011000','00111100','01111110','11111111','00111100','00111100','00111100','01111110'],
    ['00011000','00111100','01111110','11111111','11011011','11011011','11111111','11111111'],
    ['00111100','01111110','11100111','11000011','11100111','01111110','00111100','00011000'],
    ['00011000','00111100','00111100','00111100','01111110','11111111','11011011','10011001'],
  ],
};
export function nonogramClue(line) {
  const groups=[]; let run=0;
  for(const n of [...line,0]) { if(n) run++; else if(run) {groups.push(run);run=0;} }
  return groups.length?groups:[0];
}
export function nonogramClues(solution,size) {
  return { rows:Array.from({length:size},(_,row)=>nonogramClue(solution.slice(row*size,(row+1)*size))), columns:Array.from({length:size},(_,col)=>nonogramClue(Array.from({length:size},(_,row)=>solution[row*size+col]))) };
}
function lineOptions(clue,size) {
  if(clue.length===1&&clue[0]===0) return [Array(size).fill(0)];
  const options=[];
  function place(group,start,line) {
    if(group===clue.length) {options.push(line);return;}
    const remaining=clue.slice(group).reduce((a,b)=>a+b,0)+clue.length-group-1;
    for(let at=start;at<=size-remaining;at++) {
      const next=[...line]; for(let i=at;i<at+clue[group];i++) next[i]=1;
      place(group+1,at+clue[group]+1,next);
    }
  }
  place(0,0,Array(size).fill(0)); return options;
}
export function nonogramSolutions(rows,columns,size,limit=2) {
  const rowOptions=rows.map(clue=>lineOptions(clue,size)), colOptions=columns.map(clue=>lineOptions(clue,size));
  let count=0; const board=[];
  function visit(row) {
    if(count>=limit) return;
    if(row===size) {count++;return;}
    for(const line of rowOptions[row]) {
      board[row]=line;
      if(colOptions.every((options,col)=>options.some(option=>board.slice(0,row+1).every((r,y)=>r[col]===option[y])))) visit(row+1);
    }
    board.length=row;
  }
  visit(0);return count;
}
// Handcrafted pixel pictures are admitted only when their clues have one answer.
export const NONOGRAM_PICTURES = Object.fromEntries(Object.entries(PICTURES).map(([key,pictures])=>[key,pictures.map(rows=>rows.join('').split('').map(Number)).filter(solution=>{const {rows,columns}=nonogramClues(solution,NONOGRAM_DIFFICULTIES[key].size);return nonogramSolutions(rows,columns,NONOGRAM_DIFFICULTIES[key].size)===1;})]));
export function createNonogram(old=null,difficulty=old?.difficulty??'quick',random=Math.random) {
  if(!Object.hasOwn(NONOGRAM_DIFFICULTIES,difficulty)) difficulty='quick';
  const {size}=NONOGRAM_DIFFICULTIES[difficulty], pictures=NONOGRAM_PICTURES[difficulty];
  const solution=[...pictures[Math.floor(random()*pictures.length)]];
  return {difficulty,size,solution,cells:Array(size**2).fill(0),moves:0,history:[],best:{quick:null,classic:null,...old?.best}};
}
export function isNonogramComplete(s) { return s.cells.every((n,i)=>(n===1?1:0)===s.solution[i]); }
export function markNonogram(s,index,mark=1) {
  if(isNonogramComplete(s)||!Number.isInteger(index)||index<0||index>=s.cells.length||![1,-1].includes(mark)) return s;
  const cells=[...s.cells];cells[index]=cells[index]===mark?0:mark;const moves=s.moves+1;
  return {...s,cells,moves,history:[...s.history,{cells:s.cells,moves:s.moves}].slice(-100),best:isNonogramComplete({...s,cells})?{...s.best,[s.difficulty]:Math.min(s.best[s.difficulty]??Infinity,moves)}:s.best};
}
export function undoNonogram(s) {return s.history.length?{...s,...s.history.at(-1),history:s.history.slice(0,-1)}:s;}
export function isValidNonogram(s) {
  if(!s||!Object.hasOwn(NONOGRAM_DIFFICULTIES,s.difficulty??'')||s.size!==NONOGRAM_DIFFICULTIES[s.difficulty].size) return false;
  const validCells=cells=>Array.isArray(cells)&&cells.length===s.size**2&&cells.every(n=>[0,1,-1].includes(n));
  if(!Array.isArray(s.solution)||!NONOGRAM_PICTURES[s.difficulty].some(board=>board.every((n,i)=>n===s.solution[i])&&s.solution.length===board.length)||!validCells(s.cells)||!Number.isSafeInteger(s.moves)||s.moves<0) return false;
  if(!s.best||!Object.keys(NONOGRAM_DIFFICULTIES).every(key=>s.best[key]===null||(Number.isSafeInteger(s.best[key])&&s.best[key]>0))) return false;
  if(!Array.isArray(s.history)||s.history.length>Math.min(100,s.moves)||!s.history.every((entry,i)=>entry&&validCells(entry.cells)&&entry.moves===s.moves-s.history.length+i&&!isNonogramComplete({...s,cells:entry.cells}))) return false;
  const boards=[...s.history.map(entry=>entry.cells),s.cells];
  if(boards.some((board,i)=>i>0&&board.filter((n,j)=>n!==boards[i-1][j]).length!==1)) return false;
  if(s.moves===0&&s.cells.some(n=>n!==0)) return false;
  return !isNonogramComplete(s)||(s.best[s.difficulty]!==null&&s.best[s.difficulty]<=s.moves);
}
