'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(require('./config.js'), require('./actions.js'));
  else Object.assign((root.ShadowTheatre ||= {}), factory(root.ShadowTheatre, root.ShadowTheatre));
})(globalThis, function ({ CONFIG, clamp }, { ACTIONS }) {
  // Project unreachable targets onto the arm's reachable circle before solving.
  function solveArm(shoulder, target, flip, length = CONFIG.armLength) {
    const dx = target.x - shoulder.x,
      dy = target.y - shoulder.y;
    const distance = clamp(Math.hypot(dx, dy), 0.001, length * 2);
    const direction = Math.atan2(dy, dx);
    const hand = {
      x: shoulder.x + distance * Math.cos(direction),
      y: shoulder.y + distance * Math.sin(direction),
    };
    const angle = direction + Math.acos(clamp(distance / (length * 2), -1, 1)) * flip;
    const elbow = {
      x: shoulder.x + length * Math.cos(angle),
      y: shoulder.y + length * Math.sin(angle),
    };
    return { shoulder, elbow, hand };
  }

  function toWorld(point, pose) {
    if (pose.facing === -1) point = { x: 1000 - point.x, y: point.y };
    const scale = pose.scale || 1;
    point = { x: 500 + (point.x - 500) * scale, y: 510 + (point.y - 510) * scale };
    const { origin } = CONFIG,
      radians = (pose.lean * Math.PI) / 180;
    return {
      x:
        pose.x +
        (point.x - origin.x) * Math.cos(radians) -
        (point.y - origin.y) * Math.sin(radians),
      y:
        origin.y +
        pose.y +
        (point.x - origin.x) * Math.sin(radians) +
        (point.y - origin.y) * Math.cos(radians),
    };
  }

  function getPose(state, actions = ACTIONS) {
    const puppet = state.scene.puppet;
    const l = (puppet.liftL * Math.PI) / 180,
      r = (puppet.liftR * Math.PI) / 180;
    const pose = {
      x: CONFIG.origin.x + puppet.x,
      y: 0,
      lean: 0,
      step: 0,
      facing: puppet.facing,
      scale: state.quest && state.quest.status !== 'idle' ? 0.5 : 1,
      attack: state.quest?.attackTime || 0,
      character: puppet.character,
      left: { x: 420 - 110 * Math.cos(l), y: 295 - 110 * Math.sin(l) },
      right: { x: 555 + 110 * Math.cos(r), y: 295 - 110 * Math.sin(r) },
    };
    (actions.find((action) => action.id === state.action) || actions[0]).sample(pose, state.time);
    if (state.quest?.walkTime > 0) pose.step = Math.sin(state.quest.elapsed * 12) * 0.7;
    if (pose.attack > 0) pose.right = { x: 660, y: 235 };
    pose.y += puppet.y;
    pose.arms = {
      left: solveArm(CONFIG.shoulders.left, pose.left, -1),
      right: solveArm(CONFIG.shoulders.right, pose.right, 1),
    };
    pose.left = pose.arms.left.hand;
    pose.right = pose.arms.right.hand;
    const joints = { left: pose.left, body: { x: 500, y: 310 }, right: pose.right };
    pose.rods = state.scene.rods.map((grip) => {
      const anchor = toWorld(joints[grip.joint], pose);
      return {
        ...grip,
        anchor,
      };
    });
    return pose;
  }

  function dragValue(drag, point) {
    const dx = point.x - drag.start.x,
      dy = point.y - drag.start.y;
    return drag.field === 'x'
      ? drag.value + dx
      : drag.value - dy * 0.8 + dx * (drag.field === 'liftL' ? -0.2 : 0.2);
  }

  return { solveArm, toWorld, getPose, dragValue };
});
