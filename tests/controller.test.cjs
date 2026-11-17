const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Small DOM boundary double: tests event wiring, not browser layout or pointer implementation.
function setup() {
  class Element {
    constructor() {
      this.value = 0;
      this.checked = true;
      this.dataset = {};
      this.attrs = {};
      this.children = [];
      this.listeners = {};
      this.writes = 0;
      this._html = '';
      this.captures = new Set();
      this.classList = { toggle() {} };
      this.style = { setProperty() {} };
    }
    set innerHTML(value) {
      this._html = value;
      this.writes++;
      this.children = [...value.matchAll(/data-grip="(\d+)"/g)].map((match) => {
        const node = new Element();
        node.dataset.grip = match[1];
        node.dataset.object = `rod-${['left', 'body', 'right'][Number(match[1])]}`;
        return node;
      });
    }
    get innerHTML() {
      return this._html;
    }
    setAttribute(key, value) {
      this.attrs[key] = value;
    }
    append(node) {
      this.children.push(node);
    }
    addEventListener(type, handler) {
      (this.listeners[type] ||= []).push(handler);
    }
    emit(type, event = {}) {
      for (const handler of this.listeners[type] || []) handler(event);
    }
    closest(selector) {
      if (selector.includes('object')) return this.dataset.object ? this : null;
      return selector.includes('grip')
        ? this.dataset.grip !== undefined
          ? this
          : null
        : this.dataset.action
          ? this
          : null;
    }
    querySelector(selector) {
      return this.children.find((node) => selector.includes(`"${node.dataset.grip}"`));
    }
    querySelectorAll() {
      return this.children;
    }
    getScreenCTM() {
      return {
        inverse() {
          return {};
        },
      };
    }
    setPointerCapture(id) {
      this.captures.add(id);
    }
    hasPointerCapture(id) {
      return this.captures.has(id);
    }
    releasePointerCapture(id) {
      this.captures.delete(id);
    }
  }
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const document = new Element();
  document.hidden = false;
  document.body = new Element();
  const html = fs.readFileSync(path.join(__dirname, '../demo/index.html'), 'utf8');
  for (const match of html.matchAll(/\bid="([^"]+)"/g)) element(match[1]).id = match[1];
  const inputs = [];
  for (const match of html.matchAll(/<(input|select)\b([^>]*)>/g)) {
    const attributes = Object.fromEntries(
      [...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]),
    );
    if (!attributes['data-entity']) continue;
    const input = element(attributes.id);
    input.tagName = match[1].toUpperCase();
    input.dataset.entity = attributes['data-entity'];
    input.dataset.field = attributes['data-field'];
    inputs.push(input);
  }
  const selectors = [...html.matchAll(/<button\b[^>]*data-select="([^"]+)"[^>]*>/g)].map(
    (match, index) => {
      const button = new Element();
      button.dataset.select = match[1];
      button.parentElement = { className: index < 4 ? 'object-tabs' : 'rod-picker' };
      return button;
    },
  );
  const moves = [...html.matchAll(/<button\b[^>]*data-move="([^"]+)"[^>]*>/g)].map((match) => {
    const button = new Element();
    button.dataset.move = match[1];
    return button;
  });
  document.getElementById = (id) => elements.get(id) || null;
  document.querySelector = () => element('grid');
  document.querySelectorAll = (selector) =>
    selector === '[data-entity]'
      ? inputs
      : selector === '[data-select]'
        ? selectors
        : selector === '[data-move]'
          ? moves
          : [];
  document.createElement = () => new Element();
  let frame;
  const context = vm.createContext({
    document,
    requestAnimationFrame(fn) {
      frame = fn;
    },
    DOMPoint: class {
      constructor(x, y) {
        this.x = x;
        this.y = y;
      }
      matrixTransform() {
        return this;
      }
    },
  });
  for (const file of [
    'core/config.js',
    'core/actions.js',
    'core/entities.js',
    'core/kinematics.js',
    'core/projection.js',
    'core/game.js',
    'core/model.js',
    'core/renderer.js',
    'controller.js',
  ]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../demo', file), 'utf8'), context, {
      filename: file,
    });
  }
  return { element, document, inputs, selectors, moves, frame: (time) => frame(time) };
}
test('classic scripts initialize UI and registry buttons without a bundler', () => {
  const { element } = setup();
  assert.equal(element('grid').children.length, 6);
  assert.equal(element('mode-label').textContent, '自由操偶');
  assert.match(element('puppet').innerHTML, /<path/);
  assert.doesNotMatch(element('handles').innerHTML, /\?{3,}/);
});
test('keyboard adjustment and animation preserve interactive node identity', () => {
  const { element, frame } = setup();
  const handle = element('handles').children[0];
  element('theatre').emit('keydown', { target: handle, key: 'ArrowUp', preventDefault() {} });
  assert.equal(element('left').value, 5);
  element('grid').emit('click', { target: element('grid').children[1] });
  frame(0);
  frame(100);
  assert.equal(element('handles').children[0], handle);
  assert.equal(element('handles').writes, 1);
});
test('dragging clamps body position, ignores a second pointer and releases capture', () => {
  const { element } = setup();
  const svg = element('theatre');
  const bodyHandle = element('handles').children[1];
  const event = {
    target: bodyHandle,
    clientX: 500,
    clientY: 571,
    pointerId: 1,
    button: 0,
    preventDefault() {},
  };
  svg.emit('pointerdown', event);
  svg.emit('pointerdown', { ...event, pointerId: 2 });
  svg.emit('pointermove', { clientX: 1000, clientY: 571, pointerId: 2 });
  assert.equal(element('body').value, 0);
  svg.emit('pointermove', { clientX: 1000, clientY: 571, pointerId: 1 });
  assert.equal(element('body').value, 220);
  svg.emit('pointerup', { pointerId: 1 });
  assert.equal(svg.hasPointerCapture(1), false);
});
test('manual control interrupts an action and reset restores neutral controls', () => {
  const { element } = setup();
  element('grid').emit('click', { target: element('grid').children[5] });
  element('body').emit('input', { target: { value: '120' } });
  assert.equal(element('mode-label').textContent, '自由操偶');
  assert.equal(element('body').value, 120);
  element('reset').emit('click');
  assert.equal(element('body').value, 0);
  assert.equal(element('body-value').textContent, '居中');
});
test('hidden rods retain nodes and settings synchronize their labels', () => {
  const { element } = setup();
  const handle = element('handles').children[0];
  element('show-rods').emit('change', { target: { checked: false } });
  assert.equal(element('rods').innerHTML, '');
  assert.equal(element('handles').attrs.display, 'none');
  element('show-rods').emit('change', { target: { checked: true } });
  assert.equal(element('handles').children[0], handle);
  element('speed').emit('input', { target: { value: 150 } });
  assert.equal(element('speed-value').textContent, '1.5×');
});

