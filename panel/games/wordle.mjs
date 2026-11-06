// Target words: common, unambiguous 5-letter English words. ~300 curated.
export const WORDLE_TARGETS = [
  'about','above','abuse','actor','acute','admit','adopt','adult','after','again',
  'agent','agree','ahead','alarm','album','alert','alien','align','alike','alive',
  'allow','alone','along','alter','ample','angel','anger','angle','angry','apart',
  'apple','apply','arena','argue','arise','armor','array','aside','asset','atlas',
  'audio','avoid','award','aware','badly','baker','bases','basic','basin','basis',
  'batch','beach','beard','beast','began','begin','being','below','bench','berry',
  'birth','black','blade','blame','bland','blank','blast','blaze','bleed','blend',
  'bless','blind','block','blood','bloom','blown','board','bonus','boost','bound',
  'brain','brand','brave','bread','break','breed','brick','bride','brief','bring',
  'broad','broke','brook','brown','brush','build','bunch','burst','buyer','cabin',
  'cable','candy','carry','catch','cause','cease','chain','chair','chalk','champ',
  'charm','chart','chase','cheap','check','cheek','chess','chest','chief','child',
  'china','chunk','civic','civil','claim','clash','class','clean','clear','clerk',
  'click','cliff','climb','cling','clock','clone','close','cloth','cloud','coach',
  'coast','color','comet','comic','coral','could','count','court','cover','crack',
  'craft','crane','crash','crazy','cream','crime','crisp','cross','crowd','crown',
  'crude','crush','curve','cycle','daily','dance','debug','decay','delay','dense',
  'depot','depth','derby','dirty','donor','doubt','draft','drain','drama',
  'drawn','dream','dress','drift','drink','drive','drums','drunk','dying','eager',
  'eagle','early','earth','eight','elect','elite','email','empty','enemy','enjoy',
  'enter','equal','error','essay','event','every','exact','exist','extra','faint',
  'faith','fancy','fatal','fault','feast','fence','fever','fiber','field','fifth',
  'fifty','fight','final','first','fixed','flame','flash','fleet','flesh','float',
  'flood','floor','flour','fluid','flush','focal','focus','force','forge','forth',
  'forum','found','frame','frank','fraud','fresh','front','frost','fruit','fully',
  'funny','ghost','giant','given','glass','gleam','glide','globe','gloom','glory',
  'glove','grace','grade','grain','grand','grant','graph','grasp','grass','grave',
  'great','green','greet','grief','grill','grind','gross','group','grove',
  'grown','guard','guess','guest','guide','guild','guilt','habit','happy','harsh',
  'haven','heart','heavy','hedge','hello','hence','hobby','honey','honor','horse',
  'hotel','house','human','humor','hurry','ideal','image','imply','inbox','index',
  'indie','inner','input','irony','issue','ivory','joint','judge','juice','knock',
  'known','label','large','laser','later','laugh','layer','learn','lease','legal',
  'lemon','level','light','limit','linen','liter','liver','local','logic','loose',
  'lover','lower','lucky','lunar','lunch','magic','major','maker','manor','maple',
  'march','match','mayor','media','mercy','merge','merit','metal','meter','might',
  'minor','minus','model','money','month','moral','motor','mount','mouse','mouth',
  'movie','music','naive','nerve','never','night','noble','noise','north','noted',
  'novel','nurse','ocean','offer','onset','opera','orbit','order','organ','other',
  'outer','owner','oxide','ozone','paint','panel','panic','paper','party','paste',
  'patch','peace','peach','pearl','penny','phase','phone','photo','piano','piece',
  'pilot','pitch','pixel','pizza','place','plain','plane','plant','plate','plaza',
  'plead','plumb','plume','point','polar','pound','power','press','price','pride',
  'prime','print','prior','prize','probe','prone','proof','proud','prove','pulse',
  'punch','pupil','purse','quest','queue','quick','quiet','quite','quota','quote',
  'radar','radio','raise','rally','range','rapid','ratio','reach','react','realm',
  'rebel','reign','relax','reply','ridge','right','rigid','rival','river','robin',
  'robot','rocky','rouge','rough','round','route','royal','rugby','ruler','rural',
  'saint','salad','sauce','scale','scare','scene','scope','score','scout','sense',
  'serve','setup','seven','shade','shake','shall','shame','shape','share','shark',
  'sharp','sheep','sheer','sheet','shelf','shell','shift','shirt','shock','shore',
  'short','shout','sight','sigma','silly','since','sixth','sixty','sized','skill',
  'skull','slate','sleep','slice','slide','slope','smart','smell','smile','smoke',
  'solid','solve','sorry','south','space','spare','spark','speak','speed','spend',
  'spill','spine','spite','split','spoke','spray','squad','stack','staff','stage',
  'stain','stake','stale','stall','stamp','stand','stark','start','state','steak',
  'steal','steam','steel','steep','steer','stern','stick','stiff','still','stock',
  'stone','stood','store','storm','story','stove','strap','straw','strip','stuck',
  'study','stuff','style','sugar','suite','sunny','super','surge','swamp','swear',
  'sweep','sweet','swift','swing','sword','syrup','table','taste','teach','thank',
  'theme','thick','thing','think','third','thorn','those','three','throw','tight',
  'timer','tired','title','today','token','topic','total','touch','tough','towel',
  'tower','toxic','trace','track','trade','trail','train','trait','trash','treat',
  'trend','trial','tribe','trick','troop','truck','truly','trump','trunk','trust',
  'truth','tumor','tuner','twice','twist','ultra','uncle','under','unity','until',
  'upper','urban','usage','usual','valid','value','vault','venue','verse','video',
  'vigor','viral','virus','visit','vital','vivid','vocal','voice','voter','wagon',
  'waste','watch','water','weave','weigh','weird','whale','wheat','wheel','where',
  'which','while','white','whole','whose','witch','woman','world','worry','worse',
  'worst','worth','would','wound','wrist','write','wrong','yacht','yield','young',
  'youth',
];

