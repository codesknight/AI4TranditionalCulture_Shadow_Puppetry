const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ACTIONS } = require('../demo/core/actions.js');
const { CONFIG } = require('../demo/core/config.js');
const { initialState, transition, createStore } = require('../demo/core/model.js');
const { getPose, solveArm, toWorld, dragValue } = require('../demo/core/kinematics.js');
const { puppetMarkup } = require('../demo/core/renderer.js');
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('all registered actions yield finite geometry and fixed-length arms', () => {
  assert.equal(new Set(ACTIONS.map((action) => action.id)).size, ACTIONS.length);
  for (const action of ACTIONS) {
    for (let time = 0; time <= 20; time += 0.2) {
      const pose = getPose({ ...initialState(), action: action.id, time });
      assert.doesNotMatch(puppetMarkup(pose), /NaN|Infinity|undefined/);
      for (const arm of Object.values(pose.arms)) {
        near(distance(arm.shoulder, arm.elbow), CONFIG.armLength);
        near(distance(arm.elbow, arm.hand), CONFIG.armLength);
      }
      for (const rod of pose.rods)
        assert.ok(Number.isFinite(rod.handle.x) && Number.isFinite(rod.handle.y));
    }
  }
});
test('IK handles unreachable and coincident targets without stretching', () => {
  for (const target of [
    { x: 1000, y: 1000 },
    { x: 0, y: 0 },
  ]) {
    const arm = solveArm({ x: 0, y: 0 }, target, -1);
    near(distance(arm.shoulder, arm.elbow), CONFIG.armLength);
    near(distance(arm.elbow, arm.hand), CONFIG.armLength);
    assert.ok(distance(arm.shoulder, arm.hand) <= CONFIG.armLength * 2 + 1e-7);
  }
});
test('manual controls enforce bounds, reject invalid numbers and stop playback', () => {
  const playing = transition(initialState(), { type: 'SELECT_ACTION', id: 'dance' });
  const state = transition(playing, { type: 'SET_CONTROL', field: 'x', value: 999 });
  assert.equal(state.x, 180);
  assert.equal(state.action, 'free');
  assert.equal(state.playing, false);
  for (const value of [NaN, Infinity, 'bad'])
    assert.equal(transition(state, { type: 'SET_CONTROL', field: 'x', value }), state);
  assert.equal(transition(state, { type: 'SET_CONTROL', field: '__proto__', value: 1 }), state);
  assert.equal(playing.action, 'dance'); // Input state was not mutated.
});
test('pause, hidden tabs and long frame gaps have explicit time semantics', () => {
  let state = transition(initialState(), { type: 'SELECT_ACTION', id: 'walk' });
  state = transition(state, { type: 'SET_SETTING', field: 'speed', value: 1.5 });
  state = transition(state, { type: 'TICK', seconds: 10 });
  near(state.time, 0.075);
  const hidden = transition(state, { type: 'TICK', seconds: 0.05, hidden: true });
  assert.equal(hidden, state);
  state = transition(state, { type: 'TOGGLE_PLAY' });
  assert.equal(transition(state, { type: 'TICK', seconds: 0.05 }), state);
});
test('settings are bounded, unknown commands ignored, reset preserves preferences', () => {
  let state = initialState();
  state = transition(state, { type: 'SET_SETTING', field: 'speed', value: 20 });
  assert.equal(state.speed, 1.75);
  state = transition(state, { type: 'SET_SETTING', field: 'light', value: -50 });
  assert.equal(state.light, 25);
  assert.equal(transition(state, { type: 'SELECT_ACTION', id: 'missing' }), state);
  assert.equal(transition(state, { type: 'UNKNOWN' }), state);
  state = transition({ ...state, x: 120, liftL: 40 }, { type: 'RESET' });
  assert.equal(state.x, 0);
  assert.equal(state.liftL, 0);
  assert.equal(state.light, 25);
  assert.equal(state.speed, 1.75);
});
test('store publishes immutable snapshots and supports unsubscribe', () => {
  const store = createStore();
  let calls = 0;
  const unsubscribe = store.subscribe(() => calls++);
  const snapshot = store.getState();
  store.dispatch({ type: 'SET_CONTROL', field: 'x', value: 10 });
  assert.equal(snapshot.x, 0);
  assert.ok(Object.isFrozen(store.getState()));
  assert.equal(calls, 1);
  unsubscribe();
  store.dispatch({ type: 'RESET' });
  assert.equal(calls, 1);
});
test('new action strategies work without modifying state or geometry modules', () => {
  const actions = [
    ...ACTIONS,
    {
      id: 'test',
      animate: true,
      sample(pose) {
        pose.lean = 12;
      },
    },
  ];
  const state = transition(initialState(), { type: 'SELECT_ACTION', id: 'test' }, actions);
  assert.equal(getPose(state, actions).lean, 12);
});
test('world transform and drag deltas follow the SVG coordinate model', () => {
  const point = toWorld({ x: 500, y: 375 }, { x: 600, y: 20, lean: 90 });
  near(point.x, 600);
  near(point.y, 395);
  assert.equal(dragValue({ field: 'x', start: { x: 10, y: 20 }, value: 5 }, { x: 30, y: 20 }), 25);
  assert.equal(
    dragValue({ field: 'liftL', start: { x: 0, y: 0 }, value: 0 }, { x: 0, y: -50 }),
    40,
  );
});
