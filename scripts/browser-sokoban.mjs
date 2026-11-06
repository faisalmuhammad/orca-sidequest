// Focused browser checks. Run with the local preview server through Orca's browser.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { emptySave, SAVE_KEY } from '../panel/storage.mjs';
import { SOKOBAN_LEVELS, createSokoban, moveSokoban, isValidSokoban, isSokobanComplete } from '../panel/games/sokoban.mjs';
import { solveSokoban } from '../tests/sokoban-solver.mjs';

export async function runSokobanSmoke() {
  const run = promisify(execFile), cli = process.env.ORCA_CLI_COMMAND ?? 'orca';
  const url = 'http://127.0.0.1:' + (process.env.SIDEQUEST_PREVIEW_PORT ?? 4318) + '/';
  const output = new URL('../.orca/shots/', import.meta.url), journal = JSON.stringify(SAVE_KEY);
  await mkdir(output, { recursive: true });
  async function command(...args) {
    const { stdout } = await run(cli, [...args, '--json'], { maxBuffer: 2 ** 20, timeout: 60000 });
    const value = JSON.parse(stdout);
    if (!value.ok) throw new Error(JSON.stringify(value.error));
    assert.ok(!value.result?.effects?.consoleErrors?.length, JSON.stringify(value.result?.effects?.consoleErrors));
    return value.result;
  }
  const page = (await command('tab', 'create', '--url', url)).browserPageId;
  const act = (...args) => command(...args, '--page', page);
  async function evaluate(expression) {
    const result = await act('eval', '--expression', 'JSON.stringify(' + expression + ')');
    return typeof result.result === 'string' ? JSON.parse(result.result) : result.result;
  }
  async function control(role, name, action, ...args) {
    const snapshot = await act('snapshot', '--interactive');
    const ref = Object.entries(snapshot.refs).find(([, node]) => node.role === role && node.name === name)?.[0];
    assert.ok(ref, 'Missing ' + role + ': ' + name);
    return act(action, '--element', '@' + ref, ...args);
  }
  const click = name => control('button', name, 'click');
  const select = value => control('combobox', 'Sokoban level', 'select', '--value', String(value));
  const saved = () => evaluate('JSON.parse(localStorage.getItem(' + journal + ')).games.sokoban');
  const focus = () => evaluate('(() => { document.getElementById("sokoban-board").focus(); return true; })()');
  const settled = () => act('wait', '--selector', '#sokoban-board[aria-busy=false]');
  let width = 320, original, capturedOriginal = false;
  async function reload() {
    await act('reload');
    await act('viewport', '--width', String(width), '--height', '760', '--mobile');
    await act('wait', '--selector', '#app[aria-busy=false]');
  }
  async function seed(s) {
    if (s) assert.ok(isValidSokoban(s), 'Fixture must be a valid recoverable game');
    const save = emptySave(); if (s) { save.activeGame = 'sokoban'; save.games.sokoban = s; }
    const raw = JSON.stringify(JSON.stringify(save));
    // Prevent the old document's pagehide/blur journal from overwriting the fixture.
    await evaluate('(() => { const put=Storage.prototype.setItem; Storage.prototype.setItem=function(key,value){return put.call(this,key,key===' + journal + '?' + raw + ':value);}; localStorage.setItem(' + journal + ',' + raw + '); return true; })()');
    await reload();
    if (s) { await settled(); assert.deepEqual(await saved(), s); }
  }
  async function screenshot(name) {
    const shot = await act('screenshot'); await copyFile(shot.path, new URL(name + '.png', output));
  }
  async function layout(label) {
    const data = await evaluate('(() => { const board=document.getElementById("sokoban-board"), ground=board?.querySelector(".soko-ground"); const cells=[...(ground?.querySelectorAll(".soko-cell")??[])], actors=[...(ground?.querySelectorAll(".soko-player,.soko-crate")??[])]; return {width:innerWidth,scroll:document.documentElement.scrollWidth,aligned:actors.every(actor=>{const style=getComputedStyle(actor),row=Number(style.gridRowStart),col=Number(style.gridColumnStart),columns=Number(board.style.getPropertyValue("--soko-columns"));const cell=cells[(row-1)*columns+col-1].getBoundingClientRect(),rect=actor.getBoundingClientRect();return rect.width>8&&rect.height>8&&Math.abs(rect.x+rect.width/2-cell.x-cell.width/2)<1&&Math.abs(rect.y+rect.height/2-cell.y-cell.height/2)<1;}),cells:cells.length}; })()');
    assert.equal(data.width, width); assert.ok(data.scroll <= width, label + ': ' + JSON.stringify(data));
    assert.ok(data.aligned, label + ': actors must align with floor cells');
    console.log('Passed: ' + label + ' (' + width + 'px)');
  }
  async function completionLayout() {
    const data = await evaluate('(() => {const overlay=document.getElementById("soko-overlay"),bounds=overlay.getBoundingClientRect();const controls=[...overlay.querySelectorAll("h2,button")];const actors=[...document.querySelectorAll(".soko-player,.soko-crate")];return {fits:controls.every(node=>{const r=node.getBoundingClientRect();return r.top>=bounds.top&&r.bottom<=bounds.bottom&&r.left>=bounds.left&&r.right<=bounds.right;}),covered:actors.every(node=>{const r=node.getBoundingClientRect();return overlay.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})};})()');
    assert.ok(data.fits, 'Completion title and replay buttons must fit inside the overlay');
    assert.ok(data.covered, 'Completion overlay must cover the player and crates');
  }
  try {
    await act('wait', '--selector', '#app[aria-busy=false]');
    original = await evaluate('localStorage.getItem(' + journal + ')'); capturedOriginal = true;
    await seed(null);
    assert.equal(await evaluate('document.querySelectorAll(".game-card").length'), 15);
    assert.equal(await evaluate('document.querySelector("[data-action=library-view]").nextElementSibling.id'), 'sound-button');
    for (const theme of ['dark', 'light']) {
      await evaluate('(() => { document.documentElement.className=' + JSON.stringify(theme) + ';return true; })()');
      await layout(theme + ' compact library'); await screenshot('sokoban-library-' + theme);
      await click('Compact game view'); await layout(theme + ' expanded library'); await click('Compact game view');
    }
    await click('Play Sokoban'); await focus();
    await act('keypress', '--key', 'ArrowRight'); await settled();
    await completionLayout();
    let s = await saved(); assert.ok(isSokobanComplete(s)); assert.equal(s.unlocked, 1); assert.deepEqual(s.records[0], { moves: 1, pushes: 1 });
    await click('Undo'); assert.equal((await saved()).moves, 0); assert.equal((await saved()).unlocked, 1);
    await click('Move right'); await settled(); await click('Replay this level'); assert.equal((await saved()).moves, 0);
    await click('Move right'); await settled(); await click('Next level'); assert.equal((await saved()).level, 1);
    await focus(); await act('keypress', '--key', 'w'); await settled();
    const beforeReload = await saved(); assert.equal(beforeReload.moves, 1); await reload(); await settled(); assert.deepEqual(await saved(), beforeReload);
    await click('Restart'); assert.equal(await evaluate('document.getElementById("confirm-title").textContent'), 'Restart this level?');
    await click('Keep playing'); assert.deepEqual(await saved(), beforeReload);
    await select(0); assert.equal(await evaluate('document.getElementById("confirm-title").textContent'), 'Switch levels?');
    await click('Keep playing'); assert.equal((await saved()).level, 1);
    await click('Restart'); await click('Start new'); await act('wait','--selector','#soko-undo:disabled'); assert.equal((await saved()).moves, 0); assert.deepEqual((await saved()).records[0], { moves: 1, pushes: 1 });
    console.log('Passed: keyboard/buttons, win, undo, records, unlocks, replay, reload and reset confirmations');

    const animation = await evaluate('(() => {const board=document.getElementById("sokoban-board");board.focus();board.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowUp",bubbles:true}));return {busy:board.getAttribute("aria-busy"),animations:board.getAnimations({subtree:true}).length};})()');
    assert.equal(animation.busy, 'true'); assert.equal(animation.animations, 2); await settled(); await layout('animated player and crate');
    await focus(); await act('keypress', '--key', 'Control+z'); await settled(); assert.equal((await saved()).moves, 0);
    // Real pointer drag uses capture and the swipe path, without synthetic pointer events.
    const point = await evaluate('(() => {const b=document.getElementById("sokoban-board").getBoundingClientRect();return {x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)};})()');
    await act('mouse', 'move', '--x', String(point.x), '--y', String(point.y));
    await act('mouse', 'down', '--button', 'left');
    await act('mouse', 'move', '--x', String(point.x), '--y', String(point.y-40));
    await act('mouse', 'up', '--button', 'left'); await settled(); assert.equal((await saved()).moves, 1);
    console.log('Passed: smooth actor animations, keyboard undo and real pointer swipe');

    let stuck = createSokoban(); for (const direction of ['up','right','right','down','left']) stuck = moveSokoban(stuck, direction);
    await seed(stuck); await click('Move left'); await settled();
    assert.match(await evaluate('document.getElementById("soko-feedback").textContent'), /cannot reach a target/);
    assert.equal(await evaluate('document.querySelectorAll(".soko-crate.stuck").length'), 1);
    await click('Undo'); assert.deepEqual(await saved(), stuck); assert.equal(await evaluate('document.querySelectorAll(".soko-crate.stuck").length'), 0);
    // Emulate reduced motion in this document only, and confirm movement skips animations.
    await seed(createSokoban());
    await evaluate('(() => {const match=window.matchMedia;window.matchMedia=query=>query==="(prefers-reduced-motion: reduce)"?{matches:true}:match(query);window.__actorAnimations=0;const animate=Element.prototype.animate;Element.prototype.animate=function(...args){if(this.matches(".soko-player,.soko-crate"))window.__actorAnimations++;return animate.apply(this,args);};return true;})()');
    await click('Move right'); await settled(); assert.ok(isSokobanComplete(await saved())); assert.equal(await evaluate('window.__actorAnimations'), 0);
    width=240; await act('viewport','--width','240','--height','760','--mobile');
    await completionLayout(); await layout('first-level completion'); await screenshot('sokoban-first-win-240');
    width=320;
    console.log('Passed: deadlock feedback, undo, reduced-motion movement and completion overlay');

    // Build a genuine near-complete campaign by replaying independently solved paths.
    let final = createSokoban();
    for (let level = 0; level < 19; level++) {
      for (const direction of solveSokoban(SOKOBAN_LEVELS[level]).path) final = moveSokoban(final, direction);
      final = createSokoban(final, level + 1);
    }
    const path = solveSokoban(SOKOBAN_LEVELS[19]).path, finalStart = structuredClone(final);
    for (const direction of path.slice(0,-1)) final = moveSokoban(final, direction);
    await seed(final);
    for (const size of [320, 240]) {
      width = size; await act('viewport', '--width', String(size), '--height', '760', '--mobile');
      for (const theme of ['dark', 'light']) {
        await evaluate('(() => {document.documentElement.className=' + JSON.stringify(theme) + ';return true;})()');
        await layout('final Sokoban level ' + theme); await screenshot('sokoban-' + theme + '-' + size);
      }
    }
    await click('Move ' + path.at(-1)); await settled();
    assert.equal((await saved()).records.filter(Boolean).length, 20);
    assert.match(await evaluate('document.getElementById("soko-overlay").textContent'), /ALL 20 LEVELS CLEAR/);
    await completionLayout(); await screenshot('sokoban-campaign-complete');
    await click('Replay levels'); assert.equal((await saved()).level, 0); assert.equal((await saved()).records.filter(Boolean).length, 20);
    await select(19); assert.equal((await saved()).moves, 0); assert.deepEqual((await saved()).crates, finalStart.crates);
    await click('All games'); await layout('narrow library after campaign completion');
    console.log('Passed: 20-level campaign completion, replay and narrow dark/light layouts');
    const browserConsole = await act('console', '--limit', '100');
    assert.equal(browserConsole.entries?.length ?? browserConsole.messages?.length ?? 0, 0, JSON.stringify(browserConsole));
    await writeFile(new URL('browser-sokoban.json', output), JSON.stringify({ passed: true, browserConsole }, null, 2));
  } finally {
    try {
      if (capturedOriginal) await evaluate('(() => {const put=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key!==' + journal + ')return put.call(this,key,value);};const raw=' + JSON.stringify(original) + ';if(raw===null)localStorage.removeItem(' + journal + ');else put.call(localStorage,' + journal + ',raw);return true;})()');
    } finally { await command('tab', 'close', '--page', page); }
  }
  console.log('All Sokoban browser checks passed; original preview save restored.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runSokobanSmoke();
