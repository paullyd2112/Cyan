import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULE_OPTIONS, START_RULES, mulberry32, applyControls, stepState, startState, solve, generateLevel, mutateRules } from './core.js';

// Build a level from rows: S start, E exit, K key, X hazard, # wall.
const lvl = (rows) => {
  const find = (ch) => rows.flatMap((r, y) => [...r].map((c, x) => (c === ch ? [x, y] : null))).filter(Boolean);
  return { w: rows[0].length, h: rows.length, grid: rows.map((r) => r.replace(/[SEK]/g, '.')), start: find('S')[0], exit: find('E')[0], keys: find('K') };
};
const R = (o = {}) => ({ ...START_RULES, ...o });

test('controls: mirrored swaps left/right, rotated turns clockwise', () => {
  assert.equal(applyControls('mirrored', 'left'), 'right');
  assert.equal(applyControls('mirrored', 'up'), 'up');
  assert.equal(applyControls('rotated', 'up'), 'right');
  assert.equal(applyControls('rotated', 'left'), 'up');
});

test('step moves one tile; slide runs until a wall', () => {
  const l = lvl(['S...E']);
  assert.equal(stepState(l, R(), startState(l), 'right').x, 1);
  assert.equal(stepState(l, R({ move: 'slide' }), startState(l), 'right').won, true);
  const l2 = lvl(['S..#E']);
  assert.equal(stepState(l2, R({ move: 'slide' }), startState(l2), 'right').x, 2);
});

test('hazards: lethal kills, reset returns to start, safe is harmless', () => {
  const l = lvl(['SXE']); l.grid[0] = '.X.';
  assert.equal(stepState(l, R({ hazard: 'lethal' }), startState(l), 'right').dead, true);
  const reset = stepState(l, R({ hazard: 'reset' }), startState(l), 'right');
  assert.deepEqual([reset.x, reset.y, reset.dead], [0, 0, false]);
  assert.equal(stepState(l, R({ hazard: 'safe' }), startState(l), 'right').x, 1);
});

test('keys goal: exit only counts after every key is collected', () => {
  const l = lvl(['SEK']);
  const rules = R({ goal: 'keys' });
  const onExit = stepState(l, rules, startState(l), 'right');
  assert.equal(onExit.won, false);
  const afterKey = stepState(l, rules, onExit, 'right');
  assert.equal(afterKey.keys, 1);
  assert.equal(stepState(l, rules, afterKey, 'left').won, true);
});

test('solver finds shortest path and reports unsolvable levels', () => {
  assert.equal(solve(lvl(['S..E']), R()), 3);
  assert.equal(solve(lvl(['S#E']), R()), -1);
  const haz = lvl(['SXE']); haz.grid[0] = '.X.';
  assert.equal(solve(haz, R({ hazard: 'lethal' })), -1);
  assert.equal(solve(haz, R({ hazard: 'safe' })), 2);
});

test('every rule combination yields solvable, non-trivial levels (fairness)', () => {
  const combos = [];
  for (const move of RULE_OPTIONS.move) for (const hazard of RULE_OPTIONS.hazard)
    for (const controls of RULE_OPTIONS.controls) for (const goal of RULE_OPTIONS.goal)
      for (const gravity of RULE_OPTIONS.gravity) combos.push({ move, hazard, controls, goal, gravity });
  assert.equal(combos.length, 72);
  for (const rules of combos) for (let seed = 1; seed <= 12; seed++) {
    const difficulty = seed % 10; // also covers the late-run difficulty ramp
    const level = generateLevel(rules, mulberry32(seed), 7, difficulty);
    assert.equal(solve(level, rules), level.par, JSON.stringify(rules));
    assert.ok(level.par >= 3);
  }
});

test('mutation changes exactly one rule', () => {
  const rng = mulberry32(7);
  let rules = START_RULES;
  for (let i = 0; i < 200; i++) {
    const m = mutateRules(rules, rng);
    assert.deepEqual(Object.keys(rules).filter((k) => rules[k] !== m.rules[k]), [m.dim]);
    rules = m.rules;
  }
});

test('gravity: you fall after moving, and controls never rotate it', () => {
  const l = lvl(['S..', '...', '.E.']);
  const g = R({ gravity: 'down' });
  assert.deepEqual(stepState(l, g, startState(l), 'right').y, 2); // moved right, fell to the floor row
  const rotated = R({ gravity: 'down', controls: 'rotated' }); // "up" becomes right; gravity still pulls down
  const r = stepState(l, rotated, startState(l), 'up');
  assert.deepEqual([r.x, r.y], [1, 2]);
});

test('gravity: falling through a hazard is lethal, onto the exit wins', () => {
  const l = lvl(['S', '.', 'X', 'E']); l.grid[2] = 'X';
  assert.equal(stepState(l, R({ gravity: 'down' }), startState(l), 'up').dead, true);
  const l2 = lvl(['S', '.', 'E']);
  assert.equal(stepState(l2, R({ gravity: 'down' }), startState(l2), 'up').won, true);
});

test('difficulty raises the minimum solution length', () => {
  const rules = R();
  const easy = Array.from({ length: 20 }, (_, i) => generateLevel(rules, mulberry32(i + 1), 7, 0).par);
  const hard = Array.from({ length: 20 }, (_, i) => generateLevel(rules, mulberry32(i + 1), 7, 8).par);
  assert.ok(Math.min(...hard) >= Math.min(...easy) + 2);
});
