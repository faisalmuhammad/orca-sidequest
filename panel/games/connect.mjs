export const CONNECT_ROWS=6, CONNECT_COLUMNS=7;
export function connectWinningCells(board) {
  for(let i=0;i<42;i++) {
    if(!board[i]) continue;
    const row=Math.floor(i/7),col=i%7;
    for(const [dy,dx] of [[0,1],[1,0],[1,1],[1,-1]]) {
      const cells=Array.from({length:4},(_,n)=>[row+n*dy,col+n*dx]);
      if(cells.every(([y,x])=>y>=0&&y<6&&x>=0&&x<7&&board[y*7+x]===board[i])) return cells.map(([y,x])=>y*7+x);
    }
  }
  return [];
}
export function createConnect(old=null,mode=old?.mode??'computer') {
  return {board:Array(42).fill(0),turn:1,mode:['computer','local'].includes(mode)?mode:'computer',moves:0,result:null,history:[]};
}
export function connectColumns(s) {return s.result?[]:Array.from({length:7},(_,i)=>i).filter(col=>s.board[col]===0);}
export function dropConnect(s,column) {
  if(!Number.isInteger(column)||!connectColumns(s).includes(column)) return s;
  const board=[...s.board];let row=5;while(board[row*7+column]) row--;
  board[row*7+column]=s.turn;const winning=connectWinningCells(board);
  return {...s,board,turn:-s.turn,moves:s.moves+1,result:winning.length?s.turn:board.every(Boolean)?'draw':null,history:[...s.history,{board:s.board,turn:s.turn,moves:s.moves,result:s.result}]};
}
export function undoConnect(s) {
  if(!s.history.length) return s;
  let history=s.history.slice(),previous=history.pop();
  while(s.mode==='computer'&&previous.turn!==1&&history.length) previous=history.pop();
  return {...s,...previous,history};
}
function evaluate(board,player) {
  let score=0;for(let row=0;row<6;row++) score+=board[row*7+3]*player*7;
  for(let row=0;row<6;row++) for(let col=0;col<7;col++) for(const [dy,dx] of [[0,1],[1,0],[1,1],[1,-1]]) {
    const cells=Array.from({length:4},(_,n)=>[row+n*dy,col+n*dx]);
    if(!cells.every(([y,x])=>y>=0&&y<6&&x>=0&&x<7)) continue;
    const values=cells.map(([y,x])=>board[y*7+x]),own=values.filter(n=>n===player).length,opponent=values.filter(n=>n===-player).length;
    if(!opponent) score+=[0,1,12,110,100000][own];
    if(!own) score-=[0,1,15,150,100000][opponent];
  }
  return score;
}
export function chooseConnectColumn(s,depth=4) {
  const order=[3,2,4,1,5,0,6],player=s.turn, legal=order.filter(col=>connectColumns(s).includes(col));
  if(!legal.length) return null;
  function search(node,left,alpha,beta) {
    if(node.result) return node.result==='draw'?0:node.result===player?100000+left:-100000-left;
    if(left===0) return evaluate(node.board,player);
    const maximizing=node.turn===player;let best=maximizing?-Infinity:Infinity;
    for(const col of order.filter(n=>connectColumns(node).includes(n))) {
      const value=search(dropConnect({...node,history:[]},col),left-1,alpha,beta);
      best=maximizing?Math.max(best,value):Math.min(best,value);
      if(maximizing) alpha=Math.max(alpha,best);else beta=Math.min(beta,best);if(alpha>=beta) break;
    }
    return best;
  }
  let best=-Infinity,choice=legal[0];
  for(const col of legal) {const score=search(dropConnect({...s,history:[]},col),depth-1,-Infinity,Infinity);if(score>best){best=score;choice=col;}}
  return choice;
}
export function isValidConnect(s) {
  if(!s||!['computer','local'].includes(s.mode)||!Array.isArray(s.board)||s.board.length!==42||!s.board.every(n=>[-1,0,1].includes(n))||!Number.isInteger(s.moves)||s.moves<0||s.moves>42||![1,-1].includes(s.turn)||![null,'draw',1,-1].includes(s.result)||!Array.isArray(s.history)||s.history.length!==s.moves) return false;
  let replay=createConnect(null,s.mode);
  for(let i=0;i<s.moves;i++) {
    const entry=s.history[i], nextBoard=i===s.moves-1?s.board:s.history[i+1]?.board;
    if(!entry||!Array.isArray(entry.board)||entry.board.length!==42||!entry.board.every((n,j)=>n===replay.board[j])||entry.turn!==replay.turn||entry.moves!==replay.moves||entry.result!==null||!Array.isArray(nextBoard)||nextBoard.length!==42) return false;
    const changed=nextBoard.flatMap((n,j)=>n!==entry.board[j]?[j]:[]);if(changed.length!==1) return false;
    replay=dropConnect(replay,changed[0]%7);if(!replay.board.every((n,j)=>n===nextBoard[j])) return false;
  }
  return s.board.every((n,i)=>n===replay.board[i])&&s.turn===replay.turn&&s.result===replay.result;
}
