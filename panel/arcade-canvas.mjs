import { ARCADE_COLORS as colors } from './arcade-cards.mjs';
import { fireBubble, bubbleCenter, BUBBLE_RADIUS } from './games/bubbles.mjs';
import { brickRect, BREAKOUT_DIFFICULTIES } from './games/breakout.mjs';
export function drawArcade(canvas, id, s, { projectile = null, trail = [], sparks = [] } = {}) {
  const ctx = canvas.getContext('2d'), height = canvas.height / 2, dark = document.documentElement.classList.contains('dark') || (!document.documentElement.classList.contains('light') && matchMedia('(prefers-color-scheme: dark)').matches);
  ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, 320, height);
  const gradient = ctx.createLinearGradient(0, 0, 320, height);
  gradient.addColorStop(0, dark ? '#202c34' : '#eef4ed'); gradient.addColorStop(1, dark ? '#19232b' : '#e3ece7');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 320, height);
  ctx.fillStyle = dark ? '#ffffff12' : '#20433512';
  if (id !== 'snake') for (let y = 10; y < height; y += 20) for (let x = 10; x < 320; x += 20) { ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2); ctx.fill(); }
  const circle = (x, y, r, fill) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };
  const rounded = (x, y, w, h, radius, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill(); };
  if (id === 'snake') {
    for (let row = 0; row < 16; row++) for (let col = 0; col < 16; col++) {
      rounded(col * 20 + 1, row * 20 + 1, 18, 18, 2, dark ? (row + col) % 2 ? '#294338' : '#243d33' : (row + col) % 2 ? '#d8e9d8' : '#cce0cd');
    }
    for (let i = s.body.length - 1; i >= 0; i--) {
      const index = s.body[i], x = index % 16 * 20, y = Math.floor(index / 16) * 20;
      rounded(x + 2, y + 3, 16, 16, 3, '#0d4a3766');
      rounded(x + 2, y + 2, 16, 16, 3, i ? i % 2 ? '#49c793' : '#37b98a' : '#b6f2b9');
      rounded(x + 4, y + 3, 12, 2, 1, i ? '#a5edbf88' : '#efffdc');
    }
    const head = s.body[0], x = head % 16 * 20 + 10, y = Math.floor(head / 16) * 20 + 10, d = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }[s.direction];
    circle(x + d[0] * 4 - d[1] * 3, y + d[1] * 4 + d[0] * 3, 1.4, '#164638');
    circle(x + d[0] * 4 + d[1] * 3, y + d[1] * 4 - d[0] * 3, 1.4, '#164638');
    if (s.food !== null) {
      const fx = s.food % 16 * 20 + 10, fy = Math.floor(s.food / 16) * 20 + 10;
      rounded(fx - 8, fy - 7, 16, 16, 3, '#79512855'); rounded(fx - 8, fy - 8, 16, 16, 3, '#f3b766'); rounded(fx - 5, fy - 6, 10, 2, 1, '#ffe3a3');
      ctx.fillStyle = '#945a25'; ctx.beginPath(); ctx.moveTo(fx, fy - 3); ctx.lineTo(fx + 3, fy); ctx.lineTo(fx, fy + 3); ctx.lineTo(fx - 3, fy); ctx.fill();
    }
  } else if (id === 'breakout') {
    s.bricks.forEach((hp, index) => {
      if (!hp) return; const b = brickRect(index), color = colors[Math.floor(index / 8) % 5];
      rounded(b.x, b.y + 2, b.width, b.height, 4, dark ? '#00000044' : '#26383122'); rounded(b.x, b.y, b.width, b.height, 4, color); rounded(b.x + 3, b.y + 2, b.width - 6, 2, 1, '#ffffff4d');
      if (hp === 2) { circle(b.x + b.width / 2 - 3, b.y + 9, 1.2, '#ffffffbb'); circle(b.x + b.width / 2 + 3, b.y + 9, 1.2, '#ffffffbb'); }
    });
    const width = BREAKOUT_DIFFICULTIES[s.difficulty].paddle;
    rounded(s.paddle - width / 2, 409, width, 10, 5, '#43c8a1'); rounded(s.paddle - width / 2 + 5, 410, width - 10, 2, 1, '#b8f7dd');
    trail.forEach((p, i) => circle(p.x, p.y, 2 + i / 4, '#efc768' + Math.round(20 + i * 8).toString(16).padStart(2, '0')));
    circle(s.ball.x, s.ball.y, 8, '#efc76822'); circle(s.ball.x, s.ball.y, 5, dark ? '#fff3bd' : '#38554a');
  } else {
    const bubble = (x, y, color, r = BUBBLE_RADIUS) => {
      circle(x, y + 2, r, '#00000022'); const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 1, x, y, r);
      g.addColorStop(0, '#f5f2e8'); g.addColorStop(0.25, colors[color]); g.addColorStop(1, colors[color]); circle(x, y, r, g); circle(x - r * 0.25, y - r * 0.3, r * 0.16, '#ffffff80');
      ctx.fillStyle = '#244037'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(color + 1), x, y + 1);
    };
    s.board.forEach((c, i) => { if (c !== null) { const p = bubbleCenter(i); bubble(p.x, p.y, c); } });
    ctx.setLineDash([4, 6]); ctx.strokeStyle = '#da8e8566'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, 340); ctx.lineTo(310, 340); ctx.stroke(); ctx.setLineDash([]);
    if (!projectile && !s.result) { const guide = fireBubble(s, s.aim, () => 0).path; for (let i = 0; i < guide.length; i += 5) circle(guide[i].x, guide[i].y, 1.4, dark ? '#d8ecd766' : '#344d5366'); }
    rounded(142, 393, 36, 14, 7, dark ? '#536b5c' : '#b6cdbb'); bubble(160, 391, s.current); bubble(55, 391, s.next, 11);
    ctx.fillStyle = dark ? '#a4b9b0' : '#536c61'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('NEXT', 55, 414);
    if (projectile) bubble(projectile.x, projectile.y, projectile.color);
  }
  const time = performance.now();
  for (const p of sparks) {
    const age = (time - p.born) / 450; if (age < 0 || age >= 1) continue; ctx.globalAlpha = 1 - age;
    for (let i = 0; i < 6; i++) circle(p.x + Math.cos(i * Math.PI / 3) * age * 22, p.y + Math.sin(i * Math.PI / 3) * age * 22, 2.5 * (1 - age), p.color);
  }
  ctx.globalAlpha = 1;
}
