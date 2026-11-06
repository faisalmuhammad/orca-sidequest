import { bindGameKeyboard } from './keyboard.mjs';
import { NONOGRAM_DIFFICULTIES, createNonogram, nonogramClues, nonogramClue, markNonogram, undoNonogram, isNonogramComplete } from './games/nonograms.mjs';
import { CODE_COLORS, createCodebreaker, enterCode, submitCode } from './games/codebreaker.mjs';
import { SLIDING_DIFFICULTIES, createSliding, slideTile, undoSliding, isSlidingComplete } from './games/sliding.mjs';
import { createConnect, dropConnect, undoConnect, chooseConnectColumn, connectWinningCells, connectColumns } from './games/connect.mjs';
import { createWordle, enterLetter, deleteLetter, submitGuess, WORDLE_VALID } from './games/wordle.mjs';
import { createSimon, tapSimon, startPlayPhase } from './games/simon.mjs';
import { FLOOD_DIFFICULTIES, FLOOD_COLORS, createFlood, pickFlood, floodRegion } from './games/flood.mjs';
import { celebration } from './effects.mjs';
export const MORE_NAMES={nonograms:'Nonograms',codebreaker:'Codebreaker',sliding:'Sliding Puzzle',connect:'Connect Four',wordle:'Wordle',simon:'Simon',flood:'Flood Fill'};
export const MORE_CREATORS={nonograms:createNonogram,codebreaker:createCodebreaker,sliding:createSliding,connect:createConnect,wordle:createWordle,simon:createSimon,flood:createFlood};
const codeSymbols=['spark','star','leaf','target','moon','bolt'];
const codePeg=(color,icon)=>`<span class="code-peg" role="img" aria-label="${color===null?'Empty':CODE_COLORS[color]} symbol" data-color="${color===null?'empty':color}">${color===null?'':icon(codeSymbols[color])}</span>`;
export function moreCards(games,icon) {
  const descriptions={nonograms:'Follow the clues. Reveal a picture.',codebreaker:'Read the feedback. Crack the sequence.',sliding:'One empty space. A little order.',connect:'Think ahead. Connect your next four.',wordle:'Five letters. Six tries. One word.',simon:'Watch. Remember. Repeat the pattern.',flood:'Fill the board in limited moves.'};
  const kickers={nonograms:'PICTURE THE POSSIBILITIES',codebreaker:'A COLORFUL MYSTERY',sliding:'MAKE A LITTLE SPACE',connect:'FOUR IN A ROW',wordle:'GUESS THE WORD',simon:'FOLLOW THE SEQUENCE',flood:'ONE COLOR AT A TIME'};
  return Object.entries(MORE_NAMES).map(([id,name],i)=>{
    const s=games[id],done=s&&(s.result||(id==='nonograms'&&isNonogramComplete(s))||(id==='sliding'&&isSlidingComplete(s)));
    const progress=s&&(id==='codebreaker'?s.guesses.length>0||s.draft.some(n=>n!==null):id==='wordle'?s.guesses.length>0||s.draft.length>0:id==='simon'?s.round>1||s.input.length>0:id==='flood'?s.moves>0:s.moves>0),status=done?'Done':progress?'Resume':'Play';
    const meta=!s?'A fresh puzzle awaits':id==='codebreaker'?`${s.guesses.length}/10 guesses`:id==='wordle'?`${s.guesses.length}/6 guesses`:id==='connect'?`${s.moves} pieces played`:id==='simon'?`Round ${s.round}`:id==='flood'?`${s.moves}/${s.maxMoves} moves`:`${s.moves} moves`;
    const art=id==='nonograms'?`<div class="mini-nonogram">${'0101011111111110111000100'.split('').map(n=>`<i class="${n==='1'?'filled':''}"></i>`).join('')}</div>`:id==='codebreaker'?`<div class="mini-code">${[0,2,3,4].map(n=>codePeg(n,icon)).join('')}</div>`:id==='sliding'?`<div class="mini-sliding">${[1,2,3,4,0,6,7,5,8].map(n=>`<span class="${n?'':'empty'}">${n||''}</span>`).join('')}</div>`:id==='wordle'?`<div class="mini-wordle">${'crane'.split('').map((ch,j)=>`<span class="${['correct','present','absent','absent','correct'][j]}">${ch}</span>`).join('')}</div>`:id==='connect'?`<div class="mini-connect">${[0,0,0,0,0,0,1,0,0,0,1,-1,0,1,-1,1,1,-1,-1,1].map(n=>`<i data-player="${n}"></i>`).join('')}</div>`:id==='simon'?`<div class="mini-simon"><span data-pad="0"></span><span data-pad="1"></span><span data-pad="2" class="lit"></span><span data-pad="3"></span></div>`:id==='flood'?`<div class="mini-flood">${[0,0,1,1,0,0,2,3,0,1,1,3,2,2,3,3].map(c=>`<i data-color="${c}"></i>`).join('')}</div>`:'';
    return { id, html: `<button class="game-card" data-game="${id}" aria-label="${status==='Done'?'Open':status} ${name}"><div class="card-preview preview-${id}" aria-hidden="true"><span class="card-kicker">/ ${kickers[id]}</span>${art}<span class="art-spark spark-one">✦</span></div><div class="card-info"><div class="card-title-line"><span class="card-title">${name}</span><span class="card-arrow">${icon('arrow')}</span></div><p class="card-description">${descriptions[id]}</p><div class="card-meta"><span>${meta}</span><span class="card-state">${status}${icon('play')}</span></div></div></button>` };
  });
}
export function createMoreGames({getSave,persist,sound,icon,announce,onNew}) {
  let mounted=null,root=null,crossMode=false,cursor=0,nonoCursor=0,connectCursor=0,suspended=false,moving=false,motion=0,animations=[],aiTimer=null,watchTimer=null,watchToken=0,cleanup=[];
  const state=()=>getSave().games[mounted];
  const btn=(action,label,symbol='',attrs='')=>`<button type="button" class="button" data-more="${action}" ${attrs}>${symbol?icon(symbol):''}${label}</button>`;
  const options=(id,s)=>`<div class="quick-options"><select id="more-difficulty" aria-label="${MORE_NAMES[id]} difficulty">${Object.entries(id==='nonograms'?NONOGRAM_DIFFICULTIES:SLIDING_DIFFICULTIES).map(([key,rule])=>`<option value="${key}" ${s.difficulty===key?'selected':''}>${rule.label}</option>`).join('')}</select><span class="quick-difficulty-note">${id==='nonograms'?'One unique picture':'Every board is solvable'}</span></div>`;
  function render(id) {
    const s=getSave().games[id],subtitle={nonograms:'A hidden picture, one square at a time.',codebreaker:'Four symbols. One hidden sequence.',sliding:'Make space. Bring things into place.',connect:'A small move can start a big connection.',wordle:'Five letters. Six tries. One word.',simon:'Watch closely. Repeat what you see.',flood:'Cover the board in a single color.'}[id];
    const header=`<section id="more-game" class="quick-game ${id}-game" aria-label="${MORE_NAMES[id]} game"><div class="game-heading"><div><h1>${MORE_NAMES[id]}</h1><p class="subtitle">${subtitle||''}</p></div>${btn('new','New','plus')}</div>`;
    if(id==='simon') return `${header}<div class="stats"><div class="stat"><span class="stat-label">ROUND</span><span class="stat-value" id="more-score"></span></div><div class="stat stat-best"><span class="stat-label">BEST</span><span class="stat-value" id="more-secondary"></span></div></div><div class="board-wrap"><div class="simon-board" role="group" aria-label="Simon pads">${[0,1,2,3].map(p=>`<button type="button" class="simon-pad" data-pad="${p}" aria-label="Pad ${p+1}">${p+1}</button>`).join('')}</div><div class="board-overlay" id="more-overlay" hidden></div></div><p class="quick-feedback" id="simon-feedback">Watch the pattern…</p><p class="quick-best" id="more-best"></p><p class="instructions">Watch the sequence, then tap the pads in order.<br><kbd>1–4</kbd> tap pads</p></section>`;
    if(id==='flood') {
      const floodOpts=`<div class="quick-options"><select id="more-difficulty" aria-label="Flood Fill difficulty">${Object.entries(FLOOD_DIFFICULTIES).map(([key,rule])=>`<option value="${key}" ${s.difficulty===key?'selected':''}>${rule.label}</option>`).join('')}</select><span class="quick-difficulty-note">Fewer moves is better</span></div>`;
      return `${header}${floodOpts}<div class="stats"><div class="stat"><span class="stat-label">MOVES</span><span class="stat-value" id="more-score"></span></div><div class="stat stat-best"><span class="stat-label">REMAINING</span><span class="stat-value" id="more-secondary"></span></div></div><div class="board-wrap"><div class="flood-board" id="flood-board" role="group" aria-label="Flood Fill board" style="--grid-size:${s.size}"></div><div class="board-overlay" id="more-overlay" hidden></div></div><div class="flood-palette" role="group" aria-label="Color picker">${FLOOD_COLORS.map((name,i)=>`<button type="button" class="flood-color" data-flood="${i}" aria-label="${name}, color ${i+1}"><span>${i+1}</span></button>`).join('')}</div><p class="quick-feedback" id="flood-feedback">Pick a color to flood from the top-left corner.</p><p class="quick-best" id="more-best"></p><p class="instructions">Pick a color. The flood spreads from the top-left corner.<br><kbd>1–6</kbd> choose color</p></section>`;
    }
    if(id==='nonograms') return `${header}${options(id,s)}<div class="stats"><div class="stat"><span class="stat-label">MOVES</span><span class="stat-value" id="more-score"></span></div><div class="stat stat-best"><span class="stat-label">SQUARES FILLED</span><span class="stat-value" id="more-secondary"></span></div></div><div class="board-wrap"><div class="nonogram-layout" style="--grid-size:${s.size}"><div class="nonogram-corner" aria-hidden="true">${icon('game')}</div><div id="nonogram-columns" class="nonogram-columns" aria-label="Column clues"></div><div id="nonogram-rows" class="nonogram-rows" aria-label="Row clues"></div><div id="nonogram-board" class="nonogram-board" role="group" aria-label="Nonogram picture grid"></div></div><div class="board-overlay" id="more-overlay" hidden></div></div><div class="quick-tools"><div class="mine-input-mode" role="group" aria-label="Square action">${btn('fill-mode','Fill','pencil','id="nono-fill" aria-pressed="true"')}${btn('cross-mode','Cross','close','id="nono-cross" aria-pressed="false"')}</div>${btn('undo','Undo','undo','id="more-undo"')}</div><p class="quick-feedback">Clues describe runs of filled squares.<br>Leave at least one space between each run.</p><p class="quick-best" id="more-best"></p><p class="instructions">Tap to fill. Right-click or use Cross to mark a gap.<br><kbd>Arrows</kbd> navigate · <kbd>Enter</kbd> fill · <kbd>X</kbd> cross</p></section>`;
    if(id==='codebreaker') return `${header}<div class="code-secret" id="code-secret" aria-label="Hidden sequence"></div><div class="code-rules">Six symbols · repeats allowed · ten guesses</div><div class="code-log" id="code-log" role="log" aria-label="Submitted guesses"></div><div class="board-wrap"><div class="code-input"><div class="code-draft" id="code-draft" role="group" aria-label="Your guess"></div><div class="code-palette">${CODE_COLORS.map((name,i)=>`<button type="button" class="code-color" data-color-choice="${i}" aria-label="${name}, color ${i+1}">${codePeg(i,icon)}<span>${i+1}</span></button>`).join('')}</div>${btn('submit','Check guess','check','id="code-submit"')}${btn('clear','Clear','erase','id="code-clear"')}</div><div class="board-overlay" id="more-overlay" hidden></div></div><p class="quick-feedback" id="code-feedback">Choose a slot, then a symbol.</p><p class="quick-best" id="more-best"></p><p class="instructions">Exact: correct symbol and position.<br>Close: correct symbol in another position.<br><kbd>1–6</kbd> choose · <kbd>← →</kbd> slots · <kbd>Enter</kbd> check</p></section>`;
    if(id==='sliding') return `${header}${options(id,s)}<div class="stats"><div class="stat"><span class="stat-label">MOVES</span><span class="stat-value" id="more-score"></span></div><div class="stat stat-best"><span class="stat-label">TILES IN PLACE</span><span class="stat-value" id="more-secondary"></span></div></div><div class="board-wrap"><div class="sliding-board" id="sliding-board" role="group" tabindex="0" aria-label="Sliding puzzle board. Arrow keys slide tiles in the indicated direction." style="--grid-size:${s.size}"></div><div class="board-overlay" id="more-overlay" hidden></div></div><div class="game-tools">${btn('undo','Undo','undo','id="more-undo"')}<span class="move-count">Arrange 1 to ${s.size**2-1}</span></div><p class="quick-best" id="more-best"></p><p class="instructions">Tap a tile beside the gap to slide it.<br><kbd>↑ ↓ ← →</kbd> slide tiles in that direction.<br>Finish with the gap in the bottom-right corner.</p></section>`;
    if(id==='wordle') {
      const KEYBOARD_ROWS=[['q','w','e','r','t','y','u','i','o','p'],['a','s','d','f','g','h','j','k','l'],['enter','z','x','c','v','b','n','m','back']];
      return `${header}<div class="wordle-rules">Guess a five-letter word · six tries</div><div class="board-wrap"><div class="wordle-board" id="wordle-board" role="group" tabindex="0" aria-label="Wordle guess board. Type letters, Enter to submit, Backspace to delete.">${Array.from({length:6},(_,r)=>`<div class="wordle-row">${Array.from({length:5},(_,c)=>`<span class="wordle-tile" data-row="${r}" data-col="${c}"></span>`).join('')}</div>`).join('')}</div><div class="board-overlay" id="more-overlay" hidden></div></div><div class="wordle-keyboard" id="wordle-keyboard" role="group" aria-label="On-screen keyboard">${KEYBOARD_ROWS.map(row=>`<div class="wordle-kb-row">${row.map(k=>k==='enter'?`<button type="button" class="wordle-key wide" data-wkey="enter" aria-label="Submit guess">${icon('check')}</button>`:k==='back'?`<button type="button" class="wordle-key wide" data-wkey="back" aria-label="Delete letter">${icon('undo')}</button>`:`<button type="button" class="wordle-key" data-wkey="${k}">${k}</button>`).join('')}</div>`).join('')}</div><p class="quick-feedback" id="wordle-feedback">Type a word and press Enter.</p><p class="quick-best" id="more-best"></p><p class="instructions">Type a five-letter word and press Enter to guess.<br><kbd>A–Z</kbd> type · <kbd>Enter</kbd> submit · <kbd>Backspace</kbd> delete</p></section>`;
    }
    return `${header}<div class="checkers-topline"><select id="connect-mode" aria-label="Connect Four opponent"><option value="computer" ${s.mode==='computer'?'selected':''}>Vs computer</option><option value="local" ${s.mode==='local'?'selected':''}>Two players</option></select><span id="connect-turn"></span></div><div class="connect-players"><span><i data-player="1"></i>${s.mode==='computer'?'You':'Coral'}</span><span><i data-player="-1"></i>${s.mode==='computer'?'Computer':'Mint'}</span></div><div class="board-wrap"><div class="connect-board" id="connect-board" role="group" aria-label="Connect Four board"></div><div class="board-overlay" id="more-overlay" hidden></div></div><div class="game-tools">${btn('undo','Undo','undo','id="more-undo"')}<span class="move-count" id="connect-count"></span></div><p class="instructions">Choose a column to drop your piece.<br>Connect four horizontally, vertically, or diagonally.<br><kbd>← →</kbd> choose column · <kbd>Enter</kbd> drop</p></section>`;
  }
  function finish(won,html) {
    const overlay=root.querySelector('#more-overlay');overlay.hidden=!html;
    if(html) overlay.innerHTML=`${won?celebration():''}<span class="overlay-icon">${icon(won?'spark':'game')}</span>${html}${btn('new','Play again','play')}`;
  }
  function best(s) {const value=s.best[s.difficulty];return `Personal best · ${value===null?'Set your first record':value+' moves'}`;}
  function updateNonogram() {
    const s=state(),{rows,columns}=nonogramClues(s.solution,s.size),board=root.querySelector('#nonogram-board');
    const focused=board.contains(document.activeElement),index=document.activeElement.dataset.nono??nonoCursor;
    const rowDone=row=>JSON.stringify(nonogramClue(s.cells.slice(row*s.size,(row+1)*s.size).map(n=>n===1?1:0)))===JSON.stringify(rows[row]);
    const colDone=col=>JSON.stringify(nonogramClue(Array.from({length:s.size},(_,row)=>s.cells[row*s.size+col]===1?1:0)))===JSON.stringify(columns[col]);
    root.querySelector('#nonogram-rows').innerHTML=rows.map((clue,i)=>`<div class="${rowDone(i)?'clue-done':''}" aria-label="Row ${i+1}: ${clue.join(', ')}">${clue.map(n=>`<span>${n}</span>`).join('')}</div>`).join('');
    root.querySelector('#nonogram-columns').innerHTML=columns.map((clue,i)=>`<div class="${colDone(i)?'clue-done':''}" aria-label="Column ${i+1}: ${clue.join(', ')}">${clue.map(n=>`<span>${n}</span>`).join('')}</div>`).join('');
    board.innerHTML=s.cells.map((n,i)=>`<button type="button" class="nono-cell ${n===1?'filled':n===-1?'crossed':''}" data-nono="${i}" tabindex="${i===Number(index??0)?0:-1}" aria-label="Row ${Math.floor(i/s.size)+1}, column ${i%s.size+1}: ${n===1?'filled':n===-1?'crossed':'unknown'}">${n===-1?icon('close'):''}</button>`).join('');
    root.querySelector('#more-score').textContent=s.moves;root.querySelector('#more-secondary').textContent=s.cells.filter(n=>n===1).length;
    root.querySelector('#more-undo').disabled=!s.history.length;root.querySelector('#more-best').textContent=best(s);
    root.querySelector('#nono-fill').setAttribute('aria-pressed',String(!crossMode));root.querySelector('#nono-cross').setAttribute('aria-pressed',String(crossMode));
    const complete=isNonogramComplete(s);board.inert=complete;finish(complete,complete?`<h2>Picture perfect.</h2><p>A hidden image, revealed in ${s.moves} moves.</p>`:'');
    if(focused&&!complete) board.querySelector(`[data-nono="${index}"]`)?.focus({preventScroll:true});
  }
  function updateCode() {
    const s=state(),focused=root.querySelector('#code-draft').contains(document.activeElement);
    root.querySelector('#code-secret').innerHTML=s.secret.map(n=>s.result?codePeg(n,icon):'<span class="secret-peg">?</span>').join('');
    const log=root.querySelector('#code-log'),previousRows=log.children.length;
    log.innerHTML=s.guesses.length?s.guesses.map((g,i)=>`<div class="code-guess"><span class="guess-number">${String(i+1).padStart(2,'0')}</span><div class="guess-pegs">${g.code.map(n=>codePeg(n,icon)).join('')}</div><div class="guess-result"><span class="feedback-dots" aria-hidden="true">${Array.from({length:4},(_,j)=>`<i class="${j<g.exact?'exact':j<g.exact+g.misplaced?'close':''}"></i>`).join('')}</span><span>${g.exact} exact · ${g.misplaced} close</span></div></div>`).join(''):'<div class="code-empty">Every guess brings you closer.</div>';
    if(s.guesses.length!==previousRows) log.scrollTop=log.scrollHeight;
    root.querySelector('#code-draft').innerHTML=s.draft.map((n,i)=>`<button type="button" class="code-slot ${i===cursor?'selected':''}" data-slot="${i}" aria-label="Slot ${i+1}: ${n===null?'empty':CODE_COLORS[n]}" aria-pressed="${i===cursor}">${codePeg(n,icon)}</button>`).join('');
    root.querySelector('#code-submit').disabled=!!s.result||s.draft.some(n=>n===null);root.querySelector('#code-clear').disabled=!!s.result||s.draft.every(n=>n===null);
    root.querySelector('#more-best').textContent=`Personal best · ${s.best===null?'Set your first record':s.best+' guesses'}`;
    root.querySelector('#code-feedback').textContent=s.result?'The sequence is revealed above.':`Guess ${s.guesses.length+1} of 10 · Choose a slot, then a symbol.`;
    finish(s.result==='won',s.result?`<h2>${s.result==='won'?'Code cracked.':'Mystery solved.'}</h2><p>${s.result==='won'?`You found the sequence in ${s.guesses.length} guesses.`:'The hidden sequence is revealed above. Try a fresh one.'}</p>`:'');
    root.querySelector('.code-input').inert=!!s.result;if(focused&&!s.result) focus();
  }
  function updateSliding() {
    const s=state(),board=root.querySelector('#sliding-board'),blank=s.board.indexOf(0);
    board.innerHTML=s.board.map((n,i)=>n?`<button type="button" class="sliding-tile ${n===i+1?'in-place':''}" data-slide="${i}" tabindex="-1" aria-label="Tile ${n}, row ${Math.floor(i/s.size)+1}, column ${i%s.size+1}"><span>${n}</span><i></i></button>`:'<span class="sliding-gap" aria-label="Empty space"></span>').join('');
    [...board.querySelectorAll('[data-slide]')].forEach(node=>{const i=Number(node.dataset.slide);node.classList.toggle('can-slide',Math.abs(Math.floor(i/s.size)-Math.floor(blank/s.size))+Math.abs(i%s.size-blank%s.size)===1);});
    root.querySelector('#more-score').textContent=s.moves;root.querySelector('#more-secondary').textContent=s.board.filter((n,i)=>n&&n===i+1).length+'/'+(s.board.length-1);
    root.querySelector('#more-best').textContent=best(s);root.querySelector('#more-undo').disabled=!s.history.length;
    const complete=isSlidingComplete(s);board.inert=complete;finish(complete,complete?`<h2>Everything in place.</h2><p>A little order, in ${s.moves} moves.</p>`:'');
  }
  function updateConnect() {
    const s=state(),board=root.querySelector('#connect-board'),focused=board.contains(document.activeElement),column=document.activeElement.dataset.connect??connectCursor;
    const winning=connectWinningCells(s.board);
    board.innerHTML=Array.from({length:7},(_,col)=>`<button type="button" class="connect-column" data-connect="${col}" aria-label="Drop in column ${col+1}" aria-describedby="connect-column-state-${col}" tabindex="${col===Number(column??connectColumns(s)[0]??0)?0:-1}" ${s.board[col]?'disabled':''}><span class="column-guide" aria-hidden="true">${col+1}</span><span class="sr-only" id="connect-column-state-${col}">From top: ${Array.from({length:6},(_,row)=>s.board[row*7+col]===1?'coral':s.board[row*7+col]===-1?'mint':'empty').join(', ')}.</span>${Array.from({length:6},(_,row)=>{const i=row*7+col;return `<span class="connect-hole${winning.includes(i)?' winning':''}"><i data-player="${s.board[i]}" data-disc="${i}"></i></span>`;}).join('')}</button>`).join('');
    root.querySelector('#connect-turn').textContent=s.result?'Round complete':s.mode==='computer'&&s.turn===-1?'Thinking…':(s.turn===1?s.mode==='computer'?'Your':'Coral':'Mint')+' turn';
    root.querySelector('#connect-count').textContent=s.moves+' pieces played';root.querySelector('#more-undo').disabled=!s.history.length;
    board.inert=!!s.result;const won=s.result!==null&&s.result!=='draw'&&(s.mode==='local'||s.result===1);
    finish(won,s.result&&!moving?`<h2>${s.result==='draw'?'A full board. A fair draw.':s.mode==='computer'?s.result===1?'Four together!':'Computer connects four.':(s.result===1?'Coral':'Mint')+' connects four!'}</h2><p>${s.moves} pieces played.</p>`:'');
    if(focused&&!s.result) board.querySelector(`[data-connect="${column}"]`)?.focus({preventScroll:true});
    if(s.mode==='computer'&&s.turn===-1&&!s.result&&!aiTimer&&!suspended&&!moving&&!document.hidden) aiTimer=setTimeout(()=>{aiTimer=null;if(mounted==='connect'&&!suspended) {const col=chooseConnectColumn(state());if(col!==null) void playConnect(col);}},350);
  }
  function runWatch() {
    clearTimeout(watchTimer);watchTimer=null;const s=state();if(!s||s.phase!=='watch'||s.result)return;
    const token=++watchToken;let step=0;
    root.querySelectorAll('.simon-pad').forEach(p=>p.classList.remove('lit'));
    function next() {
      if(token!==watchToken||mounted!=='simon')return;
      if(step>0) root.querySelector(`[data-pad="${s.sequence[step-1]}"]`)?.classList.remove('lit');
      if(step>=s.round){watchTimer=setTimeout(()=>{if(token!==watchToken||mounted!=='simon')return;set(startPlayPhase(state()));},350);return;}
      const pad=root.querySelector(`[data-pad="${s.sequence[step]}"]`);pad?.classList.add('lit');step++;
      watchTimer=setTimeout(next,600);
    }
    watchTimer=setTimeout(next,400);
  }
  function updateSimon() {
    const s=state();
    root.querySelector('#more-score').textContent=s.round;root.querySelector('#more-secondary').textContent=s.best===null?'—':s.best;
    root.querySelector('#more-best').textContent=`Personal best · ${s.best===null?'Set your first record':'Round '+s.best}`;
    root.querySelectorAll('.simon-pad').forEach(p=>{p.disabled=s.phase!=='play'||!!s.result;});
    root.querySelector('#simon-feedback').textContent=s.result?'Game over.':s.phase==='watch'?'Watch the pattern…':'Your turn — repeat the sequence.';
    const overlay=root.querySelector('#more-overlay');
    if(s.phase==='watch'&&!s.result&&!watchTimer&&!suspended) runWatch();
    finish(false,s.result?`<h2>Round ${s.round} — ${s.round>3?'a solid run':'better luck next time'}.</h2><p>${s.moves} tap${s.moves!==1?'s':''} total.</p>`:'');
  }
  function updateFlood() {
    const s=state(),region=s.result?new Set():floodRegion(s.board,s.size),board=root.querySelector('#flood-board');
    board.innerHTML=s.board.map((c,i)=>`<span class="flood-cell${region.has(i)?' flooded':''}" data-color="${c}" aria-label="Row ${Math.floor(i/s.size)+1}, column ${i%s.size+1}: ${FLOOD_COLORS[c]}"></span>`).join('');
    root.querySelector('#more-score').textContent=s.moves;root.querySelector('#more-secondary').textContent=s.maxMoves-s.moves;
    const bestVal=s.best[s.difficulty];root.querySelector('#more-best').textContent=`Personal best · ${bestVal===null?'Set your first record':bestVal+' moves'}`;
    root.querySelectorAll('.flood-color').forEach(b=>{const ci=Number(b.dataset.flood);b.classList.toggle('current',ci===s.board[0]);b.disabled=!!s.result||ci===s.board[0];});
    root.querySelector('#flood-feedback').textContent=s.result?s.result==='won'?'Board cleared!':'Out of moves.':`${s.maxMoves-s.moves} move${s.maxMoves-s.moves!==1?'s':''} remaining.`;
    board.inert=!!s.result;root.querySelector('.flood-palette').inert=!!s.result;
    finish(s.result==='won',s.result?`<h2>${s.result==='won'?'Board cleared!':'Flooded out.'}</h2><p>${s.result==='won'?`You filled the board in ${s.moves} moves.`:`Couldn’t fill the board in ${s.maxMoves} moves.`}</p>`:'');
  }
  function updateWordle() {
    const s=state(),board=root.querySelector('#wordle-board');
    // Fill the 6×5 grid with guesses, then current draft, then empties
    for(let r=0;r<6;r++){
      for(let c=0;c<5;c++){
        const tile=board.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if(r<s.guesses.length){const g=s.guesses[r];tile.textContent=g.word[c];tile.className=`wordle-tile ${g.feedback[c]}`;}
        else if(r===s.guesses.length&&c<s.draft.length){tile.textContent=s.draft[c];tile.className='wordle-tile filled';}
        else{tile.textContent='';tile.className='wordle-tile';}
      }
    }
    // Update keyboard highlights
    root.querySelectorAll('[data-wkey]').forEach(key=>{
      const letter=key.dataset.wkey;
      if(letter.length===1&&s.keyboard[letter]) key.setAttribute('data-state',s.keyboard[letter]);
      else key.removeAttribute('data-state');
    });
    root.querySelector('#wordle-feedback').textContent=s.result?s.result==='won'?`You found it in ${s.guesses.length} guess${s.guesses.length>1?'es':''}!`:`The word was ${s.target.toUpperCase()}.`:`Guess ${s.guesses.length+1} of 6`;
    root.querySelector('#more-best').textContent=`Personal best · ${s.best===null?'Set your first record':s.best+' guess'+(s.best>1?'es':'')}`;
    root.querySelector('#wordle-keyboard').inert=!!s.result;
    finish(s.result==='won',s.result?`<h2>${s.result==='won'?'Well guessed!':'Better luck next time.'}</h2><p>${s.result==='won'?`You found the word in ${s.guesses.length} guess${s.guesses.length>1?'es':''}.`:`The word was <strong>${s.target.toUpperCase()}</strong>.`}</p>`:'');
  }
  function update() {if(!root)return;if(mounted==='nonograms')updateNonogram();else if(mounted==='codebreaker')updateCode();else if(mounted==='sliding')updateSliding();else if(mounted==='wordle')updateWordle();else if(mounted==='simon')updateSimon();else if(mounted==='flood')updateFlood();else updateConnect();}
  function set(next) {if(next===state())return false;getSave().games[mounted]=next;persist();update();return true;}
  function cancelMotion() {motion++;moving=false;animations.forEach(a=>a.cancel());animations=[];}
  function markSquare(index,mark){if(set(markNonogram(state(),index,mark))){void sound.play(isNonogramComplete(state())?'win':'tick');announce(isNonogramComplete(state())?'Nonogram picture complete.':`Square ${index+1} ${state().cells[index]===1?'filled':state().cells[index]===-1?'crossed':'cleared'}.`);}}
  async function playSlide(index) {
    if(moving||suspended)return;const before=state(),next=slideTile(before,index);if(next===before)return;
    const source=root.querySelector(`[data-slide="${index}"]`),destination=root.querySelector('.sliding-gap'),token=++motion;
    getSave().games.sliding=next;persist();moving=true;
    if(source&&destination&&!matchMedia('(prefers-reduced-motion: reduce)').matches) {const a=source.getBoundingClientRect(),b=destination.getBoundingClientRect();source.style.zIndex='2';animations=[source.animate([{transform:'translate(0,0)'},{transform:`translate(${b.x-a.x}px,${b.y-a.y}px)`}],{duration:150,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'})];await Promise.all(animations.map(a=>a.finished.catch(()=>{})));}
    if(token!==motion||mounted!=='sliding')return;moving=false;animations=[];update();void sound.play(isSlidingComplete(next)?'win':'tick');announce(isSlidingComplete(next)?'Sliding puzzle complete.':`Tile ${before.board[index]} moved. ${next.moves} moves.`);focus();
  }
  async function playConnect(column) {
    if(moving||suspended)return;const before=state(),next=dropConnect(before,column);if(next===before)return;
    const index=next.board.findIndex((n,i)=>n!==before.board[i]),token=++motion;moving=true;getSave().games.connect=next;persist();update();
    const disc=root.querySelector(`[data-disc="${index}"]`);
    if(disc&&!matchMedia('(prefers-reduced-motion: reduce)').matches) {const distance=(Math.floor(index/7)+1)*(disc.getBoundingClientRect().height+5);animations=[disc.animate([{transform:`translateY(${-distance}px)`},{transform:'translateY(0)'}],{duration:300,easing:'cubic-bezier(.4,0,.75,.7)'})];await Promise.all(animations.map(a=>a.finished.catch(()=>{})));}
    if(token!==motion||mounted!=='connect')return;moving=false;animations=[];update();void sound.play(next.result?'win':'tick');announce(next.result?'Connect Four round complete.':`Piece dropped in column ${column+1}.`);
  }
  function click(e) {
    const target=e.target.closest('button');if(!target||target.disabled||suspended)return;
    if(target.dataset.nono!==undefined){nonoCursor=Number(target.dataset.nono);markSquare(Number(target.dataset.nono),crossMode?-1:1);return;}
    if(target.dataset.slot!==undefined){cursor=Number(target.dataset.slot);update();focus();return;}
    if(target.dataset.colorChoice!==undefined){set(enterCode(state(),cursor,Number(target.dataset.colorChoice)));cursor=(cursor+1)%4;update();focus();void sound.play('tick');return;}
    if(target.dataset.slide!==undefined){void playSlide(Number(target.dataset.slide));return;}
    if(target.dataset.connect!==undefined){connectCursor=Number(target.dataset.connect);if(state().mode!=='computer'||state().turn===1)void playConnect(Number(target.dataset.connect));return;}
    if(target.dataset.wkey!==undefined){
      const key=target.dataset.wkey,s=state();if(s.result)return;
      if(key==='enter'){const next=submitGuess(s);if(set(next)){void sound.play(next.result==='won'?'win':next.result==='lost'?'error':'merge');announce(next.result==='won'?'Correct!':next.result==='lost'?`The word was ${next.target}.`:'Guess submitted.');}}
      else if(key==='back'){set(deleteLetter(s));}
      else{set(enterLetter(s,key));void sound.play('tick');}
      return;
    }
    if(target.dataset.pad!==undefined){const s=state();if(s.phase==='play'&&!s.result){if(set(tapSimon(s,Number(target.dataset.pad)))){const ns=state();void sound.play(ns.result?'error':'tick');announce(ns.result?`Wrong pad. Game over at round ${ns.round}.`:`Pad ${Number(target.dataset.pad)+1}.`);}}return;}
    if(target.dataset.flood!==undefined){const s=state();if(!s.result){if(set(pickFlood(s,Number(target.dataset.flood)))){const ns=state();void sound.play(ns.result==='won'?'win':ns.result==='lost'?'error':'tick');announce(ns.result==='won'?'Board cleared!':ns.result==='lost'?'Out of moves.':`Picked ${FLOOD_COLORS[Number(target.dataset.flood)]}.`);}}return;}
    const action=target.dataset.more;
    if(action==='new')onNew(mounted);
    else if(action==='fill-mode'||action==='cross-mode'){crossMode=action==='cross-mode';update();focus();}
    else if(action==='undo'){clearTimeout(aiTimer);aiTimer=null;cancelMotion();set(mounted==='nonograms'?undoNonogram(state()):mounted==='sliding'?undoSliding(state()):undoConnect(state()));focus();}
    else if(action==='submit'){if(set(submitCode(state()))){cursor=0;update();void sound.play(state().result==='won'?'win':state().result==='lost'?'error':'merge');const g=state().guesses.at(-1);announce(`${g.exact} exact, ${g.misplaced} close.`);focus();}}
    else if(action==='clear'){const before=state();if(before.draft.some(n=>n!==null))set({...before,draft:Array(4).fill(null)});cursor=0;update();focus();}
  }
  function keydown(e, target = e.target) {
    if(suspended||e.defaultPrevented||e.isComposing||e.altKey||e.ctrlKey||e.metaKey||target.closest?.('input,textarea,select')||target.isContentEditable||document.getElementById('confirm-dialog').open)return;
    if(mounted==='codebreaker'&&target.closest('.code-input')) {
      if(/^[1-6]$/.test(e.key)){e.preventDefault();if(!e.repeat){set(enterCode(state(),cursor,Number(e.key)-1));cursor=(cursor+1)%4;update();focus();}}
      else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();cursor=(cursor+(e.key==='ArrowLeft'?3:1))%4;update();focus();}
      else if(e.key==='Enter'){e.preventDefault();root.querySelector('#code-submit').click();}
      else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();set(enterCode(state(),cursor,null));focus();}
    } else if(mounted==='sliding'&&target.closest('#sliding-board')) {
      const s=state(),blank=s.board.indexOf(0);let tileIndex=blank;
      // Choose the tile that will slide into the gap in the arrow's direction.
      if(e.key==='ArrowLeft'&&blank%s.size<s.size-1)tileIndex++;
      if(e.key==='ArrowRight'&&blank%s.size)tileIndex--;
      if(e.key==='ArrowUp'&&blank<s.size*(s.size-1))tileIndex+=s.size;
      if(e.key==='ArrowDown'&&blank>=s.size)tileIndex-=s.size;
      if(e.key.startsWith('Arrow')){e.preventDefault();if(tileIndex!==blank)void playSlide(tileIndex);}
    } else if(mounted==='nonograms'&&target.dataset.nono!==undefined) {
      const index=Number(target.dataset.nono),size=state().size;let next=index;
      if(e.key==='ArrowLeft'&&index%size)next--;if(e.key==='ArrowRight'&&index%size<size-1)next++;if(e.key==='ArrowUp'&&index>=size)next-=size;if(e.key==='ArrowDown'&&index<size*(size-1))next+=size;
      if(e.key.startsWith('Arrow')){e.preventDefault();nonoCursor=next;root.querySelectorAll('[data-nono]').forEach(node=>{node.tabIndex=Number(node.dataset.nono)===next?0:-1;});root.querySelector(`[data-nono="${next}"]`)?.focus({preventScroll:true});}
      else if(e.key.toLowerCase()==='x'){e.preventDefault();if(!e.repeat)markSquare(index,-1);}
      else if(e.key==='Enter'){e.preventDefault();if(!e.repeat)markSquare(index,1);}
    } else if(mounted==='connect'&&target.dataset.connect!==undefined&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();let col=Number(target.dataset.connect),step=e.key==='ArrowLeft'?-1:1;for(let i=0;i<7;i++){col=(col+step+7)%7;const node=root.querySelector(`[data-connect="${col}"]`);if(!node.disabled){connectCursor=col;root.querySelectorAll('[data-connect]').forEach(n=>{n.tabIndex=n===node?0:-1;});node.focus({preventScroll:true});break;}}}
    else if(mounted==='wordle') {
      const s=state();if(s.result)return;
      if(/^[a-zA-Z]$/.test(e.key)&&!e.repeat){e.preventDefault();set(enterLetter(s,e.key.toLowerCase()));void sound.play('tick');}
      else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();set(deleteLetter(s));}
      else if(e.key==='Enter'){e.preventDefault();const next=submitGuess(s);if(set(next)){void sound.play(next.result==='won'?'win':next.result==='lost'?'error':'merge');announce(next.result==='won'?'Correct!':next.result==='lost'?`The word was ${next.target}.`:'Guess submitted.');}}
    }
    else if(mounted==='simon') {
      if(/^[1-4]$/.test(e.key)&&!e.repeat){e.preventDefault();const s=state();if(s.phase==='play'&&!s.result){if(set(tapSimon(s,Number(e.key)-1))){const ns=state();void sound.play(ns.result?'error':'tick');announce(ns.result?`Wrong pad. Game over at round ${ns.round}.`:`Pad ${e.key}.`);}}}
    }
    else if(mounted==='flood') {
      if(/^[1-6]$/.test(e.key)&&!e.repeat){e.preventDefault();const s=state();if(!s.result){if(set(pickFlood(s,Number(e.key)-1))){const ns=state();void sound.play(ns.result==='won'?'win':ns.result==='lost'?'error':'tick');announce(ns.result==='won'?'Board cleared!':ns.result==='lost'?'Out of moves.':`Picked ${FLOOD_COLORS[Number(e.key)-1]}.`);}}}
    }
  }
  function focus() {
    if(!root)return;const overlay=root.querySelector('#more-overlay');
    const node=!overlay.hidden?overlay.querySelector('button'):mounted==='codebreaker'?root.querySelector(`[data-slot="${cursor}"]`):mounted==='sliding'?root.querySelector('#sliding-board'):mounted==='wordle'?root.querySelector('#wordle-board'):mounted==='simon'?root.querySelector('[data-pad="0"]'):mounted==='flood'?root.querySelector('.flood-color:not(:disabled)'):root.querySelector('[tabindex="0"]');node?.focus({preventScroll:true});
  }
  function mount(id) {
    mounted=id;root=document.getElementById('more-game');crossMode=false;cursor=id==='codebreaker'?Math.max(0,state().draft.findIndex(n=>n===null)):0;suspended=false;
    const change=e=>{if(e.target.id==='more-difficulty'||e.target.id==='connect-mode'){const value=e.target.value;e.target.value=mounted==='flood'?state().difficulty:state().difficulty??state().mode;onNew(id,value);}};
    const context=e=>{const cell=e.target.closest('[data-nono]');if(id==='nonograms'&&cell){e.preventDefault();markSquare(Number(cell.dataset.nono),-1);}};
    const inactive=()=>{clearTimeout(aiTimer);aiTimer=null;},active=()=>{if(mounted==='connect'&&!document.hidden)update();};
    const areas={nonograms:'#nonogram-board',codebreaker:'#code-draft',sliding:'#sliding-board',connect:'#connect-board',wordle:'#wordle-board,#wordle-keyboard',simon:'.simon-board',flood:'.flood-palette'};
    const unbindKeyboard=bindGameKeyboard({
      area:areas[id],focus,onKey:keydown,blocked:()=>suspended||document.getElementById('confirm-dialog').open,
      keys:e=>{
        if(['Enter',' '].includes(e.key))return true;
        if(mounted==='wordle')return /^[a-z]$/i.test(e.key)||['Backspace','Delete'].includes(e.key);
        if(mounted==='simon')return /^[1-4]$/.test(e.key);
        if(mounted==='flood')return /^[1-6]$/.test(e.key);
        if(mounted==='codebreaker')return /^[1-6]$/.test(e.key)||['ArrowLeft','ArrowRight','Backspace','Delete'].includes(e.key);
        return e.key.startsWith('Arrow')||(mounted==='nonograms'&&e.key.toLowerCase()==='x');
      }
    });
    const pointerdown=e=>{if(id==='wordle'&&!suspended&&e.isPrimary&&e.button===0&&e.target.closest('#wordle-board'))focus();};
    const focusin=e=>{if(e.target.dataset.nono!==undefined)nonoCursor=Number(e.target.dataset.nono);if(e.target.dataset.connect!==undefined)connectCursor=Number(e.target.dataset.connect);};
    nonoCursor=0;connectCursor=0;
    root.addEventListener('click',click);root.addEventListener('focus',focusin,true);root.addEventListener('pointerdown',pointerdown);root.addEventListener('change',change);root.addEventListener('contextmenu',context);
    window.addEventListener('blur',inactive);window.addEventListener('focus',active);
    const visibility=()=>document.hidden?inactive():active();document.addEventListener('visibilitychange',visibility);const element=root;
    cleanup.push(()=>{element.removeEventListener('click',click);unbindKeyboard();element.removeEventListener('focus',focusin,true);element.removeEventListener('pointerdown',pointerdown);element.removeEventListener('change',change);element.removeEventListener('contextmenu',context);window.removeEventListener('blur',inactive);window.removeEventListener('focus',active);document.removeEventListener('visibilitychange',visibility);});update();
  }
  function dispose(){cancelMotion();clearTimeout(aiTimer);aiTimer=null;clearTimeout(watchTimer);watchTimer=null;watchToken++;cleanup.forEach(fn=>fn());cleanup=[];mounted=null;root=null;}
  function suspend(){if(!mounted)return;suspended=true;clearTimeout(aiTimer);aiTimer=null;clearTimeout(watchTimer);watchTimer=null;watchToken++;cancelMotion();update();}
  function resume(){if(!mounted)return;suspended=false;update();}
  return {render,mount,dispose,focus,suspend,resume,isMounted:()=>mounted!==null};
}
