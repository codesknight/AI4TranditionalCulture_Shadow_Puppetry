const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CHAPTERS } = require('../demo/core/chapters.js');
const { initialState, transition } = require('../demo/core/model.js');
const {
  createQuest,
  createQuestScene,
  beginAttack,
  stepQuest,
  questProgress,
} = require('../demo/core/quest.js');
const { getPose, toWorld } = require('../demo/core/kinematics.js');
const { journeyMarkup } = require('../demo/core/journey-view.js');

function tick(state, seconds = 0.025) {
  return transition(state, { type: 'TICK', seconds });
}
test('chapters produce isolated actors, collectible definitions and scene themes', () => {
  const a = createQuest(0),
    b = createQuest(0);
  assert.notEqual(a.enemies[0], b.enemies[0]);
  assert.equal(CHAPTERS.length, 3);
  assert.equal(createQuestScene(1).screen.material, 'night');
  assert.equal(createQuestScene(2).lightSource.color, 'rose');
  assert.equal(createQuestScene(0).puppet.character, 'wukong');
});
test('one swing damages a given enemy once, cooldown prevents stacked attacks', () => {
  let quest = createQuest(1),
    scene = createQuestScene(1);
  scene.puppet.x = quest.enemies[0].x - 100 - 500;
  quest = beginAttack(quest);
  assert.equal(beginAttack(quest), quest);
  quest = stepQuest(quest, scene, 0.025);
  assert.equal(quest.enemies[0].hp, 1);
  for (let i = 0; i < 8; i++) quest = stepQuest(quest, scene, 0.025);
  assert.equal(quest.enemies[0].hp, 1);
  assert.equal(CHAPTERS[1].enemies[0].hp, 2);
});
test('a swing cannot hit out of range or behind the player', () => {
  let quest = beginAttack(createQuest(0)),
    scene = createQuestScene(0);
  quest = stepQuest(quest, scene, 0.025);
  assert.equal(quest.enemies[0].hp, 1);
  scene.puppet.x = quest.enemies[0].x - 80 - 500;
  scene.puppet.facing = -1;
  quest = stepQuest(quest, scene, 0.025);
  assert.equal(quest.enemies[0].hp, 1);
});
test('contact damage is gated by invulnerability and jumping avoids contact', () => {
  let quest = createQuest(0),
    scene = createQuestScene(0);
  scene.puppet.x = quest.enemies[0].x - 500;
  quest = stepQuest(quest, scene, 0.025);
  assert.equal(quest.health, 2);
  quest = stepQuest(quest, scene, 0.025);
  assert.equal(quest.health, 2);
  const jumping = { ...scene, puppet: { ...scene.puppet, y: -70 } };
  quest = stepQuest({ ...quest, invulnerable: 0 }, jumping, 0.025);
  assert.equal(quest.health, 2);
});
test('peaches score and heal once; elevated objects require a jump', () => {
  let quest = createQuest(0),
    scene = createQuestScene(0);
  quest = { ...quest, health: 2 };
  scene.puppet.x = quest.items[0].x - 500;
  quest = stepQuest(quest, scene, 0.025);
  assert.equal(quest.health, 3);
  assert.equal(quest.score, 30);
  quest = stepQuest(quest, scene, 0.025);
  assert.equal(quest.score, 30);
  scene.puppet.x = quest.items[1].x - 500;
  quest = stepQuest(quest, scene, 0.025);
  assert.equal(quest.items[1].collected, false);
  scene.puppet.y = -55;
  quest = stepQuest(quest, scene, 0.025);
  assert.equal(quest.items[1].collected, true);
});
test('fan pickup unlocks a cooldown skill that suppresses fire', () => {
  let state = transition(initialState(), { type: 'START_QUEST' });
  state = { ...state, scene: createQuestScene(2), quest: createQuest(2) };
  assert.equal(transition(state, { type: 'FAN' }).quest.wind, 0);
  state = {
    ...state,
    scene: { ...state.scene, puppet: { ...state.scene.puppet, x: -70, y: -55 } },
  };
  state = tick(state);
  assert.equal(state.quest.hasFan, true);
  state = transition(state, { type: 'FAN' });
  assert.ok(state.quest.wind > 0);
  assert.equal(transition(state, { type: 'FAN' }).quest, state.quest);
  const scene = { ...state.scene, puppet: { ...state.scene.puppet, x: -170, y: 0 } };
  assert.equal(stepQuest(state.quest, scene, 0.025).health, 3);
  assert.equal(stepQuest({ ...state.quest, wind: 0 }, scene, 0.025).health, 2);
});
test('pause blocks movement and time; retry rolls back partial score to checkpoint', () => {
  let state = transition(initialState(), { type: 'START_QUEST' });
  state = transition(state, { type: 'PAUSE_GAME' });
  assert.equal(tick(state), state);
  assert.equal(transition(state, { type: 'MOVE', dx: 8 }), state);
  state = { ...state, quest: { ...createQuest(1, 300), status: 'lost', score: 460 } };
  state = transition(state, { type: 'RETRY_QUEST' });
  assert.equal(state.quest.chapter, 1);
  assert.equal(state.quest.score, 300);
  assert.equal(state.quest.health, 3);
});
test('editor teleporting is disabled during story play and timeout can fail a chapter', () => {
  let state = transition(initialState(), { type: 'START_QUEST' });
  assert.equal(
    transition(state, { type: 'UPDATE_OBJECT', id: 'puppet', patch: { x: 360 } }),
    state,
  );
  state = transition(state, { type: 'MOVE', dx: 999 });
  assert.equal(state.scene.puppet.x, -308);
  state = { ...state, quest: { ...state.quest, remaining: 0.01 } };
  state = tick(state);
  assert.equal(state.quest.status, 'lost');
});
test('scaled sprite and rod anchors share the same foot-space transform', () => {
  const state = transition(initialState(), { type: 'START_QUEST' }),
    pose = getPose(state);
  assert.equal(pose.scale, 0.5);
  assert.equal(toWorld({ x: 500, y: 510 }, pose).y, 510);
  const markup = journeyMarkup(state.quest);
  assert.doesNotMatch(markup, /NaN|undefined|Infinity/);
  assert.match(markup, /水帘洞/);
});

