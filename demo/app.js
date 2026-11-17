/* Original stylized puppet. Simplified planar inverse kinematics, not a reconstruction of a regional technique. */
'use strict';
const $ = id => document.getElementById(id);
const svg = $('theatre');
const state = { action: 'free', playing: false, time: 0, speed: 1, x: 0, liftL: 0, liftR: 0, drag: null };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const descriptions = {
  free: ['此刻，你是操偶师', '拖动签杆，或从右侧选择一段身法'],
  wave: ['挥袖招手', '手签提起，肘腕相随，向观众问好'],
  walk: ['信步登场', '主签牵身，双腿交替，缓缓走入光中'],
  bow: ['俯身行礼', '身体前倾，再徐徐起身'],
  salute: ['拱手亮相', '双手向胸前收拢，停顿亮相'],
  dance: ['舒袖起舞', '左右手签交替提落，身形随之轻摇']
};
const names = {free:'自由操偶',wave:'挥袖招手',walk:'信步登场',bow:'俯身行礼',salute:'拱手亮相',dance:'舒袖起舞'};
function selectAction(action) {
  state.action = action; state.time = 0; state.playing = action !== 'free';
  document.querySelectorAll('.action').forEach(b => { const active = b.dataset.action === action; b.classList.toggle('active', active); b.setAttribute('aria-pressed', active); });
  $('mode-label').textContent = names[action];
  $('playing-title').textContent = descriptions[action][0]; $('playing-note').textContent = descriptions[action][1];
  updatePlay(); render();
}
function updatePlay() { $('play').textContent = state.playing ? 'Ⅱ' : '▷'; $('play').setAttribute('aria-label', state.playing ? '暂停动作' : '播放当前动作'); }
document.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', () => selectAction(b.dataset.action)));
function togglePlay() { if(state.action === 'free') return selectAction('wave'); state.playing = !state.playing; updatePlay(); }
$('play').addEventListener('click',togglePlay);
$('reset').addEventListener('click', () => { Object.assign(state,{x:0,liftL:0,liftR:0}); syncInputs(); selectAction('free'); });
function syncInputs() {
  $('body').value = state.x; $('left').value = state.liftL; $('right').value = state.liftR;
  $('body-value').textContent = Math.abs(state.x)<1?'居中':`${state.x>0?'右':'左'} ${Math.round(Math.abs(state.x))}`;
  $('left-value').textContent = Math.abs(state.liftL)<1?'自然':`${Math.round(state.liftL)}°`;
  $('right-value').textContent = Math.abs(state.liftR)<1?'自然':`${Math.round(state.liftR)}°`;
}
[['body','x'],['left','liftL'],['right','liftR']].forEach(([id,key]) => $(id).addEventListener('input', e => { state[key]=Number(e.target.value); if(state.action!=='free') selectAction('free'); syncInputs(); render(); }));
$('light').addEventListener('input', e => { const v = Number(e.target.value); $('stage').style.setProperty('--lamp-opacity',(100-v)/200); $('light-value').textContent=v+'%'; });
$('speed').addEventListener('input', e => { state.speed=Number(e.target.value)/100; $('speed-value').textContent=state.speed.toFixed(2).replace(/0$/,'')+'×'; });
$('show-rods').addEventListener('change',render);
function joint(x,y,r=5) { return `<circle class="joint" cx="${x}" cy="${y}" r="${r}"/>`; }
function segment(a,b,width,color,pattern=true) {
  const angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI, length=Math.hypot(b.x-a.x,b.y-a.y);
  return `<g transform="translate(${a.x} ${a.y}) rotate(${angle})"><path d="M0 ${-width/2} Q${length/2} ${-width*.7} ${length} ${-width*.35} L${length} ${width*.35} Q${length/2} ${width*.7} 0 ${width/2}Z" fill="${color}" stroke="#542b1d" stroke-width="2.5"/>${pattern?`<path d="M5 ${-width*.35}H${length-5}V${width*.35}H5Z" fill="url(#leather)" opacity=".75"/>`:''}</g>`;
}
// Two-link inverse kinematics keeps the elbow attached as the hand moves.
function elbow(a,b,flip) {
  const dx=b.x-a.x,dy=b.y-a.y,raw=Math.hypot(dx,dy),d=clamp(raw,5,145),angle=Math.atan2(dy,dx),offset=Math.acos(clamp(d/150,-1,1))*flip;
  return {x:a.x+75*Math.cos(angle+offset), y:a.y+75*Math.sin(angle+offset)};
}
let pose;
function getPose() {
  const t=state.time; let x=500+state.x,y=0,lean=0,step=0;
  const l=state.liftL*Math.PI/180,r=state.liftR*Math.PI/180;
  let left={x:420-110*Math.cos(l), y:250-110*Math.sin(l)+45};
  let right={x:555+110*Math.cos(r), y:250-110*Math.sin(r)+45};
  if(state.action==='wave') right={x:610+15*Math.sin(t*3),y:170+25*Math.sin(t*4)};
  if(state.action==='walk'){x+=105*Math.sin(t*.65); step=Math.sin(t*3.5); y=-Math.abs(step)*6; left.y+=step*22; right.y-=step*22;}
  if(state.action==='bow'){lean=22*(.5-.5*Math.cos(t*1.6));y=8*Math.sin(t*.8)**2;left={x:440,y:315};right={x:590,y:315};}
  if(state.action==='salute'){const f=(1-Math.cos(t*1.8))/2;left={x:310+193*f,y:295-45*f};right={x:665-144*f,y:295-45*f};}
  if(state.action==='dance'){left={x:340+25*Math.sin(t*2),y:240-85*Math.sin(t*2)};right={x:640+25*Math.cos(t*2),y:240+85*Math.sin(t*2)};lean=5*Math.sin(t*2);y=-4*Math.sin(t*2)**2;}
  const rad=lean*Math.PI/180;
  const world=p=>({x:x+(p.x-500)*Math.cos(rad)-(p.y-375)*Math.sin(rad),y:375+y+(p.x-500)*Math.sin(rad)+(p.y-375)*Math.cos(rad)});
  return {x,y,lean,step,left,right,world};
}
function render() {
  pose=getPose(); const {left,right,step}=pose;
  const shoulderL={x:460,y:252},shoulderR={x:530,y:252},el=elbow(shoulderL,left,-1),er=elbow(shoulderR,right,1);
  const kneeL={x:470-step*22,y:432-Math.max(0,step)*15},footL={x:465-step*48,y:501-Math.max(0,step)*25};
  const kneeR={x:528+step*22,y:434-Math.max(0,-step)*15},footR={x:545+step*48,y:501-Math.max(0,-step)*25};
  const arm=(a,e,b)=>segment(a,e,29,'#9b3826')+segment(e,b,22,'#b54d29')+joint(e.x,e.y)+`<g transform="translate(${b.x} ${b.y})"><path d="M-8-7Q0-15 10-9L22-5Q27-2 21 1L10 3 17 9Q15 14 8 9L-5 6Z" fill="#dba052" stroke="#65301d" stroke-width="2"/></g>`+joint(b.x,b.y,3);
  $('puppet').innerHTML=`<g transform="translate(${pose.x-500} ${pose.y}) rotate(${pose.lean} 500 375)">
    ${segment({x:478,y:362},kneeL,29,'#463e35')+segment(kneeL,footL,24,'#8c3326')}${segment({x:520,y:362},kneeR,29,'#67402d')+segment(kneeR,footR,24,'#a33e26')}
    <path d="M${footL.x-15} ${footL.y-9}q22 0 35 9q4 10-10 10h-35zM${footR.x-13} ${footR.y-9}q22 0 37 9q4 10-10 10h-37z" fill="#352c25" stroke="#703d28" stroke-width="3"/>
    ${joint(kneeL.x,kneeL.y)+joint(kneeR.x,kneeR.y)}
    ${arm(shoulderL,el,left)}
    <path d="M460 242Q490 227 531 242L548 298 534 331 555 390Q500 413 444 386L462 329 449 292Z" fill="#a73d28" stroke="#522a1c" stroke-width="3"/>
    <path d="M465 249Q495 237 528 249L540 294 524 325 541 384Q500 399 457 382L475 325 460 290Z" fill="url(#scale)"/>
    <path d="M484 241V321M508 240V321M459 319Q500 332 538 319L538 334Q500 346 459 333Z" stroke="#60301f" stroke-width="3" fill="#dfad55"/>
    <circle cx="500" cy="329" r="12" fill="#683126" stroke="#efd18a" stroke-width="3"/><path d="m500 321 6 8-6 8-6-8z" fill="#e2b764"/>
    <path d="M472 342 457 382M486 344 481 392M511 344 519 393M525 341 541 384" stroke="#f0c574" stroke-width="3"/><path d="M450 388Q499 413 551 391" fill="none" stroke="#652f21" stroke-width="6"/>
    <path d="M484 246V218H510V245" fill="#cf9752" stroke="#653620" stroke-width="3"/>
    <path d="M474 159Q511 139 533 170L532 182 547 197 535 202 539 213 529 227 505 231 481 211Z" fill="#e4b366" stroke="#60331f" stroke-width="3"/>
    <path d="m526 181 8 2-6 4M531 211l-12 1M515 168l15 7" stroke="#563123" stroke-width="3" fill="none"/><path d="M486 183q-14-8-13 7q0 14 15 14" fill="#bd7f42" stroke="#623520" stroke-width="2"/>
    <path d="M474 182 464 153Q478 126 517 139L537 165 524 177Q500 156 474 182Z" fill="#913323" stroke="#522b20" stroke-width="3"/>
    <path d="M469 153Q496 135 526 157L522 167Q495 150 475 169Z" fill="url(#leather)" stroke="#e6bb67" stroke-width="2"/>
    <path d="M481 140 477 114 490 125 502 102 509 129 526 119 520 143Z" fill="#c19145" stroke="#62351e" stroke-width="3"/><circle cx="501" cy="134" r="6" fill="#a33a29" stroke="#f2ce7c" stroke-width="2"/>
    <path d="M479 145Q441 98 443 63Q461 74 465 100Q469 119 490 139M514 141Q552 98 551 62Q533 74 530 103Q526 124 506 140" fill="#473c2b" stroke="#693d25" stroke-width="2"/>
    <path d="M482 145Q446 96 445 70M514 143Q548 96 549 70" stroke="#c99952" stroke-width="2" fill="none"/>
    <path d="M472 181Q457 202 467 236L480 247 478 204" fill="#a33a26" stroke="#60301f" stroke-width="3"/><path d="M468 190V229M473 186V237" stroke="#e4b264" stroke-width="2"/>
    ${arm(shoulderR,er,right)}${joint(shoulderL.x,shoulderL.y,6)+joint(shoulderR.x,shoulderR.y,6)}
    </g>`;
  const points=[pose.world(left),pose.world({x:500,y:310}),pose.world(right)];
  const grips=points.map((p,i)=>({x:p.x+(i===0?-65:i===2?65:0),y:i===1?571:p.y+185}));
  const show=$('show-rods').checked;
  $('rods').innerHTML=show?points.map((p,i)=>`<path d="M${p.x} ${p.y}L${grips[i].x} ${grips[i].y}" stroke="#64442b" stroke-width="4" opacity=".7"/><path d="M${p.x-1} ${p.y}L${grips[i].x-1} ${grips[i].y}" stroke="#b78d51" stroke-width="1" opacity=".7"/>`).join(''):'';
  // Do not replace captured elements mid-drag; pointer capture belongs to the stable SVG root.
  $('handles').innerHTML=show?grips.map((g,i)=>`<g class="rod-handle" data-grip="${i}" transform="translate(${g.x} ${g.y})" role="button" tabindex="0" aria-label="${['左手签，方向键调整','主签，方向键移动身体','右手签，方向键调整'][i]}"><circle r="24" fill="transparent"/><circle class="grip" r="12" fill="#efdbad" stroke="#986a3c" stroke-width="2"/><circle r="3" fill="#a24a2d" pointer-events="none"/><text text-anchor="middle" y="34">${['左手签','主签','右手签'][i]}</text></g>`).join(''):'';
  $('ground-shadow').setAttribute('cx',pose.x);
}
function svgPoint(e) { return new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse()); }
svg.addEventListener('pointerdown',e=>{
  const handle=e.target.closest('[data-grip]'); if(!handle)return;
  e.preventDefault(); const p=svgPoint(e),i=Number(handle.dataset.grip);
  if(state.action!=='free') selectAction('free');
  state.drag={i,start:p,x:state.x,l:state.liftL,r:state.liftR,pointerId:e.pointerId};svg.setPointerCapture(e.pointerId);
});
svg.addEventListener('pointermove',e=>{
  const d=state.drag;if(!d||e.pointerId!==d.pointerId)return;const p=svgPoint(e);
  if(d.i===1)state.x=clamp(d.x+p.x-d.start.x,-180,180);
  else { const value=clamp((d.i===0?d.l:d.r)-(p.y-d.start.y)*.8+(p.x-d.start.x)*(d.i===0?-.2:.2),-90,90);state[d.i===0?'liftL':'liftR']=value; }
  syncInputs();render();
});
function stopDrag(){state.drag=null;}svg.addEventListener('pointerup',stopDrag);svg.addEventListener('pointercancel',stopDrag);svg.addEventListener('lostpointercapture',stopDrag);
svg.addEventListener('keydown',e=>{
  const grip=e.target.closest('[data-grip]');if(!grip||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
  e.preventDefault();const i=Number(grip.dataset.grip);if(state.action!=='free')selectAction('free');
  const delta=['ArrowUp','ArrowRight'].includes(e.key)?5:-5;
  if(i===1)state.x=clamp(state.x+delta,-180,180);else {const key=i===0?'liftL':'liftR';state[key]=clamp(state[key]+delta,-90,90);}
  syncInputs();render();svg.querySelector(`[data-grip="${i}"]`).focus();
});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target===document.body){e.preventDefault();togglePlay();}});
let last=0;
function tick(now){const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(state.playing&&!document.hidden){state.time+=dt*state.speed;render();}requestAnimationFrame(tick);}
syncInputs();render();requestAnimationFrame(tick);