// Valid guesses: includes all targets plus additional recognized words.
// Kept compact — only common words a player would reasonably try.
const EXTRA_VALID = [
  'adept','affix','agile','aisle','alley','alloy','annex','aroma','attic','badge',
  'bagel','barge','baron','basil','baton','beads','blink','bliss','blunt','blurb',
  'bobby','bogus','bolts','bored','braid','brash','brews','brine','brisk','broth',
  'bulge','bully','burns','bytes','camel','cargo','cedar','cello','chant','cheer',
  'chess','chief','chill','chips','choir','chore','cigar','cinch','clasp','cloak',
  'clown','clues','cocoa','coils','comma','conch','condo','coral','couch','coupe',
  'covet','crawl','creed','creep','crews','crust','cubic','curry','daisy','deals',
  'decal','decor','decoy','deity','delta','denim','dense','deter','digit','diner',
  'disco','ditch','dizzy','dodge','doing','dolls','dough','dowel','drape','drawl',
  'dryer','dunce','duvet','dwarf','dwell','easel','eater','edict','elite','elope',
  'embed','ember','emcee','emoji','ended','envoy','epoch','essay','ether','ethos',
  'evade','exert','exile','expat','facet','fable','falls','farce','fauna','feast',
  'femur','fiery','filth','finch','fizzy','fjord','flaky','flare','flask','flaws',
  'flesh','flint','flock','flora','floss','flute','foamy','foggy','foils','folly',
  'foyer','frail','freak','freed','friar','frost','froze','fuzzy','gains','gauge',
  'gauze','gavel','gecko','geese','genre','giddy','gizmo','gland','glare','glaze',
  'gleam','glint','gloat','gloss','gnome','going','goose','gouge','grace','grain',
  'grape','gravy','graze','greed','grime','grimy','gripe','groan','grope','grows',
  'gruel','grunt','guava','guise','gulch','gully','gummy','gusto','gypsy','haiku',
  'halve','haven','hazel','heals','heaps','helix','herbs','heron','hippo','hitch',
  'hoist','holly','homer','hooks','horde','horns','hover','husky','hyena','iambs',
  'icing','igloo','incur','inert','infer','ionic','ivory','jazzy','jelly','jewel',
  'joins','jolly','joust','jumbo','jumps','kayak','kebab','keeps','kelps','knack',
  'knead','kneel','knelt','knife','knobs','knock','knoll','labor','laced','ladle',
  'lance','lanky','lapse','latch','latex','lathe','latte','leach','leafy','leaky',
  'ledge','leech','legit','lemur','lever','lilac','limbo','lingo','llama','loads',
  'lobby','lodge','lofty','lotus','lucid','lumen','lunge','lusty','lynch','lyric',
  'macaw','macho','macro','mafia','mange','mango','marsh','mason','maxim','melee',
  'melon','mimic','mince','mocha','modal','mogul','molar','moose','morph','motif',
  'mourn','muddy','mulch','mural','musty','nacho','nasty','naval','navel','nerdy',
  'newly','niche','ninny','ninja','ninth','nomad','nudge','nylon','occur','omega',
  'onion','optic','ounce','outdo','ovals','ovary','oxide','panda','pansy','parse',
  'patio','pause','pecan','pedal','penny','perch','perks','pesto','petty','piano',
  'picky','piggy','pinch','pixel','plaid','plank','plaza','pleat','pluck','plumb',
  'plump','plunk','plush','poach','poker','ponds','poppy','porch','pouch','pouty',
  'prank','prawn','preen','primo','prism','privy','prong','prose','prude','prune',
  'puffy','qualm','quart','quasi','queen','query','quill','quirk','quota','rabbi',
  'racer','ranch','ravel','raven','rayon','rebut','rebus','recap','recon','recur',
  'redux','reign','relic','remit','renal','renew','repay','repel','retry','rinse',
  'ripen','risen','risky','rival','roast','rodeo','rogue','roost','rover','rowdy',
  'royal','rumba','rumor','rupee','rusty','sadly','safer','sagas','salty','salve',
  'sandy','sauna','savor','scald','scalp','scant','scarf','scary','scone','scoop',
  'scorn','scour','scram','scrub','sedan','seize','sever','shack','shady',
  'shawl','sheen','shrub','siege','sieve','siren','sissy','skate','skimp','skirt',
  'sland','slang','slash','sleek','slick','slimy','sling','slink','sloop','sloth',
  'slump','slung','smack','smear','smith','snack','snail','snake','snare','sneak',
  'sneer','snore','snout','soapy','solar','sonic','spade','spank','spawn','spear',
  'speck','spell','spicy','spied','spiky','spine','spiny','spire','spoof','spook',
  'spool','spoon','spore','sport','spout','sprig','spunk','spurt','squat','squid',
  'staid','staph','stark','stats','stays','stead','stems','stern','stiff','stoic',
  'stoke','stole','stomp','stool','stoop','stork','stout','strap','stray','strep',
  'strew','strut','stubs','studs','stump','stung','stunk','stunt','swamp','swank',
  'swell','swept','swirl','swoon','swoop','tabby','tacit','taffy','taint','talon',
  'tango','tangy','tapir','tardy','tarot','taunt','tawny','teeth','tempo','tense',
  'tepid','theft','their','think','thong','threw','throb','tiger','tidal','tithe',
  'toast','token','tonal','torch','torso','totem','tramp','trays','treks','tress',
  'triad','trice','trims','tripe','trite','troll','trots','trout','truce','tulip',
  'tulle','tumor','tunic','turbo','turns','tutor','twang','tweak','tweed','twine',
  'twirl','udder','ulcer','umbra','uncut','undue','undid','unfit','unify','union',
  'unite','unlit','unwed','usher','usurp','utile','utter','valet','vapor','vault',
  'vegan','veins','veldt','venom','vibes','vigor','vinyl','viola','viper','visor',
  'vodka','vogue','voila','volts','vouch','vowel','vying','wacky','wager','waist',
  'wares','warts','watch','weary','wedge','weeds','whale','wheat','wheel','whiff',
  'whine','whirl','whisk','wider','wield','wince','windy','witty','woken','woody',
  'works','wreak','wring','wrote','xenon','yearn','yeast','yodel','zebra','zesty',
];
export const WORDLE_VALID = new Set([...WORDLE_TARGETS, ...EXTRA_VALID]);

