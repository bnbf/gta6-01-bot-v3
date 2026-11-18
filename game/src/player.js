// The player: Milo Kade. On foot (walk/run, aim, shoot) or driving (steal, drive-by).
// State lives in Game; this module holds the pure mechanics.
'use strict';
const Player = (function () {
  function make() {
    return {
      x: 0, y: 0, angle: -Math.PI / 2, speed: 0,
      health: CFG.START_HEALTH, cash: CFG.START_CASH,
      inCar: null, // car object or null
      weapons: [0], // owned weapon indexes
      weapon: 0, ammo: [CFG.START_AMMO_PISTOL, 0, 0, 0],
      cooldown: 0, nos: 100, nosActive: false,
      aimX: 0, aimY: 0, // world aim point (mouse)
    };
  }
  function walk(p, input, dt) {
    const run = input.shift;
    const spd = run ? CFG.RUN_SPEED : CFG.WALK_SPEED;
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my);
      mx /= len; my /= len;
      const nx = p.x + mx * spd * dt, ny = p.y + my * spd * dt;
      if (!City.blockedAt(nx, p.y, 10)) p.x = nx;
      if (!City.blockedAt(p.x, ny, 10)) p.y = ny;
      p.speed = spd;
      p.angle = Math.atan2(p.aimY - p.y, p.aimX - p.x);
    } else p.speed = 0;
    p.x = clamp(p.x, 20, WORLD_W - 20);
    p.y = clamp(p.y, 20, WORLD_H - 20);
    // Note: weapon cooldown is decremented once per frame in Game.update.
  }
  // Steal the nearest parked/traffic car within range. Returns the car or null.
  function trySteal(p, cars, range) {
    let best = null, bd = range * range;
    for (const c of cars) {
      if (c.kind === 'police') continue;
      const d = dist2(p.x, p.y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    if (!best) return null;
    best.kind = 'player';
    p.inCar = best;
    p.x = best.x; p.y = best.y;
    return best;
  }
  function exitCar(p) {
    const c = p.inCar;
    if (!c) return null;
    c.kind = 'parked';
    const a = c.angle + Math.PI / 2;
    p.x = c.x + Math.cos(a) * 34; p.y = c.y + Math.sin(a) * 34;
    p.inCar = null;
    return c;
  }
  // Fire the current weapon toward the aim point. Returns array of hits
  // {x,y} (muzzle + impact) or null. Handles pellets, ammo, cooldown.
  function shoot(p, dt) {
    const w = CFG.WEAPONS[p.weapon];
    if (p.cooldown > 0 || p.ammo[p.weapon] <= 0) return null;
    p.cooldown = 1 / w.rate;
    p.ammo[p.weapon]--;
    const base = Math.atan2(p.aimY - p.y, p.aimX - p.x);
    const pellets = w.pellets || 1;
    const shots = [];
    for (let i = 0; i < pellets; i++) {
      const a = base + (rng() - 0.5) * w.spread * 2;
      shots.push({ x: p.x + Math.cos(a) * w.range, y: p.y + Math.sin(a) * w.range, angle: a, range: w.range });
    }
    return { weapon: w, shots };
  }
  function buyWeapon(p, idx) {
    const w = CFG.WEAPONS[idx];
    if (!w || p.weapons.includes(idx)) return false;
    if (p.cash < w.price) return false;
    p.cash -= w.price;
    p.weapons.push(idx);
    p.ammo[idx] += w.ammo;
    return true;
  }
  function buyAmmo(p, idx) {
    const w = CFG.WEAPONS[idx];
    if (!w || !p.weapons.includes(idx)) return false;
    if (p.cash < w.ammoPrice) return false;
    p.cash -= w.ammoPrice;
    p.ammo[idx] += w.ammo;
    return true;
  }
  // NOS: hold Shift while driving; drains, refills slowly when not boosting.
  function updateNos(p, boosting, dt) {
    if (boosting && p.nos > 0) { p.nos = Math.max(0, p.nos - 34 * dt); p.nosActive = true; }
    else { p.nos = Math.min(100, p.nos + 7 * dt); p.nosActive = false; }
  }
  return { make, walk, trySteal, exitCar, shoot, buyWeapon, buyAmmo, updateNos };
})();
