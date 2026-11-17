const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ACTIONS } = require('../demo/core/actions.js');
const { CONFIG } = require('../demo/core/config.js');
const { createScene, updateObject, findObject } = require('../demo/core/entities.js');
const { initialState, transition, createStore } = require('../demo/core/model.js');
const { getPose, solveArm, toWorld } = require('../demo/core/kinematics.js');
const { projection, projectPoint, projectedRods } = require('../demo/core/projection.js');
const { LEVELS, targetScene, matchScore } = require('../demo/core/game.js');
const { puppetMarkup } = require('../demo/core/renderer.js');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('scene factories create four independent object types with stable references', () => {
  const a = createScene(),
    b = createScene();
  assert.notEqual(a.puppet, b.puppet);
  assert.notEqual(a.rods[0], b.rods[0]);
  const objects = [a.lightSource, a.screen, a.puppet, ...a.rods];
  assert.equal(new Set(objects.map((o) => o.id)).size, 6);
  a.rods.forEach((rod) => assert.equal(rod.puppetId, a.puppet.id));
});
test('updating one object preserves other objects and validates properties', () => {
  const scene = createScene(),
    next = updateObject(scene, 'lamp', { x: 9999, color: 'invalid', id: 'fake' });
  assert.equal(next.lightSource.x, 920);
  assert.equal(next.lightSource.color, 'amber');
  assert.equal(next.lightSource.id, 'lamp');
  assert.equal(next.puppet, scene.puppet);
  assert.equal(next.rods, scene.rods);
  assert.equal(updateObject(scene, 'missing', { x: 0 }), scene);
  assert.equal(updateObject(scene, 'puppet', { x: NaN }), scene);
});
test('rods change independently without modifying their attached puppet', () => {
  const scene = createScene(),
    next = updateObject(scene, 'rod-left', { length: 120, visible: false });
  assert.equal(next.rods[0].length, 120);
  assert.equal(next.rods[0].visible, false);
  assert.equal(next.rods[1], scene.rods[1]);
  assert.equal(next.puppet, scene.puppet);
});
test('all registered actions maintain finite geometry and fixed arm lengths', () => {
  for (const action of ACTIONS)
    for (let time = 0; time < 20; time += 0.2) {
      const pose = getPose({ ...initialState(), action: action.id, time });
      assert.doesNotMatch(puppetMarkup(pose), /NaN|Infinity|undefined/);
      for (const arm of Object.values(pose.arms)) {
        near(distance(arm.shoulder, arm.elbow), CONFIG.armLength);
        near(distance(arm.elbow, arm.hand), CONFIG.armLength);
      }
    }
});
test('IK handles unreachable and coincident targets', () => {
  for (const target of [
    { x: 1000, y: 1000 },
    { x: 0, y: 0 },
  ]) {
    const arm = solveArm({ x: 0, y: 0 }, target, -1);
    near(distance(arm.shoulder, arm.elbow), CONFIG.armLength);
    near(distance(arm.elbow, arm.hand), CONFIG.armLength);
  }
});
test('light, screen and puppet depth affect projection independently', () => {
  const scene = createScene(),
    point = { x: 600, y: 300 };
  assert.ok(
    projection(updateObject(scene, 'puppet', { depth: 700 })).scale > projection(scene).scale,
  );
  assert.ok(
    projection(updateObject(scene, 'screen', { depth: 1000 })).scale > projection(scene).scale,
  );
  assert.notEqual(
    projectPoint(point, updateObject(scene, 'lamp', { x: 800 })).x,
    projectPoint(point, scene).x,
  );
  near(
    projectPoint(point, updateObject(scene, 'screen', { x: 25 })).x - projectPoint(point, scene).x,
    25,
  );
});
test('manual puppet changes interrupt animation, preserve preferences and clamp values', () => {
  let state = transition(initialState(), { type: 'SELECT_ACTION', id: 'dance' });
  state = transition(state, { type: 'UPDATE_OBJECT', id: 'puppet', patch: { x: 999 } });
  assert.equal(state.scene.puppet.x, 360);
  assert.equal(state.action, 'free');
  assert.equal(state.playing, false);
  state = transition(state, { type: 'UPDATE_OBJECT', id: 'lamp', patch: { intensity: 50 } });
  state = transition(state, { type: 'RESET' });
  assert.equal(state.scene.puppet.x, 0);
  assert.equal(state.scene.lightSource.intensity, 50);
});
test('pause and hidden tabs do not advance animation; large gaps are bounded', () => {
  let state = transition(initialState(), { type: 'SELECT_ACTION', id: 'walk' });
  state = transition(state, { type: 'TICK', seconds: 20 });
  near(state.time, 0.05);
  assert.equal(transition(state, { type: 'TICK', seconds: 0.05, hidden: true }), state);
  state = transition(state, { type: 'TOGGLE_PLAY' });
  assert.equal(transition(state, { type: 'TICK', seconds: 0.05 }), state);
});
test('jump cannot stack in midair, lands on ground, and flip reverses facing', () => {
  let state = transition(initialState(), { type: 'JUMP' });
  assert.ok(state.scene.puppet.y < 0);
  assert.equal(transition(state, { type: 'JUMP' }), state);
  for (let i = 0; i < 100; i++) state = transition(state, { type: 'TICK', seconds: 0.02 });
  assert.equal(state.scene.puppet.y, 0);
  assert.equal(state.scene.puppet.velocityY, 0);
  state = transition(state, { type: 'FLIP' });
  assert.equal(state.scene.puppet.facing, -1);
  const pose = getPose(state);
  near(toWorld({ x: 460, y: 300 }, pose).x, 540);
});
test('store snapshots freeze nested objects and support unsubscribe', () => {
  const store = createStore();
  const snapshot = store.getState();
  let calls = 0;
  const unsubscribe = store.subscribe(() => calls++);
  store.dispatch({ type: 'FLIP' });
  assert.equal(snapshot.scene.puppet.facing, 1);
  assert.ok(Object.isFrozen(store.getState().scene.rods[0]));
  assert.equal(calls, 1);
  unsubscribe();
  store.dispatch({ type: 'RESET' });
  assert.equal(calls, 1);
});
test('a new action requires no changes to the model or IK solver', () => {
  const actions = [
    ...ACTIONS,
    {
      id: 'new',
      animate: true,
      sample(pose) {
        pose.lean = 12;
      },
    },
  ];
  const state = transition(initialState(), { type: 'SELECT_ACTION', id: 'new' }, actions);
  assert.equal(getPose(state, actions).lean, 12);
});
test('every level is reachable by allowed object values and matches its ghost exactly', () => {
  for (let i = 0; i < LEVELS.length; i++) {
    const scene = targetScene(i),
      state = { ...initialState(), scene };
    assert.equal(matchScore(state, scene), 100);
    assert.equal(findObject(scene, 'puppet').type, 'puppet');
  }
});
test('level completion needs sustained alignment, advances once and rewards a combo', () => {
  let state = transition(initialState(), { type: 'START_GAME' });
  state = { ...state, scene: targetScene(0) };
  for (let i = 0; i < 12; i++) state = transition(state, { type: 'TICK', seconds: 0.05 });
  assert.equal(state.game.level, 0);
  state = transition(state, { type: 'TICK', seconds: 0.05 });
  assert.equal(state.game.level, 1);
  assert.equal(state.game.score, 120);
  assert.equal(state.game.combo, 1);
  assert.equal(state.game.hold, 0);
});
test('five aligned levels win; restarting clears score and scene mutations', () => {
  let state = transition(initialState(), { type: 'START_GAME' });
  for (let level = 0; level < LEVELS.length; level++) {
    state = { ...state, scene: targetScene(level) };
    for (let i = 0; i < 14 && state.game.level === level && state.game.status === 'playing'; i++)
      state = transition(state, { type: 'TICK', seconds: 0.05 });
  }
  assert.equal(state.game.status, 'won');
  assert.equal(state.game.score, 800 + state.game.bonus);
  assert.equal(state.game.bonus, Math.ceil(state.game.remaining) * 2);
  state = transition(state, { type: 'START_GAME' });
  assert.equal(state.game.score, 0);
  assert.equal(state.game.status, 'playing');
  assert.equal(state.scene.puppet.x, 0);
});
test('failure, hidden-page pause, low light and wrong facing have explicit rules', () => {
  let state = transition(initialState(), { type: 'START_GAME' });
  assert.equal(transition(state, { type: 'TICK', seconds: 0.05, hidden: true }), state);
  const target = targetScene(0);
  state = { ...state, scene: target };
  assert.equal(
    matchScore({ ...state, scene: updateObject(target, 'lamp', { intensity: 25 }) }, target),
    0,
  );
  assert.equal(
    matchScore({ ...state, scene: updateObject(target, 'puppet', { facing: -1 }) }, target),
    0,
  );
  state = { ...state, game: { ...state.game, remaining: 0.01 } };
  state = transition(state, { type: 'TICK', seconds: 0.05 });
  assert.equal(state.game.status, 'lost');
});
test('unknown commands and invalid settings preserve valid state', () => {
  const state = initialState();
  assert.equal(transition(state, { type: 'UNKNOWN' }), state);
  assert.equal(transition(state, { type: 'SELECT_ACTION', id: 'missing' }), state);
  assert.equal(transition(state, { type: 'SET_SPEED', value: NaN }), state);
  assert.equal(transition(state, { type: 'SET_SPEED', value: 99 }).speed, 1.75);
});

