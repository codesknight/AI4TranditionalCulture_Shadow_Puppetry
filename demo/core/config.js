'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else Object.assign((root.ShadowTheatre ||= {}), factory());
})(globalThis, function () {
  const CONFIG = Object.freeze({
    origin: Object.freeze({ x: 500, y: 375 }),
    shoulders: Object.freeze({
      left: Object.freeze({ x: 460, y: 252 }),
      right: Object.freeze({ x: 530, y: 252 }),
    }),
    armLength: 85,
    limits: Object.freeze({
      x: Object.freeze([-180, 180]),
      liftL: Object.freeze([-90, 90]),
      liftR: Object.freeze([-90, 90]),
      speed: Object.freeze([0.25, 1.75]),
      light: Object.freeze([25, 100]),
    }),
    maxFrameSeconds: 0.05,
  });

  const GRIPS = Object.freeze([
    Object.freeze({ id: 'left', index: 0, field: 'liftL', label: '左手签', offset: -65 }),
    Object.freeze({ id: 'body', index: 1, field: 'x', label: '主签', offset: 0 }),
    Object.freeze({ id: 'right', index: 2, field: 'liftR', label: '右手签', offset: 65 }),
  ]);

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function boundedNumber(value, range) {
    const number = Number(value);
    return Number.isFinite(number) ? clamp(number, ...range) : null;
  }

  return { CONFIG, GRIPS, clamp, boundedNumber };
});
