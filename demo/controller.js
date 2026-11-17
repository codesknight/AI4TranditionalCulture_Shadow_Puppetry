'use strict';
/* Composition root: DOM events -> commands -> state -> pose -> SVG view. */
(function ({ ACTIONS, CONFIG, GRIPS, createStore, getPose, dragValue, createRenderer }) {
  const $ = (id) => document.getElementById(id);
  const svg = $('theatre');
  const store = createStore();
  const renderer = createRenderer(document);
  const grid = document.querySelector('.action-grid');
  let drag = null;
  let previousFrame = null;

  for (const grip of GRIPS) {
    const [min, max] = CONFIG.limits[grip.field];
    $(grip.id).min = min;
    $(grip.id).max = max;
  }

  // Registry metadata drives the buttons as well as the animation strategies.
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

  function updateView(state, previous) {
    renderer.render(getPose(state), state);
    if (
      previous &&
      Object.keys(state).every((key) => key === 'time' || state[key] === previous[key])
    )
      return;
    const action = ACTIONS.find((item) => item.id === state.action);
    grid.querySelectorAll('[data-action]').forEach((button) => {
      const active = button.dataset.action === state.action;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('mode-label').textContent = action.name;
    $('playing-title').textContent = action.title;
    $('playing-note').textContent = action.note;
    $('play').textContent = state.playing ? 'Ⅱ' : '▷';
    $('play').setAttribute('aria-label', state.playing ? '暂停动作' : '播放当前动作');
    for (const grip of GRIPS) $(grip.id).value = state[grip.field];
    $('body-value').textContent =
      Math.abs(state.x) < 1
        ? '居中'
        : `${state.x > 0 ? '右' : '左'} ${Math.round(Math.abs(state.x))}`;
    $('left-value').textContent = state.liftL === 0 ? '自然' : `${Math.round(state.liftL)}°`;
    $('right-value').textContent = state.liftR === 0 ? '自然' : `${Math.round(state.liftR)}°`;
    $('show-rods').checked = state.showRods;
    $('light').value = state.light;
    $('light-value').textContent = `${state.light}%`;
    $('stage').style.setProperty('--lamp-opacity', (100 - state.light) / 200);
    $('speed').value = state.speed * 100;
    $('speed-value').textContent = `${Number(state.speed.toFixed(2))}×`;
  }
  const dispatch = (command) => store.dispatch(command);
  grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (button) {
      drag = null;
      dispatch({ type: 'SELECT_ACTION', id: button.dataset.action });
    }
  });
  $('play').addEventListener('click', () => dispatch({ type: 'TOGGLE_PLAY' }));
  $('reset').addEventListener('click', () => {
    drag = null;
    dispatch({ type: 'RESET' });
  });
  GRIPS.forEach((grip) =>
    $(grip.id).addEventListener('input', (event) => {
      dispatch({ type: 'SET_CONTROL', field: grip.field, value: event.target.value });
    }),
  );
  for (const field of ['light', 'speed', 'showRods']) {
    const id = field === 'showRods' ? 'show-rods' : field;
    $(id).addEventListener(field === 'showRods' ? 'change' : 'input', (event) => {
      if (field === 'showRods') drag = null;
      const value =
        field === 'showRods'
          ? event.target.checked
          : Number(event.target.value) / (field === 'speed' ? 100 : 1);
      dispatch({ type: 'SET_SETTING', field, value });
    });
  }
  function svgPoint(event) {
    const matrix = svg.getScreenCTM();
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
      : null;
  }
  svg.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest('[data-grip]');
    if (
      !handle ||
      drag ||
      !store.getState().showRods ||
      (event.button !== undefined && event.button !== 0)
    )
      return;
    const start = svgPoint(event),
      grip = GRIPS[Number(handle.dataset.grip)];
    if (!start || !grip) return;
    event.preventDefault();
    const state = store.getState();
    drag = { field: grip.field, value: state[grip.field], start, pointerId: event.pointerId };
    dispatch({ type: 'SET_CONTROL', field: grip.field, value: state[grip.field] });
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener('pointermove', (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = svgPoint(event);
    if (point) dispatch({ type: 'SET_CONTROL', field: drag.field, value: dragValue(drag, point) });
  });
  function finishDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    svg.addEventListener(type, finishDrag);
  svg.addEventListener('keydown', (event) => {
    const handle = event.target.closest('[data-grip]');
    if (!handle || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const grip = GRIPS[Number(handle.dataset.grip)];
    if (!grip) return;
    event.preventDefault();
    const delta = ['ArrowUp', 'ArrowRight'].includes(event.key) ? 5 : -5;
    dispatch({
      type: 'SET_CONTROL',
      field: grip.field,
      value: store.getState()[grip.field] + delta,
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && event.target === document.body) {
      event.preventDefault();
      dispatch({ type: 'TOGGLE_PLAY' });
    }
  });
  document.addEventListener('visibilitychange', () => {
    previousFrame = null;
  });
  function tick(now) {
    const seconds = previousFrame === null ? 0 : (now - previousFrame) / 1000;
    previousFrame = now;
    dispatch({ type: 'TICK', seconds, hidden: document.hidden });
    requestAnimationFrame(tick);
  }
  store.subscribe(updateView);
  updateView(store.getState());
  requestAnimationFrame(tick);
})(globalThis.ShadowTheatre);
