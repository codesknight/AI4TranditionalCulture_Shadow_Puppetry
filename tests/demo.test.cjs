const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise animation and event handlers without a browser; visual layout needs separate browser QA.
function setup() {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, { value:0, checked:true, innerHTML:'', textContent:'', attrs:{}, listeners:{}, style:{setProperty(){}}, classList:{toggle(){}}, dataset:{},
      setAttribute(k,v){this.attrs[k]=v;}, addEventListener(k,v){this.listeners[k]=v;}, setPointerCapture(){}, querySelector(){return {focus(){}};}, getScreenCTM(){return {inverse(){return {};}};} });
    return elements.get(id);
  }
  const actions=['free','wave','walk','bow','salute','dance'].map(a=>{const e=element(a);e.dataset.action=a;return e;});
  const context=vm.createContext({document:{getElementById:element,querySelectorAll:()=>actions,addEventListener(){},hidden:false},requestAnimationFrame(){},DOMPoint:class{constructor(x,y){this.x=x;this.y=y;}matrixTransform(){return this;}}});
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../demo/app.js'),'utf8'),context);
  return {run:s=>vm.runInContext(s,context),element};
}
test('all animated poses produce finite SVG geometry over a full sequence',()=>{
  const {run,element}=setup();
  for(const action of ['free','wave','walk','bow','salute','dance']){
    run(`selectAction('${action}')`);
    for(let t=0;t<=20;t+=.2){run(`state.time=${t};render()`);assert.doesNotMatch(element('puppet').innerHTML,/NaN|Infinity|undefined/);assert.doesNotMatch(element('rods').innerHTML,/NaN|Infinity|undefined/);}
  }
});
test('pause preserves the pose and resume advances time',()=>{
  const {run}=setup();run("selectAction('walk');tick(100);tick(200);togglePlay()");
  const t=run('state.time');run('tick(300)');assert.equal(run('state.time'),t);run('togglePlay();tick(400)');assert.ok(run('state.time')>t);
});
test('manual controls interrupt animation, and reset restores neutral state',()=>{
  const {run,element}=setup();run("selectAction('dance')");element('body').listeners.input({target:{value:'120'}});
  assert.equal(run('state.action'),'free');assert.equal(run('state.x'),120);
  element('reset').listeners.click();assert.equal(run('state.x'),0);assert.equal(run('state.playing'),false);assert.equal(element('body-value').textContent,'居中');
});
test('dragging the main rod moves the body and clamps to stage bounds',()=>{
  const {run,element}=setup();const svg=element('theatre');
  svg.listeners.pointerdown({target:{closest:()=>({dataset:{grip:'1'}})},clientX:500,clientY:571,pointerId:1,preventDefault(){}});
  svg.listeners.pointermove({clientX:900,clientY:571,pointerId:1});assert.equal(run('state.x'),180);
  svg.listeners.pointerup();assert.equal(run('state.drag'),null);
});
test('rods can be hidden and light and speed controls update',()=>{
  const {run,element}=setup();element('show-rods').checked=false;element('show-rods').listeners.change();assert.equal(element('rods').innerHTML,'');assert.equal(element('handles').innerHTML,'');
  element('speed').listeners.input({target:{value:'150'}});assert.equal(run('state.speed'),1.5);
  element('light').listeners.input({target:{value:'50'}});assert.equal(element('light-value').textContent,'50%');
});
