'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(
      require('./config.js'),
      require('./projection.js'),
      require('./game.js'),
      require('./kinematics.js'),
      require('./journey-view.js'),
    );
  else
    Object.assign(
      (root.ShadowTheatre ||= {}),
      factory(
        root.ShadowTheatre,
        root.ShadowTheatre,
        root.ShadowTheatre,
        root.ShadowTheatre,
        root.ShadowTheatre,
      ),
    );
})(
  globalThis,
  function (
    { GRIPS },
    { projection, projectPoint, projectedRods },
    { targetScene },
    { getPose },
    { journeyMarkup },
  ) {
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
      const staffAngle = pose.attack > 0 ? -15 + 150 * (1 - pose.attack / 0.26) : -66;
      return `<g transform="translate(${pose.x - 500} ${pose.y}) rotate(${pose.lean} 500 375) translate(500 510) scale(${pose.scale || 1}) translate(-500 -510) ${pose.facing === -1 ? 'translate(1000 0) scale(-1 1)' : ''}">
    <path d="M460 357Q390 340 393 399Q399 443 350 431Q330 418 345 403" fill="none" stroke="#71472a" stroke-width="13"/>
    <path d="M460 357Q390 340 393 399Q399 443 350 431" fill="none" stroke="#d3a34f" stroke-width="7"/>
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
    <g stroke="#60331f" stroke-width="2.5">
      <path d="M477 162Q501 144 526 163L536 185 548 197 537 207 536 225Q510 245 486 226L476 202Z" fill="#d9a34d"/>
      <path d="M483 181Q485 167 497 180Q511 165 523 180L529 200 539 207 527 225Q511 231 496 218L484 203Z" fill="#d95b36"/>
      <path d="M494 185Q505 173 516 187L524 202 537 207 524 217Q507 223 497 208Z" fill="#f1ce8b"/>
      <path d="M511 186l12 3-10 4M520 212l11-2" stroke="#493323" fill="none"/>
      <circle cx="479" cy="193" r="12" fill="#d7a354"/><circle cx="479" cy="193" r="6" fill="#a95332"/>
      <path d="M476 176 467 157 484 142 515 143 535 162 527 176Q503 159 476 176Z" fill="#a83424"/>
      <path d="M472 160Q502 145 531 165L528 174Q502 156 477 171Z" fill="#dfb550"/>
      <path d="M482 144 480 122 493 133 503 108 512 133 525 123 520 147Z" fill="#d1a447"/>
      <path d="M480 149Q435 99 443 55Q465 70 463 98Q466 127 491 145M514 146Q557 95 548 54Q526 73 529 103Q528 127 506 144" fill="#614a2c" stroke="#bd944e"/>
      <path d="M474 236Q439 242 426 275L445 270 437 289Q460 274 488 251" fill="#b73d29"/>
    </g>
    ${arm(shoulderR, er, right)}${joint(shoulderL.x, shoulderL.y, 6) + joint(shoulderR.x, shoulderR.y, 6)}
    <g transform="translate(${right.x} ${right.y}) rotate(${staffAngle})"><rect x="-90" y="-6" width="320" height="12" rx="5" fill="#ca8b32" stroke="#6e3c20" stroke-width="2"/><path d="M-86-6h37v12h-37zM190-6h36v12h-36z" fill="#f1ce70" stroke="#a55b28"/><path d="M-38-5H174" stroke="#a53929" stroke-width="5"/></g>
    ${pose.attack > 0 ? '<path d="M600 175Q880 255 800 435" fill="none" stroke="#f5ce6e" stroke-width="14" opacity=".5"/>' : ''}
    </g>`;
    }

    function createRenderer(document) {
      const puppet = document.getElementById('puppet');
      const rods = document.getElementById('rods');
      const handles = document.getElementById('handles');
      const shadow = document.getElementById('ground-shadow');
      const ghost = document.getElementById('target-ghost');
      const lamp = document.getElementById('light-source');
      const screen = document.getElementById('screen-object');
      const effects = document.getElementById('effects');
      const world = document.getElementById('quest-world');
      let targetKey = null,
        lastEvent = 0;
      // Interactive nodes retain identity across frames, preserving focus and pointer targets.
      handles.innerHTML = GRIPS.map(
        (grip) =>
          `<g class="rod-handle" data-grip="${grip.index}" data-object="rod-${grip.id}" role="slider" tabindex="0" aria-label="${grip.label}，方向键调整" aria-valuemin="${grip.field === 'x' ? -360 : -90}" aria-valuemax="${grip.field === 'x' ? 360 : 90}"><circle r="24" fill="transparent"/><circle class="grip" r="12" fill="#efdbad" stroke="#986a3c" stroke-width="2"/><circle r="3" fill="#a24a2d" pointer-events="none"/><text text-anchor="middle" y="34">${grip.label}</text></g>`,
      ).join('');
      const nodes = new Map(
        GRIPS.map((grip) => [
          `rod-${grip.id}`,
          handles.querySelector(`[data-grip="${grip.index}"]`),
        ]),
      );
      return {
        render(pose, state) {
          const scene = state.scene,
            p = projection(scene);
          const matrix = (value) =>
            `matrix(${value.scale} 0 0 ${value.scale} ${value.x} ${value.y})`;
          puppet.innerHTML = puppetMarkup(pose);
          puppet.setAttribute('transform', matrix(p));
          puppet.style.filter = `blur(${p.blur}px)`;
          puppet.setAttribute(
            'opacity',
            String(
              state.quest.invulnerable > 0 && Math.floor(state.quest.invulnerable * 12) % 2
                ? 0.35
                : 0.35 + scene.lightSource.intensity * 0.0065,
            ),
          );
          world.innerHTML = journeyMarkup(state.quest);
          world.setAttribute('transform', matrix(p));
          const renderedRods = projectedRods(pose, scene);
          rods.innerHTML = renderedRods
            .filter((rod) => rod.visible)
            .map(
              ({ anchor: a, handle: h }) =>
                `<path d="M${a.x} ${a.y}L${h.x} ${h.y}" stroke="#64442b" stroke-width="4" opacity=".7"/><path d="M${a.x - 1} ${a.y}L${h.x - 1} ${h.y}" stroke="#b78d51" stroke-width="1" opacity=".7"/>`,
            )
            .join('');
          handles.setAttribute(
            'display',
            scene.rods.some((rod) => rod.visible) ? 'inline' : 'none',
          );
          renderedRods.forEach((rod) => {
            const node = nodes.get(rod.id);
            node.setAttribute('display', rod.visible ? 'inline' : 'none');
            node.setAttribute('transform', `translate(${rod.handle.x} ${rod.handle.y})`);
            node.setAttribute('aria-valuenow', String(Math.round(scene.puppet[rod.field])));
            node.classList.toggle('selected', state.selectedId === rod.id);
          });
          shadow.setAttribute('cx', String(projectPoint({ x: pose.x, y: 510 }, scene).x));
          lamp.setAttribute(
            'transform',
            `translate(${scene.lightSource.x} ${scene.lightSource.y})`,
          );
          lamp.setAttribute('data-color', scene.lightSource.color);
          screen.setAttribute('transform', `translate(${scene.screen.x} ${scene.screen.y})`);
          const key = ['playing', 'paused'].includes(state.game.status) ? state.game.level : null;
          if (key !== targetKey) {
            targetKey = key;
            if (key === null) ghost.innerHTML = '';
            else {
              const target = targetScene(key);
              ghost.innerHTML = puppetMarkup(
                getPose({ ...state, scene: target, action: 'free', time: 0 }),
              );
              ghost.setAttribute('transform', matrix(projection(target)));
            }
          }
          const eventKey = `${state.game.event}-${state.quest.event}`;
          if (eventKey !== lastEvent) {
            lastEvent = eventKey;
            effects.innerHTML =
              state.game.score || state.quest.score
                ? Array.from(
                    { length: 18 },
                    (_, i) =>
                      `<circle class="spark" cx="500" cy="260" r="${3 + (i % 3)}" fill="${i % 2 ? '#e6b959' : '#54c6b0'}" style="--dx:${Math.cos(i * 2.4) * 220}px;--dy:${Math.sin(i * 2.4) * 200}px;animation-delay:${i * 0.015}s"/>`,
                  ).join('')
                : '';
          }
        },
      };
    }
    return { puppetMarkup, createRenderer };
  },
);
