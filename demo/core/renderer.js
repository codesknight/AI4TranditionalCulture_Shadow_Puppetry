'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(require('./config.js'));
  else Object.assign((root.ShadowTheatre ||= {}), factory(root.ShadowTheatre));
})(globalThis, function ({ CONFIG, GRIPS }) {
  function joint(x, y, r = 5) {
    return `<circle class="joint" cx="${x}" cy="${y}" r="${r}"/>`;
  }
  function segment(a, b, width, color, pattern = true) {
    const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      length = Math.hypot(b.x - a.x, b.y - a.y);
    return `<g transform="translate(${a.x} ${a.y}) rotate(${angle})"><path d="M0 ${-width / 2} Q${length / 2} ${-width * 0.7} ${length} ${-width * 0.35} L${length} ${width * 0.35} Q${length / 2} ${width * 0.7} 0 ${width / 2}Z" fill="${color}" stroke="#542b1d" stroke-width="2.5"/>${pattern ? `<path d="M5 ${-width * 0.35}H${length - 5}V${width * 0.35}H5Z" fill="url(#leather)" opacity=".75"/>` : ''}</g>`;
  }
  function puppetMarkup(pose) {
    const { left, right, step } = pose;
    const shoulderL = pose.arms.left.shoulder,
      shoulderR = pose.arms.right.shoulder;
    const el = pose.arms.left.elbow,
      er = pose.arms.right.elbow;
    const kneeL = { x: 470 - step * 22, y: 432 - Math.max(0, step) * 15 },
      footL = { x: 465 - step * 48, y: 501 - Math.max(0, step) * 25 };
    const kneeR = { x: 528 + step * 22, y: 434 - Math.max(0, -step) * 15 },
      footR = { x: 545 + step * 48, y: 501 - Math.max(0, -step) * 25 };
    const arm = (a, e, b) =>
      segment(a, e, 29, '#9b3826') +
      segment(e, b, 22, '#b54d29') +
      joint(e.x, e.y) +
      `<g transform="translate(${b.x} ${b.y})"><path d="M-8-7Q0-15 10-9L22-5Q27-2 21 1L10 3 17 9Q15 14 8 9L-5 6Z" fill="#dba052" stroke="#65301d" stroke-width="2"/></g>` +
      joint(b.x, b.y, 3);
    return `<g transform="translate(${pose.x - 500} ${pose.y}) rotate(${pose.lean} 500 375)">
    ${segment({ x: 478, y: 362 }, kneeL, 29, '#463e35') + segment(kneeL, footL, 24, '#8c3326')}${segment({ x: 520, y: 362 }, kneeR, 29, '#67402d') + segment(kneeR, footR, 24, '#a33e26')}
    <path d="M${footL.x - 15} ${footL.y - 9}q22 0 35 9q4 10-10 10h-35zM${footR.x - 13} ${footR.y - 9}q22 0 37 9q4 10-10 10h-37z" fill="#352c25" stroke="#703d28" stroke-width="3"/>
    ${joint(kneeL.x, kneeL.y) + joint(kneeR.x, kneeR.y)}
    ${arm(shoulderL, el, left)}
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
    ${arm(shoulderR, er, right)}${joint(shoulderL.x, shoulderL.y, 6) + joint(shoulderR.x, shoulderR.y, 6)}
    </g>`;
  }

  function createRenderer(document) {
    const puppet = document.getElementById('puppet');
    const rods = document.getElementById('rods');
    const handles = document.getElementById('handles');
    const shadow = document.getElementById('ground-shadow');
    // Interactive nodes retain identity across frames, preserving focus and pointer targets.
    handles.innerHTML = GRIPS.map(
      (grip) =>
        `<g class="rod-handle" data-grip="${grip.index}" role="slider" tabindex="0" aria-label="${grip.label}??????" aria-valuemin="${CONFIG.limits[grip.field][0]}" aria-valuemax="${CONFIG.limits[grip.field][1]}"><circle r="24" fill="transparent"/><circle class="grip" r="12" fill="#efdbad" stroke="#986a3c" stroke-width="2"/><circle r="3" fill="#a24a2d" pointer-events="none"/><text text-anchor="middle" y="34">${grip.label}</text></g>`,
    ).join('');
    const nodes = GRIPS.map((grip) => handles.querySelector(`[data-grip="${grip.index}"]`));
    return {
      render(pose, state) {
        puppet.innerHTML = puppetMarkup(pose);
        rods.innerHTML = state.showRods
          ? pose.rods
              .map(
                ({ anchor: a, handle: h }) =>
                  `<path d="M${a.x} ${a.y}L${h.x} ${h.y}" stroke="#64442b" stroke-width="4" opacity=".7"/><path d="M${a.x - 1} ${a.y}L${h.x - 1} ${h.y}" stroke="#b78d51" stroke-width="1" opacity=".7"/>`,
              )
              .join('')
          : '';
        handles.setAttribute('display', state.showRods ? 'inline' : 'none');
        pose.rods.forEach((rod, i) => {
          nodes[i].setAttribute('transform', `translate(${rod.handle.x} ${rod.handle.y})`);
          nodes[i].setAttribute('aria-valuenow', String(Math.round(state[rod.field])));
        });
        shadow.setAttribute('cx', String(pose.x));
      },
    };
  }
  return { puppetMarkup, createRenderer };
});
