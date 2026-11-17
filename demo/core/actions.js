'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else Object.assign((root.ShadowTheatre ||= {}), factory());
})(globalThis, function () {
  // Each strategy modifies a fresh pose only. UI and animation share this registry.
  const ACTIONS = Object.freeze(
    [
      {
        id: 'free',
        name: '自由操偶',
        icon: '⌁',
        subtitle: '随心牵引',
        title: '此刻，你是操偶师',
        note: '拖动签杆，或选择一段身法',
        animate: false,
        sample() {},
      },
      {
        id: 'wave',
        name: '挥袖招手',
        icon: '〰',
        subtitle: '抬臂 · 摆手',
        title: '挥袖招手',
        note: '手签提起，肘腕相随，向观众问好',
        animate: true,
        sample(p, t) {
          p.right = { x: 610 + 15 * Math.sin(t * 3), y: 170 + 25 * Math.sin(t * 4) };
        },
      },
      {
        id: 'walk',
        name: '信步登场',
        icon: '彳',
        subtitle: '迈步 · 行进',
        title: '信步登场',
        note: '主签牵身，双腿交替，缓缓走入光中',
        animate: true,
        sample(p, t) {
          p.x += 105 * Math.sin(t * 0.65);
          p.step = Math.sin(t * 3.5);
          p.y = -Math.abs(p.step) * 6;
          p.left.y += p.step * 22;
          p.right.y -= p.step * 22;
        },
      },
      {
        id: 'bow',
        name: '俯身行礼',
        icon: '⌒',
        subtitle: '俯身 · 起身',
        title: '俯身行礼',
        note: '身体前倾，再徐徐起身',
        animate: true,
        sample(p, t) {
          p.lean = 22 * (0.5 - 0.5 * Math.cos(t * 1.6));
          p.y = 8 * Math.sin(t * 0.8) ** 2;
          p.left = { x: 440, y: 315 };
          p.right = { x: 590, y: 315 };
        },
      },
      {
        id: 'salute',
        name: '拱手亮相',
        icon: '◇',
        subtitle: '合手 · 定势',
        title: '拱手亮相',
        note: '双手向胸前收拢，停顿亮相',
        animate: true,
        sample(p, t) {
          const f = (1 - Math.cos(t * 1.8)) / 2;
          p.left = { x: 310 + 193 * f, y: 295 - 45 * f };
          p.right = { x: 665 - 144 * f, y: 295 - 45 * f };
        },
      },
      {
        id: 'dance',
        name: '舒袖起舞',
        icon: '✧',
        subtitle: '展臂 · 摇身',
        title: '舒袖起舞',
        note: '左右手签交替提落，身形随之轻摇',
        animate: true,
        sample(p, t) {
          p.left = { x: 340 + 25 * Math.sin(t * 2), y: 240 - 85 * Math.sin(t * 2) };
          p.right = { x: 640 + 25 * Math.cos(t * 2), y: 240 + 85 * Math.sin(t * 2) };
          p.lean = 5 * Math.sin(t * 2);
          p.y = -4 * Math.sin(t * 2) ** 2;
        },
      },
    ].map(Object.freeze),
  );

  return { ACTIONS };
});
