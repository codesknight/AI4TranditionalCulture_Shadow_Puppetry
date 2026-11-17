'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(
      require('./config.js'),
      require('./actions.js'),
      require('./entities.js'),
      require('./game.js'),
      require('./quest.js'),
    );
  else
    Object.assign(
      (root.ShadowTheatre ||= {}),
      factory(
        root.ShadowTheatre,
        root.ShadowTheatre,
        root.ShadowTheatre,
        root.ShadowTheatre,
        root.ShadowTheatre,
      ),
    );
})(
  globalThis,
  function (
    { CONFIG, boundedNumber },
    { ACTIONS },
    { createScene, findObject, updateObject, freezeTree },
    { initialGame, stepGame },
    { initialQuest, createQuest, createQuestScene, beginAttack, useFan, stepQuest },
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
        quest: initialQuest(),
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
          if (state.quest.status !== 'idle') return state;
          const scene = updateObject(state.scene, command.id, command.patch || {});
          if (scene === state.scene)
            return command.id === 'puppet' && state.action !== 'free'
              ? manual(state, scene)
              : state;
          return command.id === 'puppet' ? manual(state, scene) : { ...state, scene };
        }
        case 'SELECT_ACTION': {
          if (state.quest.status !== 'idle') return state;
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
          if (!['idle', 'playing'].includes(state.quest.status)) return state;
          if (state.scene.puppet.y < 0) return state;
          return manual(state, {
            ...state.scene,
            puppet: { ...state.scene.puppet, y: -0.01, velocityY: -360 },
          });
        }
        case 'FLIP':
          if (!['idle', 'playing'].includes(state.quest.status)) return state;
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
          return {
            ...initialState(),
            game: { ...initialGame(), event: state.game.event },
            quest: { ...initialQuest(), event: state.quest.event },
          };
        case 'MOVE': {
          if (!['idle', 'playing'].includes(state.quest.status)) return state;
          const dx = boundedNumber(command.dx, [-12, 12]);
          if (!dx) return state;
          const scene = updateObject(state.scene, 'puppet', {
            x: state.scene.puppet.x + dx,
            facing: dx > 0 ? 1 : -1,
          });
          return { ...manual(state, scene), quest: { ...state.quest, walkTime: 0.14 } };
        }
        case 'ATTACK':
          return { ...manual(state, state.scene), quest: beginAttack(state.quest) };
        case 'FAN':
          return { ...state, quest: useFan(state.quest) };
        case 'START_QUEST':
          return {
            ...initialState(),
            scene: createQuestScene(0),
            quest: createQuest(0, 0, state.quest.event + 1),
          };
        case 'NEXT_QUEST':
          return state.quest.status === 'interlude'
            ? {
                ...initialState(),
                scene: createQuestScene(state.quest.chapter + 1),
                quest: createQuest(
                  state.quest.chapter + 1,
                  state.quest.score,
                  state.quest.event + 1,
                  Math.min(3, state.quest.health + 1),
                ),
              }
            : state;
        case 'RETRY_QUEST':
          return state.quest.status === 'lost'
            ? {
                ...initialState(),
                scene: createQuestScene(state.quest.chapter),
                quest: createQuest(
                  state.quest.chapter,
                  state.quest.checkpointScore,
                  state.quest.event + 1,
                ),
              }
            : state;
        case 'PAUSE_GAME':
          if (['playing', 'paused'].includes(state.quest.status))
            return {
              ...state,
              quest: {
                ...state.quest,
                status: state.quest.status === 'playing' ? 'paused' : 'playing',
              },
            };
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
          if (state.quest.status !== 'idle') return state;
          return manual(state, { ...state.scene, puppet: createScene().puppet });
        case 'RESET_SCENE':
          return { ...initialState(), game: { ...initialGame(), event: state.game.event } };
        case 'TICK': {
          if (
            command.hidden ||
            state.game.status === 'paused' ||
            ['paused', 'interlude', 'lost', 'won'].includes(state.quest.status)
          )
            return state;
          const dt = boundedNumber(command.seconds, [0, CONFIG.maxFrameSeconds]);
          if (
            !dt ||
            (!state.playing &&
              state.scene.puppet.y === 0 &&
              state.game.status !== 'playing' &&
              state.quest.status !== 'playing' &&
              state.quest.attackTime === 0 &&
              state.quest.attackCooldown === 0 &&
              state.quest.walkTime === 0)
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
          const quest = stepQuest(next.quest, next.scene, dt, Number(command.seconds));
          return { ...next, game, quest };
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
