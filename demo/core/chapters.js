'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else Object.assign((root.ShadowTheatre ||= {}), factory());
})(globalThis, function () {
  // Original game adaptation inspired by Journey to the West; no dependency on a screen adaptation.
  const CHAPTERS = [
    {
      id: 'mountain',
      name: '花果山',
      subtitle: '第一回 · 灵猴初试金箍棒',
      story: '山间精怪拦住归路。收起仙桃，挥棒开路，回到水帘洞！',
      objective: '收集 3 枚仙桃，击退山精，前往右侧水帘洞。',
      material: 'silk',
      color: 'amber',
      exit: '水帘洞',
      items: [
        { x: 270, y: 450 },
        { x: 480, y: 398 },
        { x: 665, y: 450 },
      ],
      enemies: [
        { x: 420, kind: 'guard', hp: 1, speed: 30, range: 45 },
        { x: 700, kind: 'guard', hp: 1, speed: 38, range: 40 },
      ],
      hazards: [],
    },
    {
      id: 'bones',
      name: '白骨岭',
      subtitle: '第二回 · 棒打白骨妖',
      story: '雾起白骨岭，莫被妖形迷了眼。看准来路，降伏守关的白骨妖。',
      objective: '收集 2 枚仙桃，击败白骨妖与巡山小妖，抵达山门。',
      material: 'night',
      color: 'moon',
      exit: '西行山门',
      items: [
        { x: 290, y: 450 },
        { x: 530, y: 398 },
      ],
      enemies: [
        { x: 410, kind: 'guard', hp: 2, speed: 40, range: 50 },
        { x: 690, kind: 'skeleton', hp: 3, speed: 35, range: 55 },
      ],
      hazards: [],
    },
    {
      id: 'fire',
      name: '火焰山',
      subtitle: '第三回 · 借扇越火焰',
      story: '山火阻断西行路。跃起取扇，借一阵清风，越过灼热的山口。',
      objective: '跳起拿到芭蕉扇，K 扇风灭火，击败牛魔守将后过山。',
      material: 'silk',
      color: 'rose',
      exit: '西行古道',
      items: [{ x: 430, y: 398, kind: 'fan' }],
      enemies: [{ x: 710, kind: 'bull', hp: 4, speed: 28, range: 45 }],
      hazards: [
        { x: 330, width: 46 },
        { x: 540, width: 46 },
      ],
    },
  ];
  CHAPTERS.forEach((chapter) => {
    chapter.items.forEach(Object.freeze);
    chapter.enemies.forEach(Object.freeze);
    chapter.hazards.forEach(Object.freeze);
    Object.freeze(chapter.items);
    Object.freeze(chapter.enemies);
    Object.freeze(chapter.hazards);
    Object.freeze(chapter);
  });
  return { CHAPTERS: Object.freeze(CHAPTERS) };
});
