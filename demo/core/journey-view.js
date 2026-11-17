'use strict';
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(require('./chapters.js'), require('./quest.js'));
  else Object.assign((root.ShadowTheatre ||= {}), factory(root.ShadowTheatre, root.ShadowTheatre));
})(globalThis, function ({ CHAPTERS }, { questProgress }) {
  function enemyMarkup(enemy, quest) {
    if (enemy.hp <= 0) return '';
    const boss = enemy.kind !== 'guard',
      color = enemy.kind === 'skeleton' ? '#b8c3a5' : enemy.kind === 'bull' ? '#734149' : '#4f7463';
    const head =
      enemy.kind === 'skeleton'
        ? '<path d="M-25-110Q0-143 25-110L21-90 10-85 8-72H-8L-10-85-23-92Z" fill="#e6d5ab"/><circle cx="-10" cy="-106" r="5" fill="#583c31"/><circle cx="10" cy="-106" r="5" fill="#583c31"/><path d="m0-100-4 8h8zM-9-82H9" stroke="#583c31" fill="#583c31"/>'
        : enemy.kind === 'bull'
          ? '<path d="M-25-112Q-55-145-38-152Q-38-132-17-128M25-112Q55-145 38-152Q38-132 17-128" fill="#d6b06c"/><path d="M-30-120Q0-145 30-120L25-80H-25Z" fill="#70452d"/><ellipse cy="-89" rx="22" ry="14" fill="#bd9967"/><path d="M-19-114h10M9-114h10" stroke="#f4d083" stroke-width="4"/>'
          : '<path d="M-23-102-34-127-9-119Q0-126 10-119L34-127 23-102V-79H-23Z" fill="#526e52"/><path d="m-15-103 8 3M7-100l8-3M-8-88H8" stroke="#efda8d" stroke-width="3"/>';
    return `<g class="quest-enemy ${quest.attackTime > 0 && enemy.hitBy === quest.attackId ? 'enemy-hit' : ''}" transform="translate(${enemy.x} 510)"><title>${enemy.kind === 'skeleton' ? '白骨妖' : enemy.kind === 'bull' ? '牛魔守将' : '山精'}</title><g stroke="#513b2a" stroke-width="2"><path d="M-15-28-24 0H-4L0-29 6 0H26L15-28" fill="#43352e"/><path d="M-23-80H23L35-25Q0-10-35-25Z" fill="${color}"/><path d="M-18-70H18M-22-57H22M-26-44H26" stroke="#d5b979"/><path d="M-24-70-43-40M24-70 43-42" stroke="${color}" stroke-width="14"/>${head}</g><rect x="-30" y="${boss ? -169 : -145}" width="60" height="5" rx="2" fill="#5b423544"/><rect x="-30" y="${boss ? -169 : -145}" width="${(60 * enemy.hp) / enemy.maxHp}" height="5" rx="2" fill="#a74032"/></g>`;
  }
  function journeyMarkup(quest) {
    const chapter = CHAPTERS[quest.chapter],
      active = quest.status !== 'idle';
    const backdrop =
      chapter.id === 'fire'
        ? '<path d="M50 505 180 340 245 420 350 300 470 430 600 310 740 420 860 330 960 505Z" fill="#8d493e" opacity=".2"/><path d="m280 370 70-70 40 82-43-25zM560 375l40-65 30 67-30-20z" fill="#a83d2d" opacity=".35"/>'
        : chapter.id === 'bones'
          ? '<circle cx="785" cy="220" r="54" fill="#e5e0b1" opacity=".45"/><path d="M40 505 185 350 285 435 410 300 550 435 730 325 960 505Z" fill="#526a62" opacity=".23"/><path d="M700 425V330h110v95M685 330h140l-32-25h-77zM710 305l45-25 45 25" fill="#466254" opacity=".3"/>'
          : '<path d="M40 505 180 305 280 435 400 280 540 435 700 290 960 505Z" fill="#597c5d" opacity=".22"/><path d="M145 360q32-25 70 0M361 343q38-24 76 0M655 355q36-22 74 0" fill="none" stroke="#f9e4a6" stroke-width="6" opacity=".5"/><path d="M118 380q-50-75-15-108q40 27 16 76q65-29 70 8q-30 32-71 24" fill="#66825d" opacity=".35"/>';
    if (!active) return `<g pointer-events="none">${backdrop}</g>`;
    const progress = questProgress(quest),
      ready = progress.collected === progress.total && progress.defeated === progress.enemies;
    const items = quest.items
      .filter((item) => !item.collected)
      .map(
        (item, i) =>
          `<g class="quest-item" transform="translate(${item.x} ${item.y + Math.sin(quest.elapsed * 3 + i) * 4})"><circle r="23" fill="#f4d784" opacity=".2"/>${item.kind === 'fan' ? '<path d="M0 12Q-39-10-29-32Q0-54 29-32Q39-10 0 12Z" fill="#7d9f5e" stroke="#426345" stroke-width="2"/><path d="M0 10V-35M0 6-22-27M0 6 22-27M0 12v22" stroke="#e2d18d" stroke-width="3"/>' : '<path d="M0 16Q-26 3-16-13Q-5-23 0-12Q9-23 19-10Q27 6 0 16Z" fill="#d18b6d" stroke="#9f543c" stroke-width="2"/><path d="M0-13q2-17 17-16q-1 15-17 16" fill="#648956"/>'}</g>`,
      )
      .join('');
    const fires = chapter.hazards
      .map(
        (fire) =>
          `<g transform="translate(${fire.x} 510)">${quest.wind > 0 ? '<path d="M-30-9q30 15 60 0" stroke="#70a98a" stroke-width="3" fill="none"/>' : '<path class="quest-fire" d="M-28 0Q-38-24-17-39Q-24-19-8-26Q-13-51 7-64Q1-32 19-40Q37-18 29 0Z" fill="#c5572d" stroke="#8c3b23" stroke-width="2"/><path d="M-12 0Q-18-23 0-35Q-5-14 11-19Q22-9 12 0" fill="#f4bd57"/>'}</g>`,
      )
      .join('');
    const portal = `<g transform="translate(835 510)" class="quest-portal ${ready ? 'portal-ready' : ''}"><path d="M-38 0V-92Q0-148 38-92V0Z" fill="${ready ? '#86ac79' : '#745d44'}" opacity=".4" stroke="#8e743e" stroke-width="4"/><path d="M-28 0V-87Q0-128 28-87V0" fill="none" stroke="#e1bd6d" stroke-width="3"/><text y="-151" text-anchor="middle" class="quest-label">${chapter.exit}</text><text y="-130" text-anchor="middle" class="quest-label small">${ready ? '前往此处 →' : '完成目标后开启'}</text></g>`;
    return `<g pointer-events="none">${backdrop}<path d="M80 512H930" stroke="#745c36" stroke-width="4"/><path d="M90 518H920" stroke="#bfa16b" stroke-width="2" stroke-dasharray="7 5"/>${portal}${items}${fires}${quest.enemies.map((enemy) => enemyMarkup(enemy, quest)).join('')}${quest.wind > 0 ? '<g class="quest-wind" fill="none" stroke="#f1f6cb" stroke-width="4" opacity=".6"><path d="M180 390q150-50 310 0t360 0M230 430q120-30 280 0t310 0M270 350q180-30 440 0"/></g>' : ''}</g>`;
  }
  return { journeyMarkup };
});
