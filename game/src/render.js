// Canvas rendering: the city at golden dusk falling into neon night. Light is the visual:
// neon signs, street lamps, headlights, and a light pool around the player.
'use strict';
const Render = (function () {
  // darkness 0 (18:40 dusk) .. 1 (20:00 night) from the game clock.
  function darkness(clockMin) {
    return clamp((clockMin - CFG.CLOCK_START_MIN) / (CFG.CLOCK_END_MIN - CFG.CLOCK_START_MIN), 0, 1);
  }
  function drawWorld(ctx, game, cam, vw, vh) {
    const d = darkness(game.clockMin);
    const W = WORLD_W, H = WORLD_H;
    // Sky/ground base: warm dusk gradient at the top of the world, sea at the bottom.
    ctx.fillStyle = '#1c1030';
    ctx.fillRect(cam.x, cam.y, vw, vh);
    const gy = City.cityH;
    ctx.fillStyle = '#20242e';
    ctx.fillRect(cam.x, Math.max(cam.y, 0), vw, Math.min(vh, gy - cam.y));
    // Beach + sea.
    ctx.fillStyle = CFG.PALETTE.sand;
    ctx.fillRect(cam.x, gy, vw, CFG.BEACH);
    const seaGrad = ctx.createLinearGradient(0, gy + CFG.BEACH, 0, gy + CFG.BEACH + CFG.SEA);
    seaGrad.addColorStop(0, CFG.PALETTE.sea);
    seaGrad.addColorStop(1, CFG.PALETTE.seaDeep);
    ctx.fillStyle = seaGrad;
    ctx.fillRect(cam.x, gy + CFG.BEACH, vw, CFG.SEA);
    // Sea shimmer lines.
    ctx.strokeStyle = 'rgba(120,200,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const y = gy + CFG.BEACH + 20 + i * 30;
      ctx.beginPath();
      for (let x = Math.max(cam.x, 0); x < Math.min(cam.x + vw, W); x += 60) {
        ctx.lineTo(x, y + Math.sin(x * 0.01 + game.time * 1.4 + i) * 4);
      }
      ctx.stroke();
    }
    // Roads.
    ctx.fillStyle = CFG.PALETTE.road;
    for (const rx of City.roadsX) ctx.fillRect(rx - CFG.ROAD / 2, 0, CFG.ROAD, gy);
    for (const ry of City.roadsY) ctx.fillRect(0, ry - CFG.ROAD / 2, W, CFG.ROAD);
    // Road centre dashes.
    ctx.fillStyle = CFG.PALETTE.roadLine;
    for (const rx of City.roadsX) {
      for (let y = 0; y < gy; y += 46) ctx.fillRect(rx - 2, y, 4, 22);
    }
    for (const ry of City.roadsY) {
      for (let x = 0; x < W; x += 46) ctx.fillRect(x, ry - 2, 22, 4);
    }
    // Blocks: grass base, buildings, palms, parks.
    for (const b of City.blocks) {
      ctx.fillStyle = b.park ? CFG.PALETTE.grass : '#262633';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      for (const bd of b.buildings) {
        if (bd.palm) {
          ctx.fillStyle = '#2f7a3d';
          ctx.beginPath(); ctx.arc(bd.x, bd.y, 9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#6b4a2a';
          ctx.fillRect(bd.x - 2, bd.y - 2, 4, 4);
          continue;
        }
        // Building shadow + roof + lit windows (more lit as night falls).
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(bd.x + 5, bd.y + 6, bd.w, bd.h);
        ctx.fillStyle = bd.color;
        ctx.fillRect(bd.x, bd.y, bd.w, bd.h);
        ctx.strokeStyle = CFG.PALETTE.buildingEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(bd.x, bd.y, bd.w, bd.h);
        const lit = 0.25 + d * 0.6;
        ctx.fillStyle = 'rgba(255,214,120,' + lit.toFixed(2) + ')';
        const cols = Math.max(1, Math.floor(bd.w / 22)), rows = Math.max(1, Math.floor(bd.h / 22));
        for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
          if (hash01(bd.x + cx * 7 + cy * 13) < 0.5) ctx.fillRect(bd.x + 6 + cx * 22, bd.y + 6 + cy * 22, 10, 8);
        }
      }
    }
    drawSigns(ctx, game, d);
    drawLandmarks(ctx, game);
  }
  function drawSigns(ctx, game, d) {
    const glow = 0.35 + d * 0.65;
    ctx.textAlign = 'center';
    for (const s of City.signs) {
      ctx.font = (s.big ? 'bold 34px Arial' : 'bold 15px Arial');
      ctx.shadowColor = s.color;
      ctx.shadowBlur = s.big ? 26 : 12;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = glow;
      ctx.fillText(s.text, s.x, s.y);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  }
  function drawLandmarks(ctx, game) {
    const L = City.landmarks;
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px Arial';
    for (const key of Object.keys(L)) {
      const lm = L[key];
      ctx.fillStyle = lm.kind === 'bank' ? '#f9ed69' : lm.kind === 'safehouse' ? '#00ff9c' : '#e8e8e8';
      ctx.fillText(lm.name.toUpperCase(), lm.x, lm.y - 14);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(lm.x - 16, lm.y - 4, 32, 8);
    }
  }
  // --- Entities -------------------------------------------------------------
  function drawCar(ctx, c, game, d) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    if (c.kind === 'police') {
      ctx.fillStyle = '#101018';
      ctx.fillRect(-c.w / 2 - 2, -c.h / 2 - 2, c.w + 4, c.h + 4);
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.fillStyle = '#101018';
      ctx.fillRect(-c.w / 2, -2, c.w, 4);
      ctx.fillStyle = '#2233ff';
      ctx.fillRect(-c.w / 2 + 4, -c.h / 2 + 3, 10, 5);
      ctx.fillStyle = '#ff2222';
      ctx.fillRect(-c.w / 2 + 4, c.h / 2 - 8, 10, 5);
      const flash = Math.sin(c.siren) > 0;
      ctx.fillStyle = flash ? 'rgba(60,80,255,0.9)' : 'rgba(255,40,40,0.9)';
      ctx.beginPath(); ctx.arc(0, -c.h / 2 - 4, 6, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-c.w / 2 + 3, -c.h / 2 + 4, c.w, c.h);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.fillStyle = 'rgba(180,220,255,0.75)';
      ctx.fillRect(c.w / 2 - 14, -c.h / 2 + 3, 8, c.h - 6);
      ctx.fillStyle = '#111';
      ctx.fillRect(-c.w / 2 + 4, -c.h / 2 - 3, 8, 5);
      ctx.fillRect(-c.w / 2 + 4, c.h / 2 - 2, 8, 5);
      ctx.fillRect(c.w / 2 - 12, -c.h / 2 - 3, 8, 5);
      ctx.fillRect(c.w / 2 - 12, c.h / 2 - 2, 8, 5);
      if (c.gold) { ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3; ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h); }
      if (c.smoking) {
        ctx.fillStyle = 'rgba(120,120,120,0.7)';
        ctx.beginPath(); ctx.arc(-c.w / 2 + 6, 0, 7 + Math.sin(game.time * 9) * 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Headlight cones at night.
    if (d > 0.25) {
      const grad = ctx.createLinearGradient(c.w / 2, 0, c.w / 2 + 150, 0);
      grad.addColorStop(0, 'rgba(255,240,180,0.30)');
      grad.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(c.w / 2, -8); ctx.lineTo(c.w / 2 + 150, -42);
      ctx.lineTo(c.w / 2 + 150, 42); ctx.lineTo(c.w / 2, 8);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawPed(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.officer ? '#1c2733' : p.shirt;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath(); ctx.arc(4, 0, 4, 0, Math.PI * 2); ctx.fill();
    if (p.taxi) { ctx.fillStyle = '#f9ed69'; ctx.font = 'bold 11px Arial'; ctx.fillText('$', -14, -10); }
    ctx.restore();
  }
  function drawPlayer(ctx, p, game) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#ff5e3a';
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.beginPath(); ctx.arc(5, 0, 4.5, 0, Math.PI * 2); ctx.fill();
    // Gun barrel toward aim.
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(16, 0); ctx.stroke();
    ctx.restore();
  }
  function drawHeli(ctx, h, game, d) {
    const bob = Math.sin(h.hover * 2) * 3;
    ctx.save();
    ctx.translate(h.x, h.y + bob);
    ctx.rotate(h.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 10, 34, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c2733';
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    const rot = game.time * 14;
    ctx.beginPath(); ctx.moveTo(Math.cos(rot) * 34, Math.sin(rot) * 6); ctx.lineTo(-Math.cos(rot) * 34, -Math.sin(rot) * 6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,40,40,0.9)';
    ctx.beginPath(); ctx.arc(-24, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Spotlight cone onto the player.
    if (d > 0.15) {
      const grad = ctx.createRadialGradient(game.player.x, game.player.y, 8, game.player.x, game.player.y, 150);
      grad.addColorStop(0, 'rgba(255,250,200,' + (0.28 + h.spotlight * 0.12).toFixed(2) + ')');
      grad.addColorStop(1, 'rgba(255,250,200,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(game.player.x, game.player.y, 150, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Night darkness overlay with a light pool around the player.
  function drawLighting(ctx, game, cam, vw, vh) {
    const d = darkness(game.clockMin);
    if (d <= 0.02) return;
    const g = ctx.createRadialGradient(game.player.x, game.player.y, 90, game.player.x, game.player.y, 520);
    g.addColorStop(0, 'rgba(4,2,16,0)');
    g.addColorStop(1, 'rgba(4,2,16,' + (0.55 * d).toFixed(2) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(cam.x, cam.y, vw, vh);
  }
  // Live minimap (top-right), with mission marker, cops, heli, shops.
  function drawMinimap(ctx, game, vw) {
    const mw = 218, mh = Math.round(218 * WORLD_H / WORLD_W);
    const x0 = vw - mw - 14, y0 = 14;
    const sx = mw / WORLD_W, sy = mh / WORLD_H;
    ctx.save();
    ctx.fillStyle = 'rgba(8,8,18,0.82)';
    ctx.fillRect(x0 - 4, y0 - 4, mw + 8, mh + 8);
    ctx.strokeStyle = '#08d9d6';
    ctx.lineWidth = 2;
    ctx.strokeRect(x0 - 4, y0 - 4, mw + 8, mh + 8);
    ctx.fillStyle = '#23232e';
    ctx.fillRect(x0, y0, mw, mh);
    ctx.fillStyle = '#0a2e4a';
    ctx.fillRect(x0, y0 + City.cityH * sy, mw, mh - City.cityH * sy);
    ctx.fillStyle = '#3a3a48';
    for (const rx of City.roadsX) ctx.fillRect(x0 + (rx - CFG.ROAD / 2) * sx, y0, CFG.ROAD * sx, City.cityH * sy);
    for (const ry of City.roadsY) ctx.fillRect(x0, y0 + (ry - CFG.ROAD / 2) * sy, mw, CFG.ROAD * sy);
    const dot = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0 + x * sx, y0 + y * sy, r, 0, Math.PI * 2); ctx.fill(); };
    const m = game.missions;
    if (m.target) dot(m.target.x, m.target.y, 5, '#f9ed69');
    for (const c of game.police) dot(c.x, c.y, 3, '#ff2222');
    if (game.heli) dot(game.heli.x, game.heli.y, 4, '#ff2222');
    dot(game.player.x, game.player.y, 4, '#00ff9c');
    ctx.restore();
  }
  return { darkness, drawWorld, drawCar, drawPed, drawPlayer, drawHeli, drawLighting, drawMinimap };
})();
