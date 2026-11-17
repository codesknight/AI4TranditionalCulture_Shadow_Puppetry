'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(
      require('./config.js'),
      require('./actions.js'),
      require('./entities.js'),
      require('./game.js'),
    );
  else
    Object.assign(
      (root.ShadowTheatre ||= {}),
      factory(root.ShadowTheatre, root.ShadowTheatre, root.ShadowTheatre, root.ShadowTheatre),
    );
})(
  globalThis,
  function (
    { CONFIG, boundedNumber },
    { ACTIONS },
    { createScene, findObject, updateObject, freezeTree },
    { initialGame, stepGame },
  ) {
    function initialState() {
      return {
        action: 'free',
        playing: false,
        time: 0,
        speed: 1,
        selectedId: 'puppet',
        scene: createScene(),
        game: initialGame(),
      };
    }
    function manual(state, scene) {
      return { ...state, scene, action: 'free', playing: false, time: 0 };
    }
    function transition(state, command, actions = ACTIONS) {
      switch (command.type) {
        case 'SELECT_OBJECT':
          return findObject(state.scene, command.id) ? { ...state, selectedId: command.id } : state;
        case 'UPDATE_OBJECT': {
          const scene = updateObject(state.scene, command.id, command.patch || {});
          if (scene === state.scene)
            return command.id === 'puppet' && state.action !== 'free'
              ? manual(state, scene)
              : state;
          return command.id === 'puppet' ? manual(state, scene) : { ...state, scene };
        }
        case 'SELECT_ACTION': {
          const action = actions.find((item) => item.id === command.id);
          return action ? { ...state, action: action.id, time: 0, playing: action.animate } : state;
        }
        case 'TOGGLE_PLAY':
          return state.action === 'free'
            ? transition(state, { type: 'SELECT_ACTION', id: 'wave' }, actions)
            : { ...state, playing: !state.playing };
        case 'SET_SPEED': {
          const speed = boundedNumber(command.value, CONFIG.limits.speed);
          return speed === null ? state : { ...state, speed };
        }
        case 'SHOW_RODS':
          return {
            ...state,
            scene: {
              ...state.scene,
              rods: state.scene.rods.map((rod) => ({ ...rod, visible: !!command.value })),
            },
          };
        case 'JUMP': {
          if (state.scene.puppet.y < 0) return state;
          return manual(state, {
            ...state.scene,
            puppet: { ...state.scene.puppet, y: -0.01, velocityY: -360 },
          });
        }
        case 'FLIP':
          return manual(state, {
            ...state.scene,
            puppet: { ...state.scene.puppet, facing: -state.scene.puppet.facing },
          });
        case 'START_GAME':
          return {
            ...initialState(),
            game: { ...initialGame(), status: 'playing', event: state.game.event + 1 },
          };
        case 'EXIT_GAME':
          return { ...state, game: { ...initialGame(), event: state.game.event } };
        case 'PAUSE_GAME':
          return ['playing', 'paused'].includes(state.game.status)
            ? {
                ...state,
                game: {
                  ...state.game,
                  status: state.game.status === 'playing' ? 'paused' : 'playing',
                },
              }
            : state;
        case 'RESET':
          return manual(state, { ...state.scene, puppet: createScene().puppet });
        case 'RESET_SCENE':
          return { ...initialState(), game: { ...initialGame(), event: state.game.event } };
        case 'TICK': {
          if (command.hidden || state.game.status === 'paused') return state;
          const dt = boundedNumber(command.seconds, [0, CONFIG.maxFrameSeconds]);
          if (
            !dt ||
            (!state.playing && state.scene.puppet.y === 0 && state.game.status !== 'playing')
          )
            return state;
          let next = state;
          if (state.playing) next = { ...next, time: state.time + dt * state.speed };
          if (state.scene.puppet.y < 0) {
            const puppet = state.scene.puppet;
            const velocityY = puppet.velocityY + 850 * dt,
              y = Math.min(0, puppet.y + velocityY * dt);
            next = {
              ...next,
              scene: {
                ...next.scene,
                puppet: { ...puppet, y, velocityY: y === 0 ? 0 : velocityY },
              },
            };
          }
          const game = stepGame(next.game, next, Number(command.seconds), dt);
          return game === next.game ? next : { ...next, game };
        }
        default:
          return state;
      }
    }
    function createStore(state = initialState(), actions = ACTIONS) {
      let current = freezeTree(state);
      const listeners = new Set();
      return {
        getState: () => current,
        dispatch(command) {
          const next = transition(current, command, actions);
          if (next === current) return;
          const previous = current;
          current = freezeTree(next);
          listeners.forEach((listener) => listener(current, previous));
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
    }
    return { initialState, transition, createStore };
  },
);
