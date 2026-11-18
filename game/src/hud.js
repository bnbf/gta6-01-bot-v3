// HUD (wanted stars, cash, health, ammo, speed, clock, objective) + title / pause /
// busted / wasted screens. DOM in index.html, drawn on canvas where it fits.
'use strict';
const Hud = (function () {
  function draw(ctx, game, vw, vh) {
    const p = game.player;
    // Wanted stars (label BELOW the stars — no overlap).
    ctx.textAlign = 'left';
    ctx.font = 'bold 26px Arial';
    for (let i = 0; i < CFG.WANTED_MAX; i++) {
      ctx.fillStyle = i < game.wanted ? '#ff2e2e' : 'rgba(255,255,255,0.25)';
      ctx.fillText('★', 16 + i * 30, 40);
    }
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#e8e8e8';
    ctx.fillText('WANTED', 16, 60);
    // Cash / health / ammo.
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#7dff8a';
    ctx.fillText(fmtMoney(p.cash), 16, 92);
    ctx.fillStyle = p.health > 30 ? '#e8e8e8' : '#ff5555';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('HP ' + Math.ceil(p.health), 16, 116);
    const w = CFG.WEAPONS[p.weapon];
    ctx.fillStyle = '#ffd75e';
    ctx.fillText(w.name + '  ' + p.ammo[p.weapon] + '  [1-4]', 16, 138);
    if (p.inCar) {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillText(Math.round(Math.abs(p.inCar.speed) * 0.18) + ' mph', 16, 160);
      ctx.fillStyle = p.inCar.damage > 60 ? '#ff5555' : '#9be8ff';
      ctx.fillText('DAMAGE ' + Math.round(p.inCar.damage) + '%', 16, 180);
      if (p.nos < 100 || p.nosActive) {
        ctx.fillStyle = p.nosActive ? '#00ff9c' : '#9be8ff';
        ctx.fillText('NOS ' + Math.round(p.nos) + '%', 16, 200);
      }
    }
    // Clock + radio.
    ctx.textAlign = 'right';
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#ffd75e';
    ctx.fillText(fmtClock(game.clockMin), vw - 16, 40);
    if (AudioSys.isRadioOn()) {
      ctx.font = 'bold 13px Arial';
      ctx.fillStyle = '#08d9d6';
      ctx.fillText('♪ ' + AudioSys.stationName(), vw - 16, 62);
    }
    // Objective.
    const m = game.missions;
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px Arial';
    ctx.fillStyle = '#f9ed69';
    if (m.active) ctx.fillText(m.active.name + ': ' + (m.target ? m.target.label : m.active.brief), 16, vh - 44);
    else if (game.missionDone) ctx.fillText('All missions complete — King of the Bay!', 16, vh - 44);
    else ctx.fillText('Find a car. Explore Lumen Bay.', 16, vh - 44);
    // Toast messages.
    if (game.toast && game.toastT > 0) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillText(game.toast, vw / 2, 84);
    }
    // Heat vignette at 4+ stars.
    if (game.wanted >= 4) {
      const g = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.35, vw / 2, vh / 2, vh * 0.75);
      g.addColorStop(0, 'rgba(255,0,0,0)');
      g.addColorStop(1, 'rgba(255,0,0,0.22)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
    }
  }
  function titleScreen(ctx, vw, vh, game) {
    ctx.fillStyle = 'rgba(5,2,18,0.88)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff2e63';
    ctx.shadowColor = '#ff2e63';
    ctx.shadowBlur = 30;
    ctx.font = 'bold 64px Arial';
    ctx.fillText('LUMEN BAY', vw / 2, vh * 0.24);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#08d9d6';
    ctx.font = 'bold 30px Arial';
    ctx.fillText('— NEON HEAT —', vw / 2, vh * 0.24 + 44);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = '17px Arial';
    const lines = [
      '7 story missions  •  police helicopter  •  4 weapons  •  car radio',
      'shops  •  safehouse  •  NOS  •  saves  •  drive-by shooting  •  street races',
      'taxi fares  •  stealable cars  •  wanted 1–5 stars  •  live minimap',
    ];
    lines.forEach((l, i) => ctx.fillText(l, vw / 2, vh * 0.38 + i * 26));
    ctx.fillStyle = '#f9ed69';
    ctx.font = 'bold 19px Arial';
    ctx.fillText('WASD drive / walk   •   E enter car / interact   •   Mouse aim, Click shoot', vw / 2, vh * 0.56);
    ctx.fillText('Shift NOS / run   •   R radio   •   Q station   •   1–4 weapons   •   P pause', vw / 2, vh * 0.56 + 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(game.started ? 'Press ENTER to continue' : 'Press ENTER to start', vw / 2, vh * 0.70);
    ctx.fillStyle = '#9be8ff';
    ctx.font = '15px Arial';
    ctx.fillText('Milo Kade  •  Vera Solano  •  Big Lou  •  an original city — nothing from Rockstar', vw / 2, vh * 0.70 + 30);
    ctx.fillStyle = '#888';
    ctx.font = '13px Arial';
    ctx.fillText('Progress autosaves. Built by an AI agent for make.fun — Make GTA 6 ($1,666).', vw / 2, vh - 24);
  }
  // Full-screen message (busted / wasted / paused / mission complete).
  function overlay(ctx, vw, vh, title, sub, color) {
    ctx.fillStyle = 'rgba(5,2,18,0.82)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.textAlign = 'center';
    ctx.fillStyle = color || '#ff2e63';
    ctx.font = 'bold 52px Arial';
    ctx.fillText(title, vw / 2, vh / 2 - 10);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = '19px Arial';
    ctx.fillText(sub || '', vw / 2, vh / 2 + 30);
    ctx.fillStyle = '#9be8ff';
    ctx.font = '15px Arial';
    ctx.fillText('Press ENTER to continue', vw / 2, vh / 2 + 66);
  }
  return { draw, titleScreen, overlay };
})();
