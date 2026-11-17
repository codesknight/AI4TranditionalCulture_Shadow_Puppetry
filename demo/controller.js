'use strict';
/* DOM adapter. All gameplay and object rules remain in pure core modules. */
(function ({
  ACTIONS,
  GRIPS,
  LEVELS,
  CHAPTERS,
  questProgress,
  findObject,
  createStore,
  getPose,
  dragValue,
  projection,
  createRenderer,
}) {
  const $ = (id) => document.getElementById(id);
  const svg = $('theatre'),
    store = createStore(),
    renderer = createRenderer(document);
  const grid = document.querySelector('.action-grid'),
    keys = new Set();
  const objectInputs = [...document.querySelectorAll('[data-entity]')];
  const dispatch = (command) => store.dispatch(command);
  let drag = null,
    previousFrame = null,
    best = 0,
    questBest = 0;
  try {
    const stored = Number(localStorage.getItem('shadow-play-best'));
    best = Number.isFinite(stored) ? Math.max(0, stored) : 0;
    const journeyStored = Number(localStorage.getItem('shadow-journey-best'));
    questBest = Number.isFinite(journeyStored) ? Math.max(0, journeyStored) : 0;
  } catch {
    /* Storage is optional in file/private mode. */
  }

  for (const action of ACTIONS) {
    const button = document.createElement('button');
    button.className = 'action';
    button.dataset.action = action.id;
    for (const [tag, className, text] of [
      ['span', 'action-icon', action.icon],
      ['strong', '', action.name],
      ['small', '', action.subtitle],
    ]) {
      const element = document.createElement(tag);
      element.className = className;
      element.textContent = text;
      button.append(element);
    }
    grid.append(button);
  }
  function updateQuestHud(state) {
    const quest = state.quest,
      chapter = CHAPTERS[quest.chapter],
      progress = questProgress(quest),
      active = ['playing', 'paused'].includes(quest.status);
    if (quest.score > questBest) {
      questBest = quest.score;
      try {
        localStorage.setItem('shadow-journey-best', String(questBest));
      } catch {
        /* Optional. */
      }
    }
    $('score').textContent = String(quest.score).padStart(4, '0');
    $('best').textContent = String(questBest).padStart(4, '0');
    $('round').textContent = `${quest.chapter + 1} / ${CHAPTERS.length}`;
    $('timer').textContent = `${Math.ceil(quest.remaining)}s`;
    $('challenge').textContent = '重启西游 ↻';
    $('challenge').classList.toggle('active', true);
    $('sandbox').classList.toggle('active', false);
    $('alignment').classList.toggle('active', false);
    $('pause-game').hidden = !active;
    $('pause-game').textContent = quest.status === 'paused' ? '继续 ▶' : '暂停 Ⅱ';
    $('mission-tag').textContent =
      quest.status === 'won'
        ? '三回功成 · 西行未止'
        : quest.status === 'lost'
          ? '本回失利 · 再战一次'
          : chapter.subtitle;
    $('mission-title').textContent =
      quest.status === 'won'
        ? `大圣归来！${quest.score} 分`
        : quest.status === 'lost'
          ? '胜败寻常，重整旗鼓'
          : chapter.name;
    $('mission-hint').textContent =
      quest.status === 'paused' ? '西游已暂停，准备好后继续。' : chapter.objective;
    $('match').textContent = '♥'.repeat(quest.health) + '♡'.repeat(3 - quest.health);
    $('match').style.fontSize = '13px';
    $('match-label').textContent = '法力';
    const ratio = (progress.collected + progress.defeated) / (progress.total + progress.enemies);
    $('hold-progress').style.width = `${ratio * 100}%`;
    $('hold-track').setAttribute('aria-label', '本回目标进度');
    $('hold-track').setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    $('quest-objective').textContent = chapter.objective;
    $('quest-items').textContent =
      `${quest.chapter === 2 ? '芭蕉扇' : '仙桃'} ${progress.collected} / ${progress.total}`;
    $('quest-enemies').textContent = `妖怪 ${progress.defeated} / ${progress.enemies}`;
    if ($('quest-feedback').textContent !== quest.message)
      $('quest-feedback').textContent = quest.message;
    $('quest-next').hidden = !['interlude', 'lost', 'won'].includes(quest.status);
    $('quest-next').textContent =
      quest.status === 'interlude'
        ? '继续西行 →'
        : quest.status === 'lost'
          ? '重试本回 ↻'
          : '再踏西行 ↻';
    $('playing-title').textContent = '齐天大圣 · 金箍棒在手';
    $('playing-note').textContent = 'A / D 移动 · W 跳跃 · J 挥棒 · K 扇风';
    $('attack').disabled = quest.attackCooldown > 0 || !['playing'].includes(quest.status);
    $('fan').disabled = !quest.hasFan || quest.fanCooldown > 0 || quest.status !== 'playing';
    $('fan-status').textContent = quest.hasFan
      ? quest.fanCooldown > 0
        ? `芭蕉扇回气中 · ${quest.fanCooldown.toFixed(1)}s`
        : '芭蕉扇已就绪 · K 扇风'
      : '火焰山可获得芭蕉扇';
    $('stage').setAttribute('data-game', quest.status);
    $('stage').setAttribute('data-chapter', chapter.id);
  }
  function updateHud(state) {
    const questActive = state.quest.status !== 'idle';
    $('tools').setAttribute('data-quest', String(questActive));
    $('stage').setAttribute('data-quest', String(questActive));
    $('quest-help').hidden = !questActive;
    $('quest-feedback').hidden = !questActive;
    for (let i = 0; i < CHAPTERS.length; i++) {
      $(`chapter-${i}`).classList.toggle('current', state.quest.chapter === i);
      $(`chapter-${i}`).classList.toggle(
        'completed',
        state.quest.chapter > i || state.quest.status === 'won',
      );
    }
    objectInputs.forEach((input) => {
      input.disabled = questActive;
    });
    GRIPS.forEach((grip) => {
      $(grip.id).disabled = questActive;
    });
    for (const id of ['play', 'reset']) $(id).disabled = questActive;
    grid.querySelectorAll('[data-action]').forEach((button) => {
      button.disabled = questActive;
    });
    if (questActive) {
      updateQuestHud(state);
      return;
    }
    $('quest-next').hidden = true;
    $('attack').disabled = state.quest.attackCooldown > 0;
    $('fan').disabled = true;
    $('match').style.fontSize = '';
    $('stage').setAttribute('data-chapter', 'mountain');
    const game = state.game,
      active = ['playing', 'paused'].includes(game.status);
    $('pause-game').hidden = !active;
    $('pause-game').textContent = game.status === 'paused' ? '继续 ▶' : '暂停 Ⅱ';
    if (game.score > best) {
      best = game.score;
      try {
        localStorage.setItem('shadow-play-best', String(best));
      } catch {
        /* Optional. */
      }
    }
    $('score').textContent = String(game.score).padStart(4, '0');
    $('best').textContent = String(best).padStart(4, '0');
    $('round').textContent =
      active || game.status === 'won'
        ? `${game.level + 1} / ${LEVELS.length}`
        : `— / ${LEVELS.length}`;
    $('timer').textContent = `${Math.ceil(game.remaining)}s`;
    $('alignment').textContent = active
      ? '重新挑战 ↻'
      : game.status === 'idle'
        ? '开始闯关 →'
        : '再玩一次 ↻';
    $('challenge').textContent = '踏上西游 →';
    $('challenge').classList.toggle('active', false);
    $('alignment').classList.toggle('active', game.status !== 'idle');
    $('sandbox').classList.toggle('active', game.status === 'idle');
    $('mission-tag').textContent = active
      ? `第 ${game.level + 1} 幕 · ${game.combo ? `${game.combo} 连击` : '影子对齐'}`
      : game.status === 'won'
        ? '五幕通关！'
        : game.status === 'lost'
          ? '时间到 · 再试一次'
          : '西游序章 · 自由戏台';
    $('mission-title').textContent = active
      ? LEVELS[game.level].name
      : game.status === 'won'
        ? `好身手！你获得了 ${game.score} 分`
        : game.status === 'lost'
          ? `这次拿到 ${game.score} 分，下一场更精彩`
          : '做一回大圣，走一段西行';
    $('mission-hint').textContent =
      game.status === 'paused'
        ? '已暂停计时。准备好后，点击「继续」重新开演。'
        : active
          ? state.scene.lightSource.intensity < 45
            ? '灯光太暗啦！把光源亮度调到 45% 以上，再对齐影子。'
            : `${LEVELS[game.level].hint} 对齐青色影子并保持 0.65 秒。`
          : game.status === 'won'
            ? `五幕连击完成，额外获得 ${game.bonus} 分时间奖励！再玩一场，挑战更快通关。`
            : '点击「踏上西游」开始三回冒险。也可在自由戏台拖动光源、影幕与签杆，练一练身手。';
    $('match').textContent = active ? `${game.match}%` : game.status === 'won' ? '★' : '✦';
    $('match-label').textContent = active ? '匹配度' : game.status === 'won' ? 'BRAVO' : 'PLAY';
    $('hold-progress').style.width = `${Math.min(100, (game.hold / 0.65) * 100)}%`;
    $('hold-track').setAttribute('aria-valuenow', String(Math.round((game.hold / 0.65) * 100)));
    $('hold-track').setAttribute('aria-label', '保持对齐进度');
    $('stage').setAttribute('data-game', game.status);
  }
  function updateView(state, previous) {
    renderer.render(getPose(state), state);
    updateHud(state);
    if (
      previous &&
      state.scene === previous.scene &&
      state.selectedId === previous.selectedId &&
      state.action === previous.action &&
      state.playing === previous.playing &&
      state.speed === previous.speed
    )
      return;
    const scene = state.scene,
      selected = findObject(scene, state.selectedId),
      action = ACTIONS.find((item) => item.id === state.action);
    document.querySelectorAll('[data-select]').forEach((button) => {
      const object = findObject(scene, button.dataset.select);
      const active =
        object.id === selected.id ||
        (object.type === 'rod' &&
          selected.type === 'rod' &&
          button.parentElement?.className === 'object-tabs');
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    for (const type of ['light', 'screen', 'puppet', 'rod'])
      $(`panel-${type}`).hidden = selected.type !== type;
    $('object-summary').textContent = {
      light: '光源 · 拖动灯的位置，观察影子位移',
      screen: '影幕 · 距离、位置与材质独立可调',
      puppet: '影偶 · 拖动身体，或牵动手签',
      rod: `${selected.label} · 独立操纵杆`,
    }[selected.type];
    objectInputs.forEach((input) => {
      const object = findObject(scene, input.dataset.entity),
        value = object[input.dataset.field];
      input.value = value;
      const output = $(input.id + '-value');
      if (output) output.textContent = input.id === 'light' ? `${value}%` : String(value);
    });
    for (const grip of GRIPS) $(grip.id).value = scene.puppet[grip.field];
    $('body-value').textContent =
      Math.abs(scene.puppet.x) < 1
        ? '居中'
        : `${scene.puppet.x > 0 ? '右' : '左'} ${Math.round(Math.abs(scene.puppet.x))}`;
    $('left-value').textContent = `${Math.round(scene.puppet.liftL)}°`;
    $('right-value').textContent = `${Math.round(scene.puppet.liftR)}°`;
    if (selected.type === 'rod') {
      $('rod-length').value = selected.length;
      $('rod-length-value').textContent = String(selected.length);
      $('rod-visible').checked = selected.visible;
    }
    $('show-rods').checked = scene.rods.every((rod) => rod.visible);
    $('mode-label').textContent = action.name;
    $('playing-title').textContent = action.title;
    $('playing-note').textContent = action.note;
    grid.querySelectorAll('[data-action]').forEach((button) => {
      const active = button.dataset.action === state.action;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('play').textContent = state.playing ? 'Ⅱ' : '▷';
    $('play').setAttribute('aria-label', state.playing ? '暂停动作' : '播放当前动作');
    $('speed').value = state.speed * 100;
    $('speed-value').textContent = `${Number(state.speed.toFixed(2))}×`;
    $('stage').style.setProperty('--lamp-opacity', (100 - scene.lightSource.intensity) / 200);
    $('stage').style.setProperty('--light-x', `${scene.lightSource.x / 10}%`);
    $('stage').style.setProperty('--light-y', `${scene.lightSource.y / 6.3}%`);
    $('stage').setAttribute('data-material', scene.screen.material);
    $('stage').setAttribute('data-light', scene.lightSource.color);
    $('magnification').textContent = `${projection(scene).magnification.toFixed(2)}×`;
    if (state.quest.status !== 'idle') updateQuestHud(state);
  }
  function cancelDrag() {
    const active = drag;
    drag = null;
    if (active && svg.hasPointerCapture(active.pointerId))
      svg.releasePointerCapture(active.pointerId);
  }
  function updateObject(id, patch) {
    dispatch({ type: 'UPDATE_OBJECT', id, patch });
  }
  document.querySelectorAll('[data-select]').forEach((button) =>
    button.addEventListener('click', () => {
      cancelDrag();
      dispatch({ type: 'SELECT_OBJECT', id: button.dataset.select });
    }),
  );
  objectInputs.forEach((input) =>
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', (event) =>
      updateObject(input.dataset.entity, { [input.dataset.field]: event.target.value }),
    ),
  );
  GRIPS.forEach((grip) =>
    $(grip.id).addEventListener('input', (event) =>
      updateObject('puppet', { [grip.field]: event.target.value }),
    ),
  );
  grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (button) {
      cancelDrag();
      dispatch({ type: 'SELECT_ACTION', id: button.dataset.action });
    }
  });
  for (const [id, type] of [
    ['play', 'TOGGLE_PLAY'],
    ['reset', 'RESET'],
    ['jump', 'JUMP'],
    ['flip', 'FLIP'],
    ['reset-scene', 'RESET_SCENE'],
    ['challenge', 'START_QUEST'],
    ['alignment', 'START_GAME'],
    ['attack', 'ATTACK'],
    ['fan', 'FAN'],
    ['pause-game', 'PAUSE_GAME'],
    ['sandbox', 'EXIT_GAME'],
  ]) {
    $(id).addEventListener('click', () => {
      cancelDrag();
      keys.clear();
      dispatch({ type });
    });
  }
  $('quest-next').addEventListener('click', () => {
    cancelDrag();
    keys.clear();
    const status = store.getState().quest.status;
    dispatch({
      type:
        status === 'interlude' ? 'NEXT_QUEST' : status === 'lost' ? 'RETRY_QUEST' : 'START_QUEST',
    });
  });
  document
    .querySelectorAll('[data-move]')
    .forEach((button) =>
      button.addEventListener('click', () =>
        dispatch({ type: 'MOVE', dx: Number(button.dataset.move) }),
      ),
    );
  document.querySelectorAll('[data-move]').forEach((button) => {
    const key = Number(button.dataset.move) < 0 ? 'a' : 'd';
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      keys.add(key);
      button.setPointerCapture(event.pointerId);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      button.addEventListener(type, (event) => {
        keys.delete(key);
        if (button.hasPointerCapture(event.pointerId))
          button.releasePointerCapture(event.pointerId);
      });
  });
  $('speed').addEventListener('input', (event) =>
    dispatch({ type: 'SET_SPEED', value: Number(event.target.value) / 100 }),
  );
  $('show-rods').addEventListener('change', (event) => {
    cancelDrag();
    dispatch({ type: 'SHOW_RODS', value: event.target.checked });
  });
  $('rod-length').addEventListener('input', (event) =>
    updateObject(store.getState().selectedId, { length: event.target.value }),
  );
  $('rod-visible').addEventListener('change', (event) => {
    cancelDrag();
    updateObject(store.getState().selectedId, { visible: event.target.checked });
  });
  function svgPoint(event) {
    const matrix = svg.getScreenCTM();
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
      : null;
  }
  svg.addEventListener('pointerdown', (event) => {
    if (store.getState().quest.status !== 'idle') return;
    const handle = event.target.closest('[data-object]');
    if (!handle || drag || (event.button !== undefined && event.button !== 0)) return;
    const state = store.getState(),
      object = findObject(state.scene, handle.dataset.object),
      start = svgPoint(event);
    if (!object || !start || (object.type === 'rod' && !object.visible)) return;
    event.preventDefault();
    dispatch({ type: 'SELECT_OBJECT', id: object.id });
    drag = {
      id: object.id,
      type: object.type,
      start,
      pointerId: event.pointerId,
      x: object.x,
      y: object.y,
      field: object.field,
      value: object.type === 'rod' ? state.scene.puppet[object.field] : object.x,
      scale: projection(state.scene).scale,
    };
    if (object.type === 'puppet' || object.type === 'rod')
      updateObject('puppet', { [object.field || 'x']: drag.value });
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = svgPoint(event);
    if (!point) return;
    if (drag.type === 'rod')
      updateObject('puppet', {
        [drag.field]: dragValue(drag, {
          x: drag.start.x + (point.x - drag.start.x) / drag.scale,
          y: drag.start.y + (point.y - drag.start.y) / drag.scale,
        }),
      });
    else if (drag.type === 'puppet')
      updateObject('puppet', { x: drag.x + (point.x - drag.start.x) / drag.scale });
    else
      updateObject(drag.id, {
        x: drag.x + point.x - drag.start.x,
        y: drag.y + point.y - drag.start.y,
      });
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    svg.addEventListener(type, (event) => {
      if (drag?.pointerId === event.pointerId) cancelDrag();
    });
  svg.addEventListener('keydown', (event) => {
    const handle = event.target.closest('[data-object]');
    if (!handle || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const object = findObject(store.getState().scene, handle.dataset.object);
    if (!object) return;
    event.preventDefault();
    const delta = ['ArrowUp', 'ArrowRight'].includes(event.key) ? 5 : -5;
    if (object.type === 'rod')
      updateObject('puppet', {
        [object.field]: store.getState().scene.puppet[object.field] + delta,
      });
    else {
      const field = ['ArrowUp', 'ArrowDown'].includes(event.key) ? 'y' : 'x';
      if (object.type !== 'puppet' || field === 'x')
        updateObject(object.id, { [field]: object[field] + (field === 'y' ? -delta : delta) });
    }
  });
  const keyFields = {
    a: ['x', -160],
    d: ['x', 160],
    q: ['liftL', -100],
    e: ['liftL', 100],
    o: ['liftR', -100],
    p: ['liftR', 100],
  };
  document.addEventListener('keydown', (event) => {
    if (
      ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    const key = event.key?.toLowerCase();
    if (keyFields[key]) {
      keys.add(key);
      event.preventDefault();
    }
    if (!event.repeat && ['w', 'f', 'j', 'k'].includes(key)) {
      event.preventDefault();
      dispatch({ type: { w: 'JUMP', f: 'FLIP', j: 'ATTACK', k: 'FAN' }[key] });
    }
    if (event.code === 'Space' && event.target === document.body) {
      event.preventDefault();
      dispatch({ type: store.getState().quest.status === 'idle' ? 'TOGGLE_PLAY' : 'JUMP' });
    }
  });
  document.addEventListener('keyup', (event) => keys.delete(event.key?.toLowerCase()));
  function stopInput() {
    keys.clear();
    previousFrame = null;
    cancelDrag();
  }
  document.addEventListener('visibilitychange', stopInput);
  globalThis.addEventListener?.('blur', stopInput);
  function tick(now) {
    const seconds = previousFrame === null ? 0 : (now - previousFrame) / 1000;
    previousFrame = now;
    if (!document.hidden && keys.size) {
      const puppet = store.getState().scene.puppet,
        patch = {};
      for (const key of keys) {
        const [field, speed] = keyFields[key];
        patch[field] = (patch[field] ?? puppet[field]) + speed * Math.min(seconds, 0.05);
      }
      if (patch.x !== undefined) {
        dispatch({ type: 'MOVE', dx: patch.x - puppet.x });
        delete patch.x;
      }
      if (Object.keys(patch).length) updateObject('puppet', patch);
    }
    dispatch({ type: 'TICK', seconds, hidden: document.hidden });
    requestAnimationFrame(tick);
  }
  store.subscribe(updateView);
  updateView(store.getState());
  requestAnimationFrame(tick);
})(globalThis.ShadowTheatre);
