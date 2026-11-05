import test from 'node:test';
import assert from 'node:assert/strict';
import { SOKOBAN_LEVELS, createSokoban, moveSokoban, undoSokoban, isSokobanComplete, isValidSokoban, sokobanDeadlocks, sokobanNeighbor } from '../panel/games/sokoban.mjs';
import { solveSokoban } from './sokoban-solver.mjs';
const solutions = SOKOBAN_LEVELS.map(level => solveSokoban(level));
function run(s, directions) { for (const direction of directions) s = moveSokoban(s, direction); return s; }
function campaignTo(index) { let s = createSokoban(); for (let i=0;i<index;i++) { s=run(s,solutions[i].path);s=createSokoban(s,i+1); } return s; }

test('all twenty original compact levels have playable solutions and valid progress', () => {
  assert.equal(SOKOBAN_LEVELS.length,20); let s=createSokoban();
  for(const [i,level] of SOKOBAN_LEVELS.entries()) {
    assert.ok(level.width<=8&&level.height<=8);assert.ok(solutions[i],level.name);
    assert.ok(level.goals.length===level.crates.length&&level.crates.length>0);
    s=createSokoban(s,i);assert.equal(s.level,i);assert.ok(isValidSokoban(s));
    for(const direction of solutions[i].path){s=moveSokoban(s,direction);assert.ok(isValidSokoban(s),level.name);}
    assert.ok(isSokobanComplete(s),level.name);assert.equal(s.records[i].pushes,s.pushes);
    assert.equal(s.unlocked,Math.min(19,i+1));
  }
  assert.equal(s.records.filter(Boolean).length,20);
});
test('Sokoban walks without pulling, pushes one crate, and stops after completion', () => {
  const s=createSokoban(),walk=moveSokoban(s,'left');assert.deepEqual(walk.crates,s.crates);assert.equal(walk.pushes,0);assert.equal(walk.moves,1);
  const won=moveSokoban(s,'right');assert.ok(isSokobanComplete(won));assert.equal(won.moves,1);assert.equal(won.pushes,1);assert.equal(won.player,s.crates[0]);
  assert.equal(moveSokoban(won,'right'),won);assert.equal(moveSokoban(s,'diagonal'),s);
});
test('Sokoban cannot push two crates together or push a crate through a wall', () => {
  const dock=run(campaignTo(11),['left','left','up','up']);assert.equal(moveSokoban(dock,'right'),dock);
  const corner=run(createSokoban(),['up','right','right','down','left','left']);
  assert.equal(moveSokoban(corner,'left'),corner);assert.ok(isValidSokoban(corner));
});
test('Sokoban grid boundaries never wrap between rows', () => {
  const map=SOKOBAN_LEVELS[0];assert.equal(sokobanNeighbor(map,0,'left'),-1);assert.equal(sokobanNeighbor(map,5,'right'),-1);
  assert.equal(sokobanNeighbor(map,0,'up'),-1);assert.equal(sokobanNeighbor(map,map.width*map.height-1,'down'),-1);
});
test('Sokoban highlights irreversible crate positions and undo restores them', () => {
  const corner=run(createSokoban(),['up','right','right','down','left','left']);assert.equal(sokobanDeadlocks(corner).length,1);
  assert.equal(sokobanDeadlocks(undoSokoban(corner)).length,0);assert.equal(sokobanDeadlocks(moveSokoban(createSokoban(),'right')).length,0);
});
test('Sokoban undo and restart preserve completed levels and personal records', () => {
  const s=createSokoban(),won=moveSokoban(s,'right'),undone=undoSokoban(won);
  assert.deepEqual(undone.crates,s.crates);assert.equal(undone.player,s.player);assert.equal(undone.moves,0);assert.equal(undone.pushes,0);
  assert.equal(undone.unlocked,1);assert.deepEqual(undone.records[0],{moves:1,pushes:1});assert.ok(isValidSokoban(undone));
  const restarted=createSokoban(won);assert.equal(restarted.level,0);assert.equal(restarted.moves,0);assert.deepEqual(restarted.records,won.records);
});
test('Sokoban records prefer fewer pushes and then fewer moves', () => {
  const longer=run(createSokoban(),['up','right','right','down','left','up','left','left','down','right','right']);
  assert.ok(isSokobanComplete(longer));assert.equal(longer.pushes,3);
  const improved=moveSokoban(createSokoban(longer),'right');assert.deepEqual(improved.records[0],{moves:1,pushes:1});
  const slower=run(createSokoban(improved),['up','down','right']);assert.equal(slower.moves,3);assert.deepEqual(slower.records[0],improved.records[0]);assert.ok(isValidSokoban(slower));
});
test('Sokoban unlocks levels in order and permits replay of completed levels', () => {
  const s=createSokoban();assert.equal(createSokoban(s,3).level,0);
  const won=moveSokoban(s,'right'),next=createSokoban(won,1);assert.equal(next.level,1);assert.equal(next.unlocked,1);
  assert.equal(createSokoban(next,2).level,1);assert.equal(createSokoban(next,0).level,0);
});
test('Sokoban bounded history remains valid through a long walk and repeated undo', () => {
  let s=createSokoban();for(let i=0;i<240;i++)s=moveSokoban(s,i%2?'down':'up');
  assert.equal(s.history.length,200);assert.equal(s.moves,240);assert.ok(isValidSokoban(s));
  for(let i=0;i<200;i++)s=undoSokoban(s);assert.equal(s.moves,40);assert.equal(undoSokoban(s),s);assert.ok(isValidSokoban(s));
});
test('Sokoban rejects invalid positions, forged history, and broken campaign records', () => {
  const s=moveSokoban(createSokoban(),'up');assert.ok(isValidSokoban(JSON.parse(JSON.stringify(s))));
  assert.equal(isValidSokoban({...s,player:0}),false);assert.equal(isValidSokoban({...s,crates:[s.player]}),false);
  assert.equal(isValidSokoban({...s,level:20}),false);assert.equal(isValidSokoban({...s,pushes:5}),false);
  assert.equal(isValidSokoban({...s,history:[{...s.history[0],player:8}]}),false);
  const won=moveSokoban(createSokoban(),'right');assert.equal(isValidSokoban({...won,records:Array(20).fill(null)}),false);
});
