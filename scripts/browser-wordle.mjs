// Wordle keyboard/focus regression checks in Orca's embedded browser.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { emptySave, SAVE_KEY } from '../panel/storage.mjs';
import { createWordle, isValidWordle } from '../panel/games/wordle.mjs';

export async function runWordleSmoke() {
  const run = promisify(execFile), cli = process.env.ORCA_CLI_COMMAND ?? 'orca';
  const url = 'http://127.0.0.1:' + (process.env.SIDEQUEST_PREVIEW_PORT ?? 4318) + '/';
  const journal = JSON.stringify(SAVE_KEY);
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
    const ref = Object.entries(snapshot.refs).find(([, node]) => node.role === role && node.name?.toLowerCase() === name.toLowerCase())?.[0];
    assert.ok(ref, 'Missing ' + role + ': ' + name);
    return act(action, '--element', '@' + ref, ...args);
  }
  const click = name => control('button', name, 'click');
  const focus = name => control('button', name, 'focus');
  const key = name => act('keypress', '--key', name);
  const select = value => control('combobox', 'Switch game', 'select', '--value', value);
  const saved = () => evaluate('JSON.parse(localStorage.getItem(' + journal + ')).games.wordle');
  const assertDraft = async (draft, message) => assert.equal((await saved()).draft, draft, message);
  let original, capturedOriginal = false;
  async function seed(s) {
    assert.ok(isValidWordle(s));
    const save = emptySave(); save.activeGame = 'wordle'; save.games.wordle = s;
    const raw = JSON.stringify(JSON.stringify(save));
    await evaluate('(() => {const put=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){return put.call(this,key,key===' + journal + '?' + raw + ':value);};localStorage.setItem(' + journal + ',' + raw + ');return true;})()');
    await act('reload'); await act('viewport', '--width', '320', '--height', '860');
    await act('wait', '--selector', '#app[aria-busy=false]');
  }
  async function clickBoard() {
    const point = await evaluate('(() => {const b=document.querySelector(".wordle-tile").getBoundingClientRect();return {x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)};})()');
    await act('mouse', 'move', '--x', String(point.x), '--y', String(point.y));
    await act('mouse', 'down', '--button', 'left'); await act('mouse', 'up', '--button', 'left');
  }
  try {
    await act('wait', '--selector', '#app[aria-busy=false]');
    original = await evaluate('localStorage.getItem(' + journal + ')'); capturedOriginal = true;
    await seed(createWordle(null, undefined, () => 0));
    // A restored panel starts with body focus: typing should work before clicking a key.
    await key('c'); await assertDraft('c', 'Typing immediately after restoring Wordle should work');
    await clickBoard();
    assert.equal(await evaluate('document.activeElement.id'), 'wordle-board', 'Clicking a tile must focus the board');
    await key('r'); await assertDraft('cr');
    await click('Turn sound on'); await key('a'); await assertDraft('cra', 'Header focus should not disable typing');
    await key('Backspace'); await assertDraft('cr');
    await key('Shift+a'); await assertDraft('cra');
    await key('Control+a'); await assertDraft('cra', 'Modifier shortcuts must not enter letters');
    await click('n'); await assertDraft('cran');
    await key('e'); await assertDraft('crane', 'Typing after an on-screen key should add one letter');
    await key('Tab'); await assertDraft('crane', 'Tab should navigate controls');
    console.log('Passed: restored panel, board click, header focus, physical letters, uppercase, delete and on-screen keys');

    await focus('New'); await key('Enter');
    await act('wait', '--selector', '#confirm-dialog[open]');
    await key('z'); await assertDraft('crane', 'Confirmation dialog must suspend keyboard input');
    await click('Keep playing'); await act('wait', '--selector', '#wordle-board:focus');
    assert.equal(await evaluate('document.getElementById("confirm-dialog").open'), false);
    await key('Enter');
    assert.equal((await saved()).guesses.length, 1); await assertDraft(''); assert.ok(isValidWordle(await saved()));
    console.log('Passed: Enter activates New, dialog suspends typing, Enter submits exactly one guess');

    await evaluate('(() => {const input=document.createElement("input");input.id="keyboard-test-input";document.body.append(input);input.focus();return true;})()');
    await key('h'); await key('Enter'); await key('Backspace'); await assertDraft('', 'Text inputs must keep their keyboard events');
    assert.equal(await evaluate('document.getElementById("keyboard-test-input").value'), '');
    await evaluate('(() => {document.getElementById("keyboard-test-input").remove();const edit=document.createElement("div");edit.id="keyboard-test-edit";edit.contentEditable="true";document.body.append(edit);edit.focus();return true;})()');
    await key('a'); await assertDraft('', 'Editable content must keep letters');
    assert.equal(await evaluate('document.getElementById("keyboard-test-edit").textContent'), 'a');
    await evaluate('(() => {document.getElementById("keyboard-test-edit").remove();const board=document.getElementById("wordle-board");board.focus();for(const options of [{isComposing:true},{repeat:true},{altKey:true},{metaKey:true},{ctrlKey:true}])board.dispatchEvent(new KeyboardEvent("keydown",{key:"a",bubbles:true,...options}));return true;})()');
    await assertDraft('', 'IME composition, repeats and modifier shortcuts must be ignored');
    console.log('Passed: text editing, IME composition and modifier shortcuts');

    await select('2048'); const beforeSwitch = await saved(); await key('c');
    assert.deepEqual(await saved(), beforeSwitch, 'Wordle must stop listening when another game is active');
    await select('wordle'); await key('z'); await assertDraft('z', 'Returning must register one keyboard listener');
    await click('All games'); const beforeHome = await saved(); await key('h'); assert.deepEqual(await saved(), beforeHome);
    await click('Resume Wordle'); await key('b'); await assertDraft('zb', 'Repeated mounts must not duplicate letters');
    console.log('Passed: switching games, library navigation, resume and listener cleanup');

    const fresh = createWordle(null, undefined, () => 0); await seed(fresh);
    for (const letter of fresh.target) await key(letter);
    await key('Enter'); assert.equal((await saved()).result, 'won');
    await focus('Play again'); await key('Enter');
    await act('wait', '--selector', '#wordle-board:focus');
    assert.equal(await evaluate('document.getElementById("more-overlay").hidden'), true);
    await key('x'); await assertDraft('x', 'Keyboard must resume after replay');
    const browserConsole = await act('console', '--limit', '100');
    assert.deepEqual(browserConsole.entries, [], JSON.stringify(browserConsole));
    console.log('Passed: completion, keyboard replay and no browser errors');
  } finally {
    try {
      if (capturedOriginal) await evaluate('(() => {const put=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key!==' + journal + ')return put.call(this,key,value);};const raw=' + JSON.stringify(original) + ';if(raw===null)localStorage.removeItem(' + journal + ');else put.call(localStorage,' + journal + ',raw);return true;})()');
    } finally { await command('tab', 'close', '--page', page); }
  }
  console.log('All Wordle keyboard checks passed; original preview save restored.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runWordleSmoke();
