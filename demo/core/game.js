'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(
      require('./entities.js'),
      require('./kinematics.js'),
      require('./projection.js'),
    );
  else
    Object.assign(
      (root.ShadowTheatre ||= {}),
      factory(root.ShadowTheatre, root.ShadowTheatre, root.ShadowTheatre),
    );
})(globalThis, function ({ createScene }, { getPose }, { projectedJoints }) {
  const LEVELS = Object.freeze(
    [
      {
        name: '初登场',
        hint: '身体稍向左，抬起画面右手。',
        x: -75,
        liftL: 10,
        liftR: 65,
        depth: 850,
      },
      { name: '双袖迎风', hint: '双手举高，向右移步。', x: 80, liftL: 65, liftR: 65, depth: 850 },
      {
        name: '一大一小',
        hint: '试试影偶的「离灯距离」，让影子放大。',
        x: 0,
        liftL: 65,
        liftR: -25,
        depth: 710,
      },
      {
        name: '反身亮相',
        hint: '点击「转身」，再用手签对齐青色影子。',
        x: -50,
        liftL: -20,
        liftR: 70,
        depth: 850,
        facing: -1,
      },
      {
        name: '谢幕定格',
        hint: '向右移步，双袖展开，稳住最后一幕！',
        x: 100,
        liftL: 45,
        liftR: 15,
        depth: 790,
      },
    ].map(Object.freeze),
  );
  function initialGame() {
    return {
      status: 'idle',
      level: 0,
      score: 0,
      bonus: 0,
      combo: 0,
      remaining: 75,
      hold: 0,
      match: 0,
      event: 0,
    };
  }
  function targetScene(level) {
    const scene = createScene(),
      target = LEVELS[level];
    return {
      ...scene,
      puppet: {
        ...scene.puppet,
        x: target.x,
        liftL: target.liftL,
        liftR: target.liftR,
        depth: target.depth,
        facing: target.facing || 1,
      },
    };
  }
  function matchScore(state, target) {
    const actual = projectedJoints(getPose(state), state.scene);
    const expected = projectedJoints(getPose({ ...state, action: 'free', scene: target }), target);
    const distance =
      actual.reduce(
        (sum, point, i) => sum + Math.hypot(point.x - expected[i].x, point.y - expected[i].y),
        0,
      ) / 3;
    const facing = state.scene.puppet.facing === target.puppet.facing;
    const lit = state.scene.lightSource.intensity >= 45;
    return facing && lit ? Math.max(0, Math.round(100 - distance * 1.1)) : 0;
  }
  function stepGame(game, state, seconds, holdSeconds = seconds) {
    if (game.status !== 'playing') return game;
    const remaining = Math.max(0, game.remaining - seconds);
    if (remaining === 0) return { ...game, remaining, status: 'lost', hold: 0 };
    const match = matchScore(state, targetScene(game.level));
    const hold = match >= 86 && state.action === 'free' ? game.hold + holdSeconds : 0;
    if (hold < 0.65) return { ...game, match, hold, remaining };
    const combo = game.combo + 1,
      score = game.score + 100 + combo * 20;
    const won = game.level === LEVELS.length - 1;
    const bonus = won ? Math.ceil(remaining) * 2 : 0;
    return {
      ...game,
      score: score + bonus,
      bonus,
      combo,
      remaining,
      hold: 0,
      match: 100,
      level: won ? game.level : game.level + 1,
      status: won ? 'won' : 'playing',
      event: game.event + 1,
    };
  }
  return { LEVELS, initialGame, targetScene, matchScore, stepGame };
});
