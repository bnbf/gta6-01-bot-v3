// Pedestrians and foot officers. Peds stroll the sidewalks, flee crimes, and can be
// taxi fares; officers chase on foot at low wanted levels.
'use strict';
const People = (function () {
  const SHIRTS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#e67e22', '#9b59b6', '#ecf0f1', '#1abc9c'];
  function spawnPeds(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = City.randomRoadPoint();
      out.push({
        x: p.x + rr(-40, 40), y: p.y + rr(-40, 40), angle: rr(0, Math.PI * 2),
        speed: rr(35, 70), shirt: pick(SHIRTS), flee: 0, taxi: rng() < 0.25,
        target: City.randomRoadPoint(), wait: rr(0, 3),
      });
    }
    return out;
  }
  function updatePeds(peds, px, py, crime, dt) {
    for (const p of peds) {
      const d = Math.sqrt(dist2(p.x, p.y, px, py));
      if (crime && d < 260) p.flee = 3;
      if (p.flee > 0) {
        p.flee -= dt;
        const a = Math.atan2(p.y - py, p.x - px);
        p.angle = a;
        p.x += Math.cos(a) * 150 * dt;
        p.y += Math.sin(a) * 150 * dt;
        continue;
      }
      if (p.wait > 0) { p.wait -= dt; continue; }
      if (dist2(p.x, p.y, p.target.x, p.target.y) < 900) {
        p.target = City.randomRoadPoint();
        p.wait = rr(0, 4);
        continue;
      }
      const want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
      p.angle += clamp(angDiff(p.angle, want), -2 * dt, 2 * dt);
      const nx = p.x + Math.cos(p.angle) * p.speed * dt;
      const ny = p.y + Math.sin(p.angle) * p.speed * dt;
      if (!City.blockedAt(nx, ny, 6)) { p.x = nx; p.y = ny; }
      else { p.target = City.randomRoadPoint(); }
    }
  }
  function spawnOfficers(n, x, y) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({ x: x + rr(-120, 120), y: y + rr(-120, 120), angle: 0, speed: rr(150, 185), shirt: '#1c2733', officer: true, target: null });
    }
    return out;
  }
  // Foot officers run at the player; return true when one catches the player.
  function updateOfficers(officers, px, py, dt) {
    for (const o of officers) {
      const a = Math.atan2(py - o.y, px - o.x);
      o.angle = a;
      o.x += Math.cos(a) * o.speed * dt;
      o.y += Math.sin(a) * o.speed * dt;
      if (dist2(o.x, o.y, px, py) < 26 * 26) return true;
    }
    return false;
  }
  // Nearest taxi-flagging pedestrian within range, for the taxi side job.
  function nearestTaxi(peds, x, y, range) {
    let best = null, bd = range * range;
    for (const p of peds) {
      if (!p.taxi) continue;
      const d = dist2(p.x, p.y, x, y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  return { spawnPeds, updatePeds, spawnOfficers, updateOfficers, nearestTaxi };
})();
