import { pipeNetwork } from './games/pipes.mjs';
import { isFlowComplete } from './games/flow.mjs';
export const ARCADE_NAMES = { snake: 'Snake', pipes: 'Pipe Connect', bubbles: 'Bubble Shooter', reversi: 'Reversi', breakout: 'Brick Breaker', flow: 'Flow Connect' };
export const ARCADE_COLORS = ['#55d6b1', '#f48d85', '#efc768', '#b99ced', '#72bfee', '#e28eb7'];
export const ARCADE_SUBTITLES = { snake: 'A little room. One more turn.', pipes: 'Turn the pieces. Find the connection.', bubbles: 'Line up a color. Clear some space.', reversi: 'A small move. A changing board.', breakout: 'Find your angle. Clear the wall.', flow: 'Connect the colors. Fill the board.' };
const kickers = { snake: 'FOLLOW YOUR OWN PATH', pipes: 'LET IT FLOW', bubbles: 'A COLORFUL CHAIN REACTION', reversi: 'TURN THINGS AROUND', breakout: 'FIND YOUR ANGLE', flow: 'MAKE A CONNECTION' };
export const arcadeComplete = (id, s) => !!s && (id === 'pipes' ? pipeNetwork(s).won : id === 'flow' ? isFlowComplete(s) : id === 'breakout' ? ['won', 'lost'].includes(s.phase) : !!s.result);
export const arcadeProgress = (id, s) => !!s && (id === 'snake' ? s.ticks > 0 : id === 'bubbles' ? s.shots > 0 : id === 'breakout' ? s.phase !== 'ready' || s.lives < 3 || s.score > 0 : s.moves > 0);
function preview(id) {
  if (id === 'snake') return '<div class="mini-arcade mini-snake">' + Array.from({length:25},(_,i)=>'<i class="'+([21,16,11,6,7,8,13,18].includes(i)?i===18?'snake-head':'snake-segment':i===4?'snake-fruit':'')+'"></i>').join('') + '</div>';
  if (id === 'pipes') return '<div class="mini-arcade mini-pipes">' + [3,10,12,6,10,9,3,10,12].map((mask,i)=>'<span class="'+(i<5?'lit':'')+'"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="'+({3:'M50 0V25Q50 50 75 50H100',10:'M0 50H100',12:'M0 50H25Q50 50 50 75V100',6:'M100 50H75Q50 50 50 75V100',9:'M0 50H25Q50 50 50 25V0'}[mask])+'"/></svg></span>').join('') + '</div>';
  if (id === 'bubbles') return '<div class="mini-arcade mini-bubbles">' + [0,3,3,1,0,0,3,1,2,0,2,1].map(c=>'<i style="--mini-color:'+ARCADE_COLORS[c]+'"></i>').join('') + '<span class="mini-cannon"></span></div>';
  if (id === 'reversi') return '<div class="mini-arcade mini-reversi">' + [0,1,-1,0,1,1,-1,0,0,-1,1,0,0,0,0,0].map(p=>'<span>'+(p?'<i data-player="'+p+'"></i>':'')+'</span>').join('') + '</div>';
  if (id === 'breakout') return '<div class="mini-arcade mini-breakout"><div class="mini-brick-wall">' + [0,0,0,0,0,1,1,1,1,1,2,-1,-1,2,2].map(c=>'<i'+(c<0?' class="empty"':' style="--mini-color:'+ARCADE_COLORS[c]+'"')+'></i>').join('') + '</div><span class="mini-ball"></span><span class="mini-paddle"></span></div>';
  return '<div class="mini-arcade mini-flow">' + Array.from({length:16},()=>'<i></i>').join('') + '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M16 16H84V84H60" stroke="#69c9a9"/><path d="M16 84H36V40H60" stroke="#bba2e7"/><g fill="#69c9a9"><circle cx="16" cy="16" r="7"/><circle cx="60" cy="84" r="7"/></g><g fill="#bba2e7"><circle cx="16" cy="84" r="7"/><circle cx="60" cy="40" r="7"/></g></svg></div>';
}
export function arcadeCards(games, icon) {
  return Object.entries(ARCADE_NAMES).map(([id, name]) => {
    const s = games[id], done = arcadeComplete(id, s), status = done ? 'Done' : arcadeProgress(id, s) ? 'Resume' : 'Play';
    const meta = !s ? id === 'reversi' ? 'Play the computer or a friend' : 'A fresh game awaits' : ['snake', 'breakout', 'bubbles'].includes(id) ? 'Best ' + s.best.toLocaleString() : s.moves + (id === 'reversi' ? ' discs played' : ' moves');
    return { id, html: '<button class="game-card" data-game="' + id + '" aria-label="' + (done ? 'Open' : status) + ' ' + name + '"><div class="card-preview preview-' + id + '" aria-hidden="true"><span class="card-kicker">/ ' + kickers[id] + '</span><div class="art-orbit orbit-one"></div>' + preview(id) + '<span class="art-spark spark-one">✦</span></div><div class="card-info"><div class="card-title-line"><span class="card-title">' + name + '</span><span class="card-arrow">' + icon('arrow') + '</span></div><p class="card-description">' + ARCADE_SUBTITLES[id] + '</p><div class="card-meta"><span>' + meta + '</span><span class="card-state">' + status + icon('play') + '</span></div></div></button>' };
  });
}
