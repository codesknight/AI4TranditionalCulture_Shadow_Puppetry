'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(require('./kinematics.js'));
  else Object.assign((root.ShadowTheatre ||= {}), factory(root.ShadowTheatre));
})(globalThis, function ({ toWorld }) {
  // Point-light projection along z, then a fixed display fit. Units are illustrative, not millimetres.
  function projection(scene) {
    const lamp = scene.lightSource,
      magnification = scene.screen.depth / scene.puppet.depth;
    const fit = 0.78;
    return {
      scale: fit * magnification,
      x: 500 * (1 - fit) + fit * (1 - magnification) * lamp.x + scene.screen.x,
      y: 300 * (1 - fit) + fit * (1 - magnification) * lamp.y + scene.screen.y,
      blur: lamp.softness * (magnification - 1),
      magnification,
    };
  }
  function projectPoint(point, scene) {
    const p = projection(scene);
    return { x: point.x * p.scale + p.x, y: point.y * p.scale + p.y };
  }
  function projectedJoints(pose, scene) {
    return [pose.left, { x: 500, y: 310 }, pose.right].map((point) =>
      projectPoint(toWorld(point, pose), scene),
    );
  }
  function projectedRods(pose, scene) {
    return pose.rods.map((rod) => {
      const anchor = projectPoint(rod.anchor, scene);
      return {
        ...rod,
        anchor,
        handle: { x: anchor.x + rod.offset, y: Math.max(85, Math.min(555, anchor.y + rod.length)) },
      };
    });
  }
  return { projection, projectPoint, projectedJoints, projectedRods };
});
