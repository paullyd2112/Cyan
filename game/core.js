// Rule Drift core: rules, movement, level generation, and the solver that keeps every level fair.
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export const RULE_OPTIONS = {
  move: ['step', 'slide'],
  hazard: ['lethal', 'reset', 'safe'],
  controls: ['normal', 'mirrored', 'rotated'],
  goal: ['reach', 'keys'],
};
export const RULE_LABEL = { move: 'Movement', hazard: 'Red tiles', controls: 'Controls', goal: 'Goal' };
export const RULE_TEXT = {
  move: { step: 'Each press moves you one tile.', slide: 'You slide until a wall stops you.' },
  hazard: { lethal: 'Touching one ends the run.', reset: 'Touching one sends you back to the start.', safe: 'They are harmless.' },
  controls: { normal: 'Arrows move you where they point.', mirrored: 'Left and right are swapped.', rotated: 'Inputs turn 90° clockwise: up moves right.' },
  goal: { reach: 'Step onto the exit.', keys: 'Collect every key, then step onto the exit.' },
};
export const START_RULES = { move: 'step', hazard: 'lethal', controls: 'normal', goal: 'reach' };

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROTATE = { up: 'right', right: 'down', down: 'left', left: 'up' };
const MIRROR = { up: 'up', down: 'down', left: 'right', right: 'left' };
export function applyControls(controls, dir) {
  return controls === 'mirrored' ? MIRROR[dir] : controls === 'rotated' ? ROTATE[dir] : dir;
}

export const startState = (level) => ({ x: level.start[0], y: level.start[1], keys: 0 });
const fullKeys = (level) => (1 << level.keys.length) - 1;

/** One input. Returns { x, y, keys, won, dead }. */
export function stepState(level, rules, st, inputDir) {
  const [dx, dy] = DIRS[applyControls(rules.controls, inputDir)];
  let { x, y, keys } = st;
  const reps = rules.move === 'slide' ? Infinity : 1;
  for (let i = 0; i < reps; i++) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= level.w || ny >= level.h || level.grid[ny][nx] === '#') break;
    x = nx; y = ny;
    if (level.grid[y][x] === 'X' && rules.hazard !== 'safe') {
      if (rules.hazard === 'lethal') return { x, y, keys, won: false, dead: true };
      [x, y] = level.start; // reset
      break;
    }
    const k = level.keys.findIndex(([kx, ky]) => kx === x && ky === y);
    if (k >= 0) keys |= 1 << k;
    if (x === level.exit[0] && y === level.exit[1] && keys === fullKeys(level)) return { x, y, keys, won: true, dead: false };
  }
  return { x, y, keys, won: false, dead: false };
}

/** Breadth-first search over (position, keys). Returns the fewest inputs to win, or -1. */
export function solve(level, rules) {
  const key = (s) => `${s.x},${s.y},${s.keys}`;
  const first = startState(level);
  const seen = new Set([key(first)]);
  let frontier = [first];
  for (let depth = 1; frontier.length; depth++) {
    const next = [];
    for (const s of frontier) for (const d of Object.keys(DIRS)) {
      const r = stepState(level, rules, s, d);
      if (r.dead) continue;
      if (r.won) return depth;
      const k = key(r);
      if (!seen.has(k)) { seen.add(k); next.push(r); }
    }
    frontier = next;
  }
  return -1;
}

/** Generates a level that is solvable under `rules` and neither trivial nor tedious. */
export function generateLevel(rules, rng, size = 7) {
  const [lo, hi] = rules.move === 'slide' ? [3, 16] : [6, 22];
  for (let attempt = 0; attempt < 5000; attempt++) {
    const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => {
      const r = rng();
      return r < 0.2 ? '#' : r < 0.32 ? 'X' : '.';
    }));
    const free = [];
    grid.forEach((row, y) => row.forEach((c, x) => c === '.' && free.push([x, y])));
    const nKeys = rules.goal === 'keys' ? 2 : 0;
    if (free.length < 3 + nKeys) continue;
    const pick = () => free.splice(Math.floor(rng() * free.length), 1)[0];
    const start = pick(), exit = pick(), keys = Array.from({ length: nKeys }, pick);
    const level = { w: size, h: size, grid: grid.map((r) => r.join('')), start, exit, keys };
    const par = solve(level, rules);
    if (par >= lo && par <= hi) return { ...level, par };
  }
  throw new Error('could not generate a level for ' + JSON.stringify(rules));
}

/** Changes exactly one rule to a different value. */
export function mutateRules(rules, rng) {
  const dims = Object.keys(RULE_OPTIONS);
  const dim = dims[Math.floor(rng() * dims.length)];
  const options = RULE_OPTIONS[dim].filter((v) => v !== rules[dim]);
  const to = options[Math.floor(rng() * options.length)];
  return { rules: { ...rules, [dim]: to }, dim, from: rules[dim], to };
}