test('all three chapters are completable using movement, jump, attack and fan commands', () => {
  let state = transition(initialState(), { type: 'START_QUEST' }),
    steps = 0;
  while (state.quest.status !== 'won' && steps++ < 18000) {
    const quest = state.quest;
    assert.notEqual(quest.status, 'lost', `lost in chapter ${quest.chapter}: ${quest.message}`);
    if (quest.status === 'interlude') {
      assert.equal(tick(state), state);
      state = transition(state, { type: 'NEXT_QUEST' });
      continue;
    }
    const x = 500 + state.scene.puppet.x;
    const items = quest.items.filter((item) => !item.collected);
    const enemies = quest.enemies.filter((enemy) => enemy.hp > 0);
    const candidates = [
      ...items.map((item) => ({ type: 'item', x: item.x, item })),
      ...enemies.map((enemy) => ({ type: 'enemy', x: enemy.x - 100, enemy })),
    ].sort((a, b) => a.x - b.x);
    const target = candidates[0] || { type: 'exit', x: 830 };
    const dx = target.x - x;
    if (Math.abs(dx) > 3) state = transition(state, { type: 'MOVE', dx: Math.sign(dx) * 4 });
    if (target.type === 'enemy' && Math.abs(target.enemy.x - x) <= 130) {
      if (state.scene.puppet.facing !== Math.sign(target.enemy.x - x))
        state = transition(state, { type: 'FLIP' });
      state = transition(state, { type: 'ATTACK' });
    }
    const fire = CHAPTERS[quest.chapter].hazards.some((fire) => fire.x - x > 0 && fire.x - x < 70);
    if (
      state.scene.puppet.y === 0 &&
      (fire || (target.type === 'item' && target.item.y < 420 && Math.abs(dx) < 35))
    )
      state = transition(state, { type: 'JUMP' });
    if (quest.hasFan) state = transition(state, { type: 'FAN' });
    state = tick(state);
  }
  assert.equal(state.quest.status, 'won');
  assert.equal(tick(state), state);
  assert.equal(state.quest.chapter, 2);
  assert.ok(state.quest.score > 600);
  assert.equal(questProgress(state.quest).defeated, 1);
});