test('object inspector edits lamp and one rod without changing puppet controls', () => {
  const { element, selectors } = setup();
  selectors[0].emit('click');
  assert.equal(element('panel-light').hidden, false);
  element('lamp-x').emit('input', { target: { value: '700' } });
  assert.equal(element('lamp-x').value, 700);
  assert.equal(element('body').value, 0);
  selectors[6].emit('click');
  element('rod-length').emit('input', { target: { value: '125' } });
  assert.equal(element('rod-length-value').textContent, '125');
  element('rod-visible').emit('change', { target: { checked: false } });
  assert.equal(element('handles').children[2].attrs.display, 'none');
  assert.equal(element('handles').children[0].attrs.display, 'inline');
});
test('lamp and screen drag use scene coordinates and release capture on mode change', () => {
  const { element } = setup();
  const svg = element('theatre');
  const lamp = {
    dataset: { object: 'lamp' },
    closest() {
      return this;
    },
  };
  svg.emit('pointerdown', {
    target: lamp,
    clientX: 180,
    clientY: 110,
    pointerId: 5,
    preventDefault() {},
  });
  svg.emit('pointermove', { clientX: 300, clientY: 160, pointerId: 5 });
  assert.equal(element('lamp-x').value, 300);
  assert.equal(element('lamp-y').value, 160);
  element('challenge').emit('click');
  assert.equal(svg.hasPointerCapture(5), false);
  assert.equal(element('lamp-x').value, 180);
  const screen = {
    dataset: { object: 'screen' },
    closest() {
      return this;
    },
  };
  svg.emit('pointerdown', {
    target: screen,
    clientX: 900,
    clientY: 50,
    pointerId: 6,
    preventDefault() {},
  });
  svg.emit('pointermove', { clientX: 930, clientY: 60, pointerId: 6 });
  assert.equal(element('screen-x').value, 30);
  assert.equal(element('screen-y').value, 10);
  svg.emit('pointerup', { pointerId: 6 });
});
test('keyboard movement, jump, turn and hidden-page clearing are wired', () => {
  const { element, document, frame } = setup();
  document.emit('keydown', { key: 'd', target: document.body, preventDefault() {} });
  frame(0);
  frame(50);
  assert.equal(element('body').value, 8);
  document.emit('visibilitychange');
  frame(100);
  frame(150);
  assert.equal(element('body').value, 8);
  document.emit('keydown', { key: 'w', target: document.body, preventDefault() {} });
  frame(200);
  assert.match(element('puppet').innerHTML, /translate\(8 -/);
  document.emit('keydown', { key: 'f', target: document.body, preventDefault() {} });
  assert.match(element('puppet').innerHTML, /scale\(-1 1\)/);
});
test('UI controls can complete all five levels, pause, restart and exit', () => {
  const { LEVELS } = require('../demo/core/game.js');
  const { element, frame } = setup();
  let now = 0;
  element('challenge').emit('click');
  frame(now);
  frame((now += 50));
  element('pause-game').emit('click');
  const timer = element('timer').textContent;
  for (let i = 0; i < 30; i++) frame((now += 50));
  assert.equal(element('timer').textContent, timer);
  element('pause-game').emit('click');
  let facing = 1;
  for (const level of LEVELS) {
    for (const [id, value] of [
      ['body', level.x],
      ['left', level.liftL],
      ['right', level.liftR],
      ['puppet-depth', level.depth],
    ])
      element(id).emit('input', { target: { value } });
    const targetFacing = level.facing || 1;
    if (facing !== targetFacing) {
      element('flip').emit('click');
      facing = targetFacing;
    }
    for (let i = 0; i < 14; i++) frame((now += 50));
  }
  assert.ok(Number(element('score').textContent) > 800);
  assert.equal(element('match-label').textContent, 'BRAVO');
  assert.equal(element('round').textContent, '5 / 5');
  assert.equal(element('target-ghost').innerHTML, '');
  element('challenge').emit('click');
  assert.equal(element('score').textContent, '0000');
  element('sandbox').emit('click');
  assert.equal(element('mission-tag').textContent, '自由探索');
});
