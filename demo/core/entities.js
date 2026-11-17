'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(require('./config.js'));
  else Object.assign((root.ShadowTheatre ||= {}), factory(root.ShadowTheatre));
})(globalThis, function ({ boundedNumber, GRIPS, CONFIG }) {
  // Independent value objects. IDs are stable; rods reference a puppet and joint by ID.
  const ENTITY_FIELDS = Object.freeze({
    light: {
      x: [80, 920],
      y: [55, 490],
      intensity: [25, 100],
      softness: [0, 5],
      color: ['amber', 'moon', 'rose'],
    },
    screen: {
      x: [-55, 55],
      y: [-25, 25],
      depth: [900, 1000],
      material: ['silk', 'paper', 'night'],
    },
    puppet: {
      x: CONFIG.limits.x,
      liftL: CONFIG.limits.liftL,
      liftR: CONFIG.limits.liftR,
      depth: [680, 880],
      facing: [-1, 1],
    },
    rod: { length: [100, 220], visible: 'boolean' },
  });
  function createLightSource() {
    return {
      id: 'lamp',
      type: 'light',
      x: 180,
      y: 110,
      intensity: 85,
      softness: 0.4,
      color: 'amber',
    };
  }
  function createScreen() {
    return { id: 'screen', type: 'screen', x: 0, y: 0, depth: 950, material: 'silk' };
  }
  function createPuppet() {
    return {
      id: 'puppet',
      type: 'puppet',
      x: 0,
      y: 0,
      velocityY: 0,
      liftL: 0,
      liftR: 0,
      depth: 850,
      facing: 1,
    };
  }
  function createRod(grip) {
    return {
      id: `rod-${grip.id}`,
      type: 'rod',
      puppetId: 'puppet',
      joint: grip.id,
      field: grip.field,
      label: grip.label,
      offset: grip.offset,
      length: 170,
      visible: true,
    };
  }
  function createScene() {
    return {
      lightSource: createLightSource(),
      screen: createScreen(),
      puppet: createPuppet(),
      rods: GRIPS.map(createRod),
    };
  }
  function findObject(scene, id) {
    return [scene.lightSource, scene.screen, scene.puppet, ...scene.rods].find(
      (object) => object.id === id,
    );
  }
  function updateObject(scene, id, patch) {
    const object = findObject(scene, id);
    if (!object) return scene;
    const next = { ...object };
    for (const [key, value] of Object.entries(patch)) {
      if (!Object.prototype.hasOwnProperty.call(ENTITY_FIELDS[object.type], key)) continue;
      const rule = ENTITY_FIELDS[object.type][key];
      if (!rule) continue;
      if (key === 'facing' && ![-1, 1].includes(Number(value))) continue;
      if (rule === 'boolean') {
        if (typeof value === 'boolean') next[key] = value;
      } else if (typeof rule[0] === 'string') {
        if (rule.includes(value)) next[key] = value;
      } else {
        const number = boundedNumber(value, rule);
        if (number !== null) next[key] = number;
      }
    }
    if (Object.keys(next).every((key) => next[key] === object[key])) return scene;
    if (object.type === 'rod')
      return { ...scene, rods: scene.rods.map((rod) => (rod.id === id ? next : rod)) };
    const key = { light: 'lightSource', screen: 'screen', puppet: 'puppet' }[object.type];
    return { ...scene, [key]: next };
  }
  function freezeTree(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freezeTree);
      Object.freeze(value);
    }
    return value;
  }
  return {
    ENTITY_FIELDS,
    createLightSource,
    createScreen,
    createPuppet,
    createRod,
    createScene,
    findObject,
    updateObject,
    freezeTree,
  };
});
