export function createSound(enabled, onError = () => {}) {
  let context;
  async function play(kind, value = 2) {
    if (!enabled()) return false;
    try {
      const Audio = window.AudioContext ?? window.webkitAudioContext;
      if (!Audio) throw new Error('Audio is unavailable in this panel.');
      // Create and resume synchronously inside the click/key gesture, then wait
      // for the audio clock to start before scheduling the first notes.
      if (!context || context.state === 'closed') context = new Audio();
      if (context.state !== 'running') {
        let timeout;
        try {
          await Promise.race([context.resume(), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Audio could not start. Try turning sound on again.')), 1500); })]);
        } finally { clearTimeout(timeout); }
      }
      if (!enabled()) return false;
      if (context.state !== 'running') throw new Error('Audio is paused by the host.');
      const now = context.currentTime + .012;
      const frequencies = kind === 'win' ? [523.25,659.25,783.99,1046.5] :
        kind === 'merge' ? [220 * 2 ** (Math.min(8, Math.log2(value)) / 12), 440 * 2 ** (Math.min(8, Math.log2(value)) / 12)] :
        kind === 'complete' ? [523.25,783.99] : kind === 'error' ? [164.81] : [392];
      frequencies.forEach((frequency, i) => {
        const oscillator = context.createOscillator(), volume = context.createGain();
        oscillator.type = 'triangle'; oscillator.frequency.value = frequency;
        const start = now + i * (kind === 'win' ? .085 : .035);
        volume.gain.setValueAtTime(0, start);
        volume.gain.linearRampToValueAtTime(.09, start + .012);
        volume.gain.exponentialRampToValueAtTime(.0001, start + .16);
        oscillator.connect(volume); volume.connect(context.destination);
        oscillator.start(start); oscillator.stop(start + .18);
      });
      return true;
    } catch (error) {
      onError(error);
      return false;
    }
  }
  return { play };
}

export function celebration() {
  return `<div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i};--x:${((i * 47) % 100)}%;--angle:${(i * 67) % 360}deg;--delay:${(i % 5) * 45}ms"></i>`).join('')}</div>`;
}
