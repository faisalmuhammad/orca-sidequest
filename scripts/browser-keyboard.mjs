// Physical keyboard regression checks for every game in Orca's embedded browser.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { emptySave, SAVE_KEY } from '../panel/storage.mjs';
import { create2048 } from '../panel/games/2048.mjs';
import { createSudoku } from '../panel/games/sudoku.mjs';
import { createCheckers, checkersMoves } from '../panel/games/checkers.mjs';
import { createBlocks } from '../panel/games/blocks.mjs';
import { createMemory } from '../panel/games/memory.mjs';
import { createMinesweeper } from '../panel/games/minesweeper.mjs';
import { createLights } from '../panel/games/lights.mjs';
import { createNonogram } from '../panel/games/nonograms.mjs';
import { createCodebreaker } from '../panel/games/codebreaker.mjs';
import { createSliding, isValidSliding } from '../panel/games/sliding.mjs';
import { createConnect } from '../panel/games/connect.mjs';
import { createSokoban } from '../panel/games/sokoban.mjs';
import { createWordle } from '../panel/games/wordle.mjs';
import { createSimon } from '../panel/games/simon.mjs';
import { createFlood } from '../panel/games/flood.mjs';
const rng = seed => () => { seed=(1664525*seed+1013904223)>>>0;return seed/2**32; };

