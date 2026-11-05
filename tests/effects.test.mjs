import test from 'node:test';
import assert from 'node:assert/strict';
import { createSound } from '../panel/effects.mjs';
test('sound waits for the audio clock, plays at an audible gain, and respects mute', async () => {
  const events = [];
  let instance;
  class Audio {
    constructor() {
      instance = this;
      this.state = 'suspended';
      this.currentTime = 0;
      this.destination = {};
    }
    async resume() {
      await new Promise((r) => setTimeout(r, 5));
      this.state = 'running';
      this.currentTime = 7;
    }
    createOscillator() {
      return {
        frequency: {},
        connect() {},
        start: (time) => events.push(['start', time, this.state]),
        stop() {},
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime: (v) => events.push(['gain', v]),
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    }
  }
  globalThis.window = { AudioContext: Audio };
  let enabled = true;
  try {
    const sound = createSound(() => enabled);
    assert.equal(await sound.play('complete'), true);
    assert.equal(instance.state, 'running');
    assert.ok(
      events
        .filter((e) => e[0] === 'start')
        .every((e) => e[1] > 7 && e[2] === 'running'),
    );
    assert.ok(events.some((e) => e[0] === 'gain' && e[1] >= 0.08));
    const count = events.length;
    enabled = false;
    assert.equal(await sound.play('win'), false);
    assert.equal(events.length, count);
  } finally {
    delete globalThis.window;
  }
});
test('sound reports unavailable audio instead of silently failing', async () => {
  globalThis.window = {};
  let error;
  try {
    assert.equal(
      await createSound(
        () => true,
        (e) => (error = e),
      ).play('tick'),
      false,
    );
    assert.match(error.message, /unavailable/);
  } finally {
    delete globalThis.window;
  }
});
