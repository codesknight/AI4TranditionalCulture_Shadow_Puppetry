'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(require('./chapters.js'), require('./entities.js'));
  else Object.assign((root.ShadowTheatre ||= {}), factory(root.ShadowTheatre, root.ShadowTheatre));
})(globalThis, function ({ CHAPTERS }, { createScene }) {
  function initialQuest() {
    return {
      status: 'idle',
      chapter: 0,
      health: 3,
      score: 0,
      checkpointScore: 0,
      remaining: 90,
      elapsed: 0,
      enemies: [],
      items: [],
      attackTime: 0,
      attackCooldown: 0,
      attackId: 0,
      invulnerable: 0,
      walkTime: 0,
      hasFan: false,
      wind: 0,
      fanCooldown: 0,
      event: 0,
      message: '',
    };
  }
  function createQuest(chapter = 0, score = 0, event = 0, health = 3) {
    const definition = CHAPTERS[chapter];
    return {
      ...initialQuest(),
      status: 'playing',
      chapter,
      score,
      checkpointScore: score,
      event,
      health,
      enemies: definition.enemies.map((enemy, index) => ({
        ...enemy,
        id: `enemy-${chapter}-${index}`,
        homeX: enemy.x,
        maxHp: enemy.hp,
        direction: -1,
        hitBy: -1,
      })),
      items: definition.items.map((item, index) => ({
        ...item,
        id: `item-${chapter}-${index}`,
        kind: item.kind || 'peach',
        collected: false,
      })),
      message: definition.story,
    };
  }
  function createQuestScene(chapter) {
    const scene = createScene(),
      definition = CHAPTERS[chapter];
    return {
      ...scene,
      screen: { ...scene.screen, material: definition.material },
      lightSource: { ...scene.lightSource, color: definition.color, intensity: 90 },
      puppet: { ...scene.puppet, x: -320 },
      rods: scene.rods.map((rod) => ({ ...rod, visible: false })),
    };
  }
  function beginAttack(quest) {
    if (!['idle', 'playing'].includes(quest.status) || quest.attackCooldown > 0) return quest;
    return { ...quest, attackTime: 0.26, attackCooldown: 0.44, attackId: quest.attackId + 1 };
  }
  function useFan(quest) {
    if (quest.status !== 'playing' || !quest.hasFan || quest.fanCooldown > 0) return quest;
    return {
      ...quest,
      wind: 3.5,
      fanCooldown: 5,
      event: quest.event + 1,
      message: '芭蕉扇起，山火暂息！趁现在过山。',
    };
  }
  function questProgress(quest) {
    return {
      collected: quest.items.filter((item) => item.collected).length,
      total: quest.items.length,
      defeated: quest.enemies.filter((enemy) => enemy.hp <= 0).length,
      enemies: quest.enemies.length,
    };
  }
  function stepQuest(quest, scene, seconds, elapsed = seconds) {
    if (quest.status === 'paused' || ['won', 'lost', 'interlude'].includes(quest.status))
      return quest;
    const next = {
      ...quest,
      attackTime: Math.max(0, quest.attackTime - seconds),
      attackCooldown: Math.max(0, quest.attackCooldown - seconds),
      walkTime: Math.max(0, quest.walkTime - seconds),
      wind: Math.max(0, quest.wind - seconds),
      fanCooldown: Math.max(0, quest.fanCooldown - seconds),
      invulnerable: Math.max(0, quest.invulnerable - seconds),
    };
    if (quest.status === 'idle') return next;
    next.remaining = Math.max(0, quest.remaining - elapsed);
    next.elapsed += seconds;
    if (next.remaining === 0)
      return { ...next, status: 'lost', message: '天色已晚，重新整装再出发吧。' };
    const puppet = scene.puppet,
      heroX = 500 + puppet.x,
      heroY = 450 + puppet.y;
    next.items = quest.items.map((item) => {
      if (item.collected || Math.hypot(heroX - item.x, heroY - item.y) > 43) return item;
      next.score += item.kind === 'fan' ? 60 : 30;
      next.event++;
      if (item.kind === 'fan') {
        next.hasFan = true;
        next.message = '得到芭蕉扇！按 K 或点击「扇风」可暂时灭火。';
      } else {
        next.health = Math.min(3, next.health + 1);
        next.message = '仙桃 +30 · 恢复一格法力';
      }
      return { ...item, collected: true };
    });
    next.enemies = quest.enemies.map((enemy) => {
      if (enemy.hp <= 0) return enemy;
      const x = enemy.x + enemy.direction * enemy.speed * seconds;
      let moving = {
        ...enemy,
        x: Math.max(enemy.homeX - enemy.range, Math.min(enemy.homeX + enemy.range, x)),
        direction: Math.abs(x - enemy.homeX) >= enemy.range ? -enemy.direction : enemy.direction,
      };
      const dx = moving.x - heroX;
      // One hit per enemy per attack ID, independent of frame rate.
      if (
        quest.attackTime > 0 &&
        enemy.hitBy !== quest.attackId &&
        Math.abs(dx) <= 130 &&
        dx * puppet.facing >= -20 &&
        puppet.y > -110
      ) {
        moving = { ...moving, hp: moving.hp - 1, hitBy: quest.attackId };
        next.event++;
        next.message = moving.hp <= 0 ? '妖怪退散！继续向西。' : '金箍棒命中！再接一棒。';
        if (moving.hp <= 0) next.score += moving.maxHp >= 3 ? 200 : 100;
      }
      return moving;
    });
    const enemyContact = next.enemies.some(
      (enemy) => enemy.hp > 0 && Math.abs(enemy.x - heroX) < 43 && puppet.y > -60,
    );
    const fireContact =
      next.wind <= 0 &&
      CHAPTERS[next.chapter].hazards.some(
        (fire) => Math.abs(fire.x - heroX) < fire.width / 2 + 12 && puppet.y > -44,
      );
    if ((enemyContact || fireContact) && next.invulnerable === 0) {
      next.health--;
      next.invulnerable = 1.1;
      next.event++;
      next.message = fireContact
        ? '当心山火！跳跃越过，或用芭蕉扇灭火。'
        : '被妖怪碰到啦！保持距离，朝向敌人挥棒。';
    }
    if (next.health <= 0)
      return { ...next, health: 0, status: 'lost', message: '法力耗尽。重试本回，整装再战！' };
    const progress = questProgress(next);
    if (
      heroX >= 815 &&
      progress.collected === progress.total &&
      progress.defeated === progress.enemies
    ) {
      const won = next.chapter === CHAPTERS.length - 1;
      return {
        ...next,
        status: won ? 'won' : 'interlude',
        score: next.score + Math.ceil(next.remaining) * 2,
        event: next.event + 1,
        message: won
          ? '三回历险，西行未止。此刻，你也是齐天大圣！'
          : '本回功成！点击「继续西行」进入下一回。',
      };
    }
    return next;
  }
  return {
    initialQuest,
    createQuest,
    createQuestScene,
    beginAttack,
    useFan,
    questProgress,
    stepQuest,
  };
});