export function wordleFeedback(target, guess) {
  const result = Array(5).fill('absent');
  const remaining = Array.from(target);
  // First pass: mark correct letters.
  for (let i = 0; i < 5; i++) {
    if (guess[i] === target[i]) { result[i] = 'correct'; remaining[i] = null; }
  }
  // Second pass: mark present letters (consume leftmost remaining).
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    const j = remaining.indexOf(guess[i]);
    if (j !== -1) { result[i] = 'present'; remaining[j] = null; }
  }
  return result;
}

function deriveKeyboard(guesses) {
  const kb = {};
  for (const { word, feedback } of guesses) {
    for (let i = 0; i < 5; i++) {
      const letter = word[i], state = feedback[i];
      if (state === 'correct' || (state === 'present' && kb[letter] !== 'correct') || (!kb[letter])) kb[letter] = state;
    }
  }
  return kb;
}

export function createWordle(old = null, _difficulty, random = Math.random) {
  const target = WORDLE_TARGETS[Math.floor(random() * WORDLE_TARGETS.length)];
  return { target, draft: '', guesses: [], keyboard: {}, result: null, best: old?.best ?? null };
}

export function enterLetter(s, letter) {
  if (s.result || typeof letter !== 'string' || letter.length !== 1 || !/^[a-z]$/.test(letter) || s.draft.length >= 5) return s;
  return { ...s, draft: s.draft + letter };
}

