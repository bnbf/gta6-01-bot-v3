// Vehicles: traffic AI, player arcade driving, police chase, helicopter.
// Cars are plain objects {x,y,angle,speed,color, kind, ...}; updated by Game.
'use strict';
const CAR_COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#7f8c8d', '#8e44ad', '#e67e22', '#16a085', '#dfe6e9'];
const Vehicles = (function () {
  function makeCar(x, y, angle, color, kind) {
    return {
      x, y, angle, speed: 0, color: color || pick(CAR_COLORS),
      kind: kind || 'traffic', w: 46, h: 22,
      target: null, wait: 0, damage: 0, smoking: false,
      siren: 0, heli: false, spotlight: 0,
    };
  }
  function spawnTraffic(n, cx, cy) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = City.randomRoadPoint();
      const c = makeCar(p.x, p.y, pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), null, 'traffic');
      c.target = City.randomRoadPoint();
      c.speed = rr(120, 200);
      out.push(c);
    }
    return out;
  }
  function spawnParked(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = City.randomRoadPoint();
      const horiz = Math.abs(p.y - Math.round(p.y)) < 1;
      const a = rng() < 0.5 ? 0 : Math.PI / 2;
      const c = makeCar(p.x + rr(-30, 30), p.y + rr(-30, 30), a + (rng() < 0.5 ? 0 : Math.PI), null, 'parked');
      out.push(c);
    }
    return out;
  }
  // Arcade driving: throttle/brake/steer, grip, drag, NOS boost.
  function drive(car, input, dt, nos) {
    const fwd = input.up ? 1 : input.down ? -0.6 : 0;
    const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    const maxSpd = CFG.CAR_MAX * (nos ? 1.55 : 1);
    if (fwd > 0) car.speed += CFG.CAR_ACCEL * dt * (nos ? 1.6 : 1);
    else if (fwd < 0) car.speed -= (car.speed > 0 ? CFG.CAR_BRAKE : CFG.CAR_ACCEL * 0.6) * dt;
    else car.speed -= Math.sign(car.speed) * CFG.CAR_DRAG * 240 * dt;
    if (Math.abs(car.speed) < 4 && fwd === 0) car.speed = 0;
    car.speed = clamp(car.speed, -CFG.CAR_REVERSE, maxSpd);
    const spdF = clamp(Math.abs(car.speed) / CFG.CAR_MAX, 0, 1);
    car.angle += steer * CFG.CAR_TURN * dt * (0.4 + 0.6 * spdF) * Math.sign(car.speed || 1);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!City.blockedAt(nx, ny, 14)) { car.x = nx; car.y = ny; }
    else { car.speed *= 0.4; car.damage += Math.abs(car.speed) * 0.02; }
    car.x = clamp(car.x, 30, WORLD_W - 30);
    car.y = clamp(car.y, 30, WORLD_H - 30);
    if (car.damage > 60) car.smoking = true;
    if (car.damage > 120) car.speed *= 0.92;
  }
  // Traffic: follow road waypoints, slow for the car ahead.
  function updateTraffic(cars, dt) {
    for (const c of cars) {
      if (!c.target || dist2(c.x, c.y, c.target.x, c.target.y) < 60) c.target = City.randomRoadPoint();
      const want = Math.atan2(c.target.y - c.y, c.target.x - c.x);
      c.angle += clamp(angDiff(c.angle, want), -1.6 * dt, 1.6 * dt);
      let slow = false;
      for (const o of cars) {
        if (o === c) continue;
        const dx = o.x - c.x, dy = o.y - c.y;
        const ahead = dx * Math.cos(c.angle) + dy * Math.sin(c.angle);
        if (ahead > 0 && ahead < 70 && Math.abs(-dx * Math.sin(c.angle) + dy * Math.cos(c.angle)) < 26) { slow = true; break; }
      }
      c.speed = lerp(c.speed, slow ? 0 : 150, dt * 1.5);
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      if (City.blockedAt(c.x, c.y, 12)) { c.x -= Math.cos(c.angle) * c.speed * dt; c.y -= Math.sin(c.angle) * c.speed * dt; c.target = City.randomRoadPoint(); }
    }
  }
  // Police: chase the player, ram, and bust on contact at low player speed.
  function updatePolice(cars, px, py, pSpeed, dt, wanted) {
    for (const c of cars) {
      const want = Math.atan2(py - c.y, px - c.x);
      c.angle += clamp(angDiff(c.angle, want), -2.4 * dt, 2.4 * dt);
      const d = Math.sqrt(dist2(c.x, c.y, px, py));
      const target = clamp(320 + wanted * 30, 0, 520);
      c.speed = lerp(c.speed, d > 90 ? target : target * 0.55, dt * 1.2);
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      c.siren += dt * 6;
      if (City.blockedAt(c.x, c.y, 12)) { c.x -= Math.cos(c.angle) * c.speed * dt * 2; c.y -= Math.sin(c.angle) * c.speed * dt * 2; }
    }
  }
  // Helicopter: hovers above the player, spotlight cone, shootable.
  function makeHeli(x, y) {
    const h = makeCar(x, y, 0, '#222', 'heli');
    h.heli = true; h.hp = 100; h.hover = 0;
    return h;
  }
  function updateHeli(h, px, py, dt) {
    h.hover += dt;
    const want = Math.atan2(py - h.y, px - h.x);
    h.angle += clamp(angDiff(h.angle, want), -1.2 * dt, 1.2 * dt);
    const d = Math.sqrt(dist2(h.x, h.y, px, py));
    const tx = px + Math.cos(h.hover * 0.7) * 60, ty = py + Math.sin(h.hover * 0.9) * 60 - 40;
    h.x = lerp(h.x, tx, dt * 0.8);
    h.y = lerp(h.y, ty, dt * 0.8);
    h.spotlight = (Math.sin(h.hover * 2.2) + 1) / 2;
    return d;
  }
  // Distance from a point to a car's body (for hit tests / bust checks).
  function hitCar(car, x, y, pad) {
    const dx = x - car.x, dy = y - car.y;
    const ca = Math.cos(-car.angle), sa = Math.sin(-car.angle);
    const lx = dx * ca - dy * sa, ly = dx * sa + dy * ca;
    return Math.abs(lx) < car.w / 2 + (pad || 0) && Math.abs(ly) < car.h / 2 + (pad || 0);
  }
  return { makeCar, spawnTraffic, spawnParked, drive, updateTraffic, updatePolice, makeHeli, updateHeli, hitCar };
})();