export async function runKeyboardSmoke({game=null}={}) {
  const gameIds=['2048','sudoku','checkers','blocks','memory','minesweeper','lights','nonograms','codebreaker','sliding','connect','sokoban','wordle','simon','flood'];
  assert.ok(game===null||gameIds.includes(game),'Unknown game: '+game);
  const run=promisify(execFile),cli=process.env.ORCA_CLI_COMMAND??'orca';
  const url='http://127.0.0.1:'+(process.env.SIDEQUEST_PREVIEW_PORT??4318)+'/';
  const journal=JSON.stringify(SAVE_KEY),output=new URL('../.orca/shots/',import.meta.url);
  await mkdir(output,{recursive:true});
  async function command(...args) {
    const {stdout}=await run(cli,[...args,'--json'],{maxBuffer:2**20,timeout:60000});
    const result=JSON.parse(stdout);if(!result.ok)throw new Error(JSON.stringify(result.error));
    assert.ok(!result.result?.effects?.consoleErrors?.length,JSON.stringify(result.result?.effects?.consoleErrors));
    return result.result;
  }
  const page=(await command('tab','create','--url',url)).browserPageId;
  const act=(...args)=>command(...args,'--page',page);
  async function evaluate(expression) {const result=await act('eval','--expression','JSON.stringify('+expression+')');return typeof result.result==='string'?JSON.parse(result.result):result.result;}
  async function control(role,name,action,...args) {
    const refs=(await act('snapshot','--interactive')).refs;
    const ref=Object.entries(refs).find(([,node])=>node.role===role&&node.name?.toLowerCase()===name.toLowerCase())?.[0];
    assert.ok(ref,'Missing '+role+': '+name);await act(action,'--element','@'+ref,...args);
  }
  const key=value=>act('keypress','--key',value);
  const click=name=>control('button',name,'click');
  const focus=name=>control('button',name,'focus');
  const select=id=>control('combobox','Switch game','select','--value',id);
  const read=id=>evaluate('JSON.parse(localStorage.getItem('+journal+')).games['+JSON.stringify(id)+']');
  const cursor=attribute=>evaluate('document.activeElement.dataset['+JSON.stringify(attribute)+']');
  const header=()=>evaluate('(() => {document.getElementById("sound-button").focus();return true;})()');
  async function seed(id,s) {
    const save=emptySave();save.activeGame=id;save.games[id]=s;
    const raw=JSON.stringify(JSON.stringify(save));
    await evaluate('(() => {const put=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){return put.call(this,key,key==='+journal+'?'+raw+':value);};localStorage.setItem('+journal+','+raw+');return true;})()');
    await act('reload');await act('viewport','--width','320','--height','860');await act('wait','--selector','#app[aria-busy=false]');
  }
  const fixtures={
    '2048':{...create2048(),board:[2,2,...Array(14).fill(0)]},
    sudoku:createSudoku('easy',rng(7)),checkers:createCheckers('local'),blocks:createBlocks(0,rng(9)),memory:createMemory(null,rng(3)),
    minesweeper:createMinesweeper(null,'quick'),lights:createLights(null,'classic',rng(3)),nonograms:createNonogram(null,'quick',rng(3)),
    codebreaker:{...createCodebreaker(),secret:[5,5,5,5]},sliding:{...createSliding(),board:[1,2,3,4,5,6,0,7,8],initial:[1,2,3,4,5,6,0,7,8]},
    connect:createConnect(null,'local'),sokoban:createSokoban(),wordle:createWordle(null,undefined,()=>0),
    simon:{...createSimon(null,undefined,()=>0),round:3,phase:'play'},flood:createFlood(null,'quick',rng(8))
  };
  const checks={
    async '2048'(){
      await key('ArrowLeft');assert.equal((await read('2048')).score,4);assert.equal((await read('2048')).moves,1);
      await header();await key('Control+z');assert.equal((await read('2048')).moves,0);
      await key('Shift+d');assert.equal((await read('2048')).moves,1);
      await key('ArrowDown');assert.equal((await read('2048')).moves,2);
    },
    async sudoku(){
      const index=fixtures.sudoku.values.findIndex(v=>!v);
      await key('n');assert.equal(await evaluate('document.getElementById("pencil-button").getAttribute("aria-pressed")'),'true');
      await key('1');assert.equal((await read('sudoku')).notes[index],2);
      await header();await key('n');await key('2');assert.equal((await read('sudoku')).values[index],2);
      await key('Backspace');assert.equal((await read('sudoku')).values[index],0);
      await key('Control+z');assert.equal((await read('sudoku')).values[index],2);
      await header();await key('ArrowRight');assert.equal(Number(await cursor('cell')),index%9===8?index:index+1);
    },
    async checkers(){
      const marked=selector=>evaluate('Array.from(document.querySelectorAll('+JSON.stringify(selector)+'),node=>Number(node.dataset.square))');
      async function highlights(s) {
        const moves=checkersMoves(s),sources=[...new Set(moves.map(m=>m.from))].sort((a,b)=>a-b);
        assert.deepEqual(await marked('.checker-square.movable'),sources,'All legal pieces must be highlighted before selection');
        assert.deepEqual(await marked('.checker-square.capture-ready'),moves.some(m=>m.capture!==null)?sources:[],'Only mandatory captures get capture rings');
        assert.equal(await evaluate('Array.from(document.querySelectorAll(".checker-square:not(.movable) .checker-piece")).every(piece=>getComputedStyle(piece,"::after").content==="none")'),true,'Immovable pieces must not have rings');
      }
      await highlights(fixtures.checkers);assert.deepEqual(await marked('.checker-square.selected'),[]);assert.deepEqual(await marked('.checker-square.legal'),[]);
      assert.notEqual(await evaluate('getComputedStyle(document.querySelector(".movable .checker-piece"),"::after").content'),'none','Playable pieces must have a visible ring');
      await key('Enter');assert.equal(await evaluate('document.querySelector(".checker-square.selected").dataset.square'),'40');
      await header();await key('ArrowUp');assert.equal(await cursor('square'),'32');await key('ArrowRight');assert.equal(await cursor('square'),'33');
      await key('Enter');await act('wait','--selector','#checkers-board[aria-busy=false]');assert.equal((await read('checkers')).moves,1);
      await highlights(await read('checkers'));await header();await key('ArrowLeft');assert.equal(await cursor('square'),'32');

      const capture={...createCheckers('local'),board:Array.from({length:64},(_,i)=>({42:1,33:-1,17:-1,5:-1,46:1})[i]??0)};
      await seed('checkers',capture);await highlights(capture);assert.deepEqual(await marked('.checker-square.movable'),[42]);
      if(game==='checkers'){const shot=await act('screenshot');await copyFile(shot.path,new URL('checkers-capture-hints.png',output));}
      await click('Row 6, column 7: coral piece');assert.deepEqual(await marked('.checker-square.selected'),[],'A blocked piece cannot be selected');
      await click('Row 6, column 3: coral piece, can move');assert.deepEqual(await marked('.checker-square.legal'),[24]);
      await click('Row 4, column 1: legal destination');await act('wait','--text','Keep jumping');
      await highlights(await read('checkers'));assert.deepEqual(await marked('.checker-square.movable'),[24]);assert.deepEqual(await marked('.checker-square.legal'),[10]);
      await click('Row 2, column 3: legal destination');await act('wait','--selector','#checkers-board[aria-busy=false]');await highlights(await read('checkers'));
      await click('Undo');await highlights(capture);assert.deepEqual((await read('checkers')).board,capture.board);

      const kings={...createCheckers('local'),board:Array.from({length:64},(_,i)=>({26:2,37:-2})[i]??0)};
      await seed('checkers',kings);await highlights(kings);assert.equal(await evaluate('document.querySelectorAll(".movable .checker-piece.king").length'),1);
      await seed('checkers',{...kings,turn:-1});await highlights({...kings,turn:-1});assert.deepEqual(await marked('.checker-square.movable'),[37]);
      await seed('checkers',{...kings,result:1});assert.deepEqual(await marked('.checker-square.movable,.checker-square.legal,.checker-square.selected'),[],'Finished rounds have no move hints');

      await seed('checkers',createCheckers());
      // Delay only the computer's move so the thinking state can be inspected reliably.
      await evaluate('(() => {const timer=window.setTimeout;window.setTimeout=(fn,ms,...args)=>timer(fn,ms===280?10000:ms,...args);return true;})()');
      await click('Row 6, column 1: coral piece, can move');await click('Row 5, column 2: legal destination');await act('wait','--text','Thinking…');
      assert.deepEqual(await marked('.checker-square.movable,.checker-square.legal,.checker-square.selected'),[],'Computer turns must not suggest moves to the player');
      await seed('checkers',fixtures.checkers);
      if(game==='checkers')for(const [theme,width] of [['light',320],['dark',240]]) {
        await act('viewport','--width',String(width),'--height','860');
        await evaluate('(() => {document.documentElement.className='+JSON.stringify(theme)+';return true;})()');
        assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Move hints must fit a narrow sidebar');
        const shot=await act('screenshot');await copyFile(shot.path,new URL('checkers-move-hints-'+theme+'.png',output));
      }
    },
    async blocks(){
      await key('p');assert.equal((await read('blocks')).paused,false);
      await header();await key('c');assert.equal((await read('blocks')).holdUsed,true);
      const x=(await read('blocks')).active.x;await key('ArrowLeft');assert.equal((await read('blocks')).active.x,x-1);
      await key('ArrowRight');assert.equal((await read('blocks')).active.x,x);
      const rotation=(await read('blocks')).active.rotation;await key('x');await key('z');assert.equal((await read('blocks')).active.rotation,rotation);
      await key('Space');assert.equal((await read('blocks')).pieces,1);await header();await key('p');assert.equal((await read('blocks')).paused,true);
    },
    async memory(){
      await key('Enter');assert.equal((await read('memory')).phase,'study');await act('wait','--text','Choose a card.');
      await key('ArrowRight');assert.equal(await cursor('card'),'1');await header();await key('ArrowDown');assert.equal(await cursor('card'),'5');
      await key('Enter');assert.deepEqual((await read('memory')).open,[5]);
      const s=await read('memory'),match=s.cards.findIndex((v,i)=>i!==5&&v===s.cards[5]);
      let current=5;while(Math.floor(current/4)!==Math.floor(match/4)){const down=current<match;await key(down?'ArrowDown':'ArrowUp');current+=down?4:-4;}
      while(current!==match){const right=current<match;await key(right?'ArrowRight':'ArrowLeft');current+=right?1:-1;}
      await key('Space');assert.equal((await read('memory')).matched.length,2);
    },
    async minesweeper(){
      await key('f');assert.equal((await read('minesweeper')).flags[0],true);
      await header();await key('ArrowRight');assert.equal(await cursor('quickCell'),'1');await key('f');assert.equal((await read('minesweeper')).flags[1],true);
      await key('f');await key('Enter');assert.equal((await read('minesweeper')).revealed[1],true);assert.notEqual((await read('minesweeper')).result,'lost');
      await header();await key('ArrowDown');assert.equal(await cursor('quickCell'),'7');
    },
    async lights(){
      await key('ArrowRight');assert.equal(await cursor('quickCell'),'1');await key('Enter');assert.equal((await read('lights')).moves,1);
      await header();await key('ArrowDown');assert.equal(await cursor('quickCell'),'6');await key('Space');assert.equal((await read('lights')).moves,2);
      await focus('Undo');await key('Enter');assert.equal((await read('lights')).moves,1);
    },
    async nonograms(){
      await key('ArrowRight');assert.equal(await cursor('nono'),'1');await key('x');assert.equal((await read('nonograms')).cells[1],-1);
      await header();await key('ArrowDown');assert.equal(await cursor('nono'),'6');await key('Enter');assert.equal((await read('nonograms')).cells[6],1);
      await key('Space');assert.equal((await read('nonograms')).cells[6],0);await focus('Undo');await key('Enter');assert.equal((await read('nonograms')).cells[6],1);
    },
    async codebreaker(){
      await key('1');assert.equal((await read('codebreaker')).draft[0],0);await header();await key('2');assert.equal((await read('codebreaker')).draft[1],1);
      await key('ArrowLeft');await key('Delete');assert.equal((await read('codebreaker')).draft[1],null);
      for(const digit of ['2','3','4'])await key(digit);await key('Enter');assert.deepEqual((await read('codebreaker')).guesses[0].code,[0,1,2,3]);
      await key('6');await key('ArrowLeft');await key('Backspace');assert.equal((await read('codebreaker')).draft[0],null);
    },
    async sliding(){
      function fixture(difficulty,blank) {
        const s=createSliding(null,difficulty,rng(3)),size=s.size;
        let current={...s,board:Array.from({length:size**2},(_,i)=>(i+1)%(size**2))};
        // Walk backwards from the goal to obtain a solvable board at the requested gap.
        let gap=current.board.length-1;
        while(gap%size!==blank%size){[current.board[gap],current.board[gap-1]]=[current.board[gap-1],current.board[gap]];gap--;}
        while(gap!==blank){[current.board[gap],current.board[gap-size]]=[current.board[gap-size],current.board[gap]];gap-=size;}
        current={...current,initial:[...current.board]};assert.ok(isValidSliding(current));return current;
      }
      for(const difficulty of ['quick','classic']) {
        const size=difficulty==='quick'?3:4,center=fixture(difficulty,size+1),blank=center.board.indexOf(0);
        for(const [arrow,index] of [['ArrowLeft',blank+1],['ArrowRight',blank-1],['ArrowUp',blank+size],['ArrowDown',blank-size]]) {
          await seed('sliding',center);await header();await key(arrow);
          const expected=[...center.board];[expected[blank],expected[index]]=[expected[index],expected[blank]];
          const moved=await read('sliding');assert.deepEqual(moved.board,expected,difficulty+' '+arrow+' tile direction');
          assert.equal(moved.moves,1);assert.ok(isValidSliding(moved));
          await act('wait','--text','Tile '+center.board[index]+' moved. 1 moves.');
          await focus('Undo');await key('Enter');assert.deepEqual((await read('sliding')).board,center.board);
        }
        for(const [gap,arrows] of [[0,['ArrowRight','ArrowDown']],[size-1,['ArrowLeft']],[(size-1)*size,['ArrowUp']]]) {
          const edge=fixture(difficulty,gap);await seed('sliding',edge);
          for(const arrow of arrows){await header();await key(arrow);assert.deepEqual(await read('sliding'),edge,difficulty+' '+arrow+' must stay at the edge');}
        }
      }
      await seed('sliding',fixtures.sliding);await key('ArrowLeft');
      assert.deepEqual((await read('sliding')).board,[1,2,3,4,5,6,7,0,8]);
      await act('wait','--text','Tile 7 moved. 1 moves.');await header();await key('ArrowLeft');
      await act('wait','--text','Everything in place.');
      assert.deepEqual((await read('sliding')).board,[1,2,3,4,5,6,7,8,0]);assert.equal((await read('sliding')).moves,2);
      assert.equal(await evaluate('document.getElementById("more-overlay").hidden'),false);await focus('Undo');await key('Enter');
      assert.deepEqual((await read('sliding')).board,[1,2,3,4,5,6,7,0,8]);assert.equal((await read('sliding')).moves,1);
    },
    async connect(){
      await key('ArrowRight');assert.equal(await cursor('connect'),'1');await key('Enter');assert.equal((await read('connect')).board[36],1);
      await header();await key('ArrowRight');assert.equal(await cursor('connect'),'2');await key('Space');assert.equal((await read('connect')).board[37],-1);
      await focus('Undo');await key('Enter');assert.equal((await read('connect')).moves,1);
    },
    async sokoban(){
      await key('Shift+w');assert.equal((await read('sokoban')).moves,1);await header();await key('ArrowDown');assert.equal((await read('sokoban')).moves,2);
      await key('Control+z');assert.equal((await read('sokoban')).moves,1);await key('r');await act('wait','--selector','#confirm-dialog[open]');
      await key('d');assert.equal((await read('sokoban')).moves,1);await key('Escape');assert.equal(await evaluate('document.getElementById("confirm-dialog").open'),false,'Escape must dismiss the restart dialog');
      await key('s');assert.equal((await read('sokoban')).moves,2,'Typing must resume after dismissing the dialog');await key('ArrowRight');assert.equal((await read('sokoban')).records[0].pushes,1);
      await key('Control+z');assert.equal((await read('sokoban')).moves,2);
    },
    async wordle(){
      await key('Shift+c');assert.equal((await read('wordle')).draft,'c');await header();await key('r');assert.equal((await read('wordle')).draft,'cr');
      await key('Backspace');await key('e');await key('Delete');assert.equal((await read('wordle')).draft,'c');
      await key('Backspace');for(const letter of 'crane')await key(letter);await key('Enter');assert.equal((await read('wordle')).guesses.length,1);
    },
    async simon(){
      await key('1');assert.deepEqual((await read('simon')).input,[0]);await header();await key('1');assert.deepEqual((await read('simon')).input,[0,0]);
      await key('1');assert.equal((await read('simon')).round,4);
    },
    async flood(){
      const color=(fixtures.flood.board[0]+1)%6;await key(String(color+1));assert.equal((await read('flood')).moves,1);
      await header();await key(String((color+1)%6+1));assert.equal((await read('flood')).moves,2);
    }
  };
  let original,capturedOriginal=false;const passed=[],failed=[];
  try {
    await act('wait','--selector','#app[aria-busy=false]');original=await evaluate('localStorage.getItem('+journal+')');capturedOriginal=true;
    for(const [id,s] of Object.entries(fixtures).filter(([id])=>game===null||id===game)) {
      try{await seed(id,s);await checks[id]();passed.push(id);console.log('Passed: '+id+' — physical keys, restored focus and toolbar recovery');}
      catch(error){const context=await evaluate('({active:document.activeElement?.outerHTML,dialog:document.getElementById("confirm-dialog").open})');failed.push({game:id,message:error.message,context});console.log('FAILED: '+id+' — '+error.message+' '+JSON.stringify(context));}
    }
    if(game===null) {
      // Shared handler boundaries: preserve form editing, dropdowns, dialogs and Tab.
      await seed('wordle',fixtures.wordle);await key('a');await key('Tab');assert.equal((await read('wordle')).draft,'a');
      await evaluate('(() => {const input=document.createElement("input");input.id="keyboard-test-input";document.body.append(input);input.focus();return true;})()');
      await key('z');assert.equal(await evaluate('document.getElementById("keyboard-test-input").value'),'z');assert.equal((await read('wordle')).draft,'a');
      await evaluate('(() => {document.getElementById("keyboard-test-input").remove();document.getElementById("game-select").focus();return true;})()');
      await key('w');assert.equal((await read('wordle')).draft,'a');
      // Repeatedly mounting each game must not keep the previous game's listener alive.
      for(const id of Object.keys(fixtures))await select(id);
      await select('wordle');const draft=(await read('wordle')).draft;await key('b');assert.equal((await read('wordle')).draft,draft+'b');
      await click('All games');const hiddenDraft=(await read('wordle')).draft;await key('q');assert.equal((await read('wordle')).draft,hiddenDraft);
    }
    const browserConsole=await act('console','--limit','100');assert.deepEqual(browserConsole.entries,[]);
    await writeFile(new URL('browser-keyboard.json',output),JSON.stringify({passed,failed,browserConsole},null,2));
    assert.deepEqual(failed,[],'Every game must pass its keyboard controls');assert.equal(passed.length,game===null?15:1);
    console.log(game===null?'Passed: form controls, Tab, all-game switching, listener cleanup and no browser errors':'Passed: '+game+' interaction and focus checks; no browser errors');
  } finally {
    try{if(capturedOriginal)await evaluate('(() => {const put=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key!=='+journal+')return put.call(this,key,value);};const raw='+JSON.stringify(original)+';if(raw===null)localStorage.removeItem('+journal+');else put.call(localStorage,'+journal+',raw);return true;})()');}
    finally{await command('tab','close','--page',page);}
  }
  console.log((game===null?'All 15 games':game)+' passed keyboard checks; original preview save restored.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await runKeyboardSmoke({game:process.argv.includes('--game')?process.argv[process.argv.indexOf('--game')+1]:null});