export function deleteLetter(s) {
  if (s.result || s.draft.length === 0) return s;
  return { ...s, draft: s.draft.slice(0, -1) };
}

export function submitGuess(s) {
  if (s.result || s.draft.length !== 5 || !WORDLE_VALID.has(s.draft)) return s;
  const feedback = wordleFeedback(s.target, s.draft);
  const guesses = [...s.guesses, { word: s.draft, feedback }];
  const keyboard = deriveKeyboard(guesses);
  const won = feedback.every(f => f === 'correct');
  const result = won ? 'won' : guesses.length === 6 ? 'lost' : null;
  return { ...s, guesses, keyboard, draft: '', result, best: result === 'won' ? Math.min(s.best ?? Infinity, guesses.length) : s.best };
}

export function isValidWordle(s) {
  if (!s || typeof s.target !== 'string' || s.target.length !== 5 || !WORDLE_TARGETS.includes(s.target)) return false;
  if (typeof s.draft !== 'string' || s.draft.length > 5 || (s.draft.length > 0 && !/^[a-z]+$/.test(s.draft))) return false;
  if (!Array.isArray(s.guesses) || s.guesses.length > 6) return false;
  for (let i = 0; i < s.guesses.length; i++) {
    const g = s.guesses[i];
    if (!g || typeof g.word !== 'string' || g.word.length !== 5 || !WORDLE_VALID.has(g.word)) return false;
    if (!Array.isArray(g.feedback) || g.feedback.length !== 5) return false;
    const expected = wordleFeedback(s.target, g.word);
    for (let j = 0; j < 5; j++) { if (g.feedback[j] !== expected[j]) return false; }
    if (i < s.guesses.length - 1 && g.feedback.every(f => f === 'correct')) return false;
  }
  if (![null, 'won', 'lost'].includes(s.result)) return false;
  if (s.best !== null && (!Number.isSafeInteger(s.best) || s.best < 1 || s.best > 6)) return false;
  const won = s.guesses.length > 0 && s.guesses.at(-1).feedback.every(f => f === 'correct');
  const expectedResult = won ? 'won' : s.guesses.length === 6 ? 'lost' : null;
  if (s.result !== expectedResult) return false;
  if (s.result && s.draft.length > 0) return false;
  if (s.result === 'won' && (s.best === null || s.best > s.guesses.length)) return false;
  // Validate keyboard is consistent with guesses.
  if (typeof s.keyboard !== 'object' || s.keyboard === null) return false;
  const expected_kb = deriveKeyboard(s.guesses);
  for (const key of new Set([...Object.keys(s.keyboard), ...Object.keys(expected_kb)])) {
    if (s.keyboard[key] !== expected_kb[key]) return false;
  }
  return true;
}
