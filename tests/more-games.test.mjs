import test from 'node:test';
import assert from 'node:assert/strict';
import { NONOGRAM_PICTURES, createNonogram, nonogramClue, nonogramClues, nonogramSolutions, markNonogram, undoNonogram, isNonogramComplete, isValidNonogram } from '../panel/games/nonograms.mjs';
import { createCodebreaker, codeFeedback, enterCode, submitCode, isValidCodebreaker } from '../panel/games/codebreaker.mjs';
import { createSliding, slideTile, undoSliding, isSlidingComplete, isSlidingSolvable, isValidSliding } from '../panel/games/sliding.mjs';
import { createConnect, dropConnect, undoConnect, connectColumns, connectWinningCells, chooseConnectColumn, isValidConnect } from '../panel/games/connect.mjs';
const random=seed=>()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};
test('handcrafted Nonograms have exactly one solution at both sizes',()=>{
  for(const [difficulty,pictures] of Object.entries(NONOGRAM_PICTURES)) {
    assert.ok(pictures.length>=5);const size=difficulty==='quick'?5:8;
    for(const picture of pictures){const {rows,columns}=nonogramClues(picture,size);assert.equal(nonogramSolutions(rows,columns,size),1);}
    assert.ok(isValidNonogram(createNonogram(null,difficulty)));
  }
});
test('Nonogram clue runs include required gaps and empty lines',()=>{
  assert.deepEqual(nonogramClue([1,1,0,1,0,1,1,1]),[2,1,3]);
  assert.deepEqual(nonogramClue([0,0,0]),[0]);
  assert.equal(nonogramSolutions([[1],[1]],[[1],[1]],2),2);
});
test('Nonogram marks toggle independently, undo, and complete only the picture',()=>{
  let s=createNonogram(null,'quick',()=>0),cross=markNonogram(s,0,-1);assert.equal(cross.cells[0],-1);assert.deepEqual(undoNonogram(cross).cells,s.cells);
  assert.deepEqual(markNonogram(cross,0,-1).cells,s.cells);
  for(let i=0;i<s.cells.length;i++)if(s.solution[i])s=markNonogram(s,i);
  assert.ok(isNonogramComplete(s));assert.ok(isValidNonogram(s));assert.equal(s.best.quick,s.moves);
  const undone=undoNonogram(s);assert.equal(isNonogramComplete(undone),false);assert.equal(undone.best.quick,s.moves);
  assert.equal(markNonogram(s,0),s);
});
test('Nonograms reject corrupt pictures and retain bounded undo history',()=>{
  let s=createNonogram();for(let i=0;i<110;i++)s=markNonogram(s,0);
  assert.equal(s.history.length,100);for(let i=0;i<100;i++)s=undoNonogram(s);assert.ok(isValidNonogram(s));
  assert.equal(isValidNonogram({...s,solution:Array(25).fill(0)}),false);
  assert.equal(isValidNonogram({...s,cells:Array(25).fill(2)}),false);
});
test('Codebreaker feedback never double-counts repeated colors',()=>{
  assert.deepEqual(codeFeedback([0,0,1,2],[0,1,0,0]),{exact:1,misplaced:2});
  assert.deepEqual(codeFeedback([0,0,0,0],[0,1,1,1]),{exact:1,misplaced:0});
  assert.deepEqual(codeFeedback([0,1,2,3],[3,2,1,0]),{exact:0,misplaced:4});
});
test('Codebreaker incomplete guesses cannot be submitted and unfinished drafts save',()=>{
  const s=createCodebreaker(),draft=enterCode(s,0,3);assert.equal(submitCode(draft),draft);assert.ok(isValidCodebreaker(draft));
  assert.equal(enterCode(s,4,0),s);assert.equal(enterCode(s,0,6),s);assert.equal(enterCode(draft,0,null).draft[0],null);
});
test('Codebreaker wins, records the fewest guesses, and stops after ten misses',()=>{
  let s=createCodebreaker(null,undefined,()=>0);for(let i=0;i<4;i++)s=enterCode(s,i,0);s=submitCode(s);
  assert.equal(s.result,'won');assert.equal(s.best,1);assert.ok(isValidCodebreaker(s));assert.equal(submitCode(s),s);
  let lost=createCodebreaker();for(let n=0;n<10;n++){for(let i=0;i<4;i++)lost=enterCode(lost,i,(lost.secret[i]+1)%6);lost=submitCode(lost);}
  assert.equal(lost.result,'lost');assert.ok(isValidCodebreaker(lost));assert.equal(createCodebreaker(s).best,1);
});
test('Codebreaker rejects tampered feedback and premature wins',()=>{
  let s=createCodebreaker();for(let i=0;i<4;i++)s=enterCode(s,i,5);s=submitCode(s);
  assert.equal(isValidCodebreaker({...s,guesses:[{...s.guesses[0],exact:99}]}),false);
  assert.equal(isValidCodebreaker({...createCodebreaker(),result:'won'}),false);
});
test('Sliding Puzzle shuffles remain solvable at both sizes over many seeds',()=>{
  for(const difficulty of ['quick','classic'])for(let seed=1;seed<=50;seed++){const s=createSliding(null,difficulty,random(seed));assert.ok(isSlidingSolvable(s.board,s.size));assert.equal(isSlidingComplete(s),false);assert.ok(isValidSliding(s));}
});
test('Sliding Puzzle permits only tiles beside the gap, without wrapping',()=>{
  const s={...createSliding(),board:[1,2,3,4,5,6,0,7,8]};
  assert.equal(slideTile(s,5),s);assert.equal(slideTile(s,0),s);
  const next=slideTile(s,7);assert.deepEqual(next.board,[1,2,3,4,5,6,7,0,8]);assert.equal(next.moves,1);
  assert.deepEqual(undoSliding(next).board,s.board);
});
test('Sliding Puzzle completion and undo preserve the personal record',()=>{
  const board=[1,2,3,4,5,6,7,0,8],s={...createSliding(),board,initial:board};
  const won=slideTile(s,8);assert.ok(isSlidingComplete(won));assert.equal(won.best.quick,1);assert.ok(isValidSliding(won));
  const undone=undoSliding(won);assert.equal(undone.moves,0);assert.equal(undone.best.quick,1);assert.ok(isValidSliding(undone));
});
test('Sliding Puzzle parity and saved history reject unreachable positions',()=>{
  assert.equal(isSlidingSolvable([2,1,3,4,5,6,7,8,0],3),false);
  const impossible=[2,1,...Array.from({length:13},(_,i)=>i+3),0];assert.equal(isSlidingSolvable(impossible,4),false);
  const s=createSliding();assert.equal(isValidSliding({...s,board:Array(9).fill(1)}),false);
  assert.equal(isValidSliding({...s,board:[2,1,3,4,5,6,7,8,0]}),false);
});
test('Connect Four obeys gravity and refuses full columns',()=>{
  let s=createConnect(null,'local');for(let i=0;i<6;i++){s=dropConnect(s,0);assert.notEqual(s.board[(5-i)*7],0);}
  assert.ok(!connectColumns(s).includes(0));assert.equal(dropConnect(s,0),s);assert.ok(isValidConnect(s));
});
test('Connect Four detects horizontal, vertical, and both diagonal wins',()=>{
  for(const cells of [[35,36,37,38],[35,28,21,14],[35,29,23,17],[38,30,22,14]]){const board=Array(42).fill(0);for(const i of cells)board[i]=1;assert.equal(connectWinningCells(board).length,4);}
  let s=createConnect(null,'local');for(const col of [0,6,1,6,2,5,3])s=dropConnect(s,col);
  assert.equal(s.result,1);assert.equal(dropConnect(s,4),s);assert.ok(isValidConnect(s));
});
test('Connect Four recognizes a full board without a winning line',()=>{
  const board=['1122112','2211221','1122112','2211221','1122112','2211221'].join('').split('').map(n=>n==='1'?1:-1);
  assert.equal(connectWinningCells(board).length,0);board[2]=0;
  const s={...createConnect(),board,turn:-1,moves:41};assert.equal(dropConnect(s,2).result,'draw');
});
test('Connect Four computer takes wins and blocks an immediate loss',()=>{
  let block=createConnect();for(const col of [0,6,1,6,2])block=dropConnect(block,col);assert.equal(chooseConnectColumn(block),3);
  let win=createConnect();for(const col of [6,0,6,1,5,2,5])win=dropConnect(win,col);assert.equal(chooseConnectColumn(win),3);
});
test('Connect Four undo restores a whole human/computer turn or one local move',()=>{
  const start=createConnect(),human=dropConnect(start,3),computer=dropConnect(human,2);
  assert.deepEqual(undoConnect(human),start);assert.deepEqual(undoConnect(computer),start);
  const local=dropConnect(createConnect(null,'local'),3);assert.equal(undoConnect(local).moves,0);
});
test('Connect Four rejects floating pieces, forged results, and corrupt replays',()=>{
  const s=dropConnect(createConnect(),3);assert.ok(isValidConnect(s));
  const floating=[...s.board];floating[3]=1;floating[38]=0;assert.equal(isValidConnect({...s,board:floating}),false);
  assert.equal(isValidConnect({...s,result:1}),false);assert.equal(isValidConnect({...s,history:[]}),false);
});
