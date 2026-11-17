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
  document.getElementById = element;
  document.querySelector = () => element('grid');
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
    'core/model.js',
    'core/kinematics.js',
    'core/renderer.js',
    'controller.js',
  ]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../demo', file), 'utf8'), context, {
      filename: file,
    });
  }
  return { element, document, frame: (time) => frame(time) };
}
test('classic scripts initialize UI and registry buttons without a bundler', () => {
  const { element } = setup();
  assert.equal(element('grid').children.length, 6);
  assert.equal(element('mode-label').textContent, '自由操偶');
  assert.match(element('puppet').innerHTML, /<path/);
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
  assert.equal(element('body').value, 180);
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