test('facing accepts only two directions and a paused game freezes its timer', () => {
  const scene = createScene();
  assert.equal(updateObject(scene, 'puppet', { facing: 0 }), scene);
  let state = transition(initialState(), { type: 'START_GAME' });
  state = transition(state, { type: 'PAUSE_GAME' });
  assert.equal(state.game.status, 'paused');
  assert.equal(transition(state, { type: 'TICK', seconds: 0.05 }), state);
  state = transition(state, { type: 'PAUSE_GAME' });
  assert.equal(state.game.status, 'playing');
});

test('inherited object keys are ignored rather than treated as editable fields', () => {
  const scene = createScene();
  assert.equal(updateObject(scene, 'puppet', { toString: 10, constructor: 30 }), scene);
});

test('rod joint attachment follows its identity rather than array order', () => {
  const state = initialState(),
    reversed = { ...state, scene: { ...state.scene, rods: [...state.scene.rods].reverse() } };
  const before = projectedRods(getPose(state), state.scene),
    after = projectedRods(getPose(reversed), reversed.scene);
  for (const rod of before)
    assert.deepEqual(
      after.find((item) => item.id === rod.id),
      rod,
    );
});

test('challenge counts elapsed foreground time without granting an instant hold on a long frame', () => {
  let state = transition(initialState(), { type: 'START_GAME' });
  state = { ...state, scene: targetScene(0) };
  state = transition(state, { type: 'TICK', seconds: 3 });
  near(state.game.remaining, 72);
  near(state.game.hold, 0.05);
  assert.equal(state.game.level, 0);
});
