'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(require('./config.js'), require('./actions.js'));
  else Object.assign((root.ShadowTheatre ||= {}), factory(root.ShadowTheatre, root.ShadowTheatre));
})(globalThis, function ({ CONFIG, GRIPS, boundedNumber }, { ACTIONS }) {
  function initialState() {
    return {
      action: 'free',
      playing: false,
      time: 0,
      speed: 1,
      x: 0,
      liftL: 0,
      liftR: 0,
      light: 75,
      showRods: true,
    };
  }

  // Explicit commands make transitions testable without DOM or timers.
  function transition(state, command, actions = ACTIONS) {
    switch (command.type) {
      case 'SELECT_ACTION': {
        const action = actions.find((item) => item.id === command.id);
        return action ? { ...state, action: action.id, time: 0, playing: action.animate } : state;
      }
      case 'TOGGLE_PLAY':
        return state.action === 'free'
          ? transition(state, { type: 'SELECT_ACTION', id: 'wave' }, actions)
          : { ...state, playing: !state.playing };
      case 'SET_CONTROL': {
        if (!GRIPS.some((grip) => grip.field === command.field)) return state;
        const value = boundedNumber(command.value, CONFIG.limits[command.field]);
        return value === null
          ? state
          : { ...state, [command.field]: value, action: 'free', playing: false, time: 0 };
      }
      case 'SET_SETTING': {
        if (command.field === 'showRods') return { ...state, showRods: Boolean(command.value) };
        if (!['speed', 'light'].includes(command.field)) return state;
        const value = boundedNumber(command.value, CONFIG.limits[command.field]);
        return value === null ? state : { ...state, [command.field]: value };
      }
      case 'TICK': {
        if (!state.playing || command.hidden) return state;
        const delta = boundedNumber(command.seconds, [0, CONFIG.maxFrameSeconds]);
        return delta === null || delta === 0
          ? state
          : { ...state, time: state.time + delta * state.speed };
      }
      case 'RESET':
        return { ...state, action: 'free', playing: false, time: 0, x: 0, liftL: 0, liftR: 0 };
      default:
        return state;
    }
  }

  function createStore(state = initialState(), actions = ACTIONS) {
    let current = Object.freeze({ ...state });
    const listeners = new Set();
    return {
      getState: () => current,
      dispatch(command) {
        const next = transition(current, command, actions);
        if (next === current) return;
        const previous = current;
        current = Object.freeze(next);
        listeners.forEach((listener) => listener(current, previous));
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  }

  return { initialState, transition, createStore };
});
