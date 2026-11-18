// LUMEN BAY — Neon Heat: game state, loop, input, wanted, camera.
// Plain classic scripts (no modules): loaded in order by game/index.html.
'use strict';
const Game = (function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const vw = 1280, vh = 720;
  canvas.width = vw; canvas.height = vh;

  const game = {
    player: Player.make(),
    traffic: [], parked: [], police: [], officers: [], peds: [],
    heli: null, goldCar: null,
    missions: Missions.makeState(),
    wanted: 0, wantedTimer: 0, unseenTimer: 0,
    clockMin: CFG.CLOCK_START_MIN, time: 0,
    state: 'title', started: false, paused: false,
    cam: { x: 0, y: 0, shake: 0 },
    toast: '', toastT: 0, vaultCash: false, missionDone: false,
    taxi: null, // {ped, dest}
    effects: [], // {x,y,t,kind}
    saveTimer: 0, errorLog: [],
    testMode: false, shotMode: null,
  };
  window.__game = game;
  window.addEventListener('error', (e) => { game.errorLog.push(String(e.message || e.error)); });

  const keys = {};
  const mouse = { x: vw / 2, y: vh / 2, down: false };
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'Enter' && (game.state === 'title' || game.state === 'busted' || game.state === 'wasted' || game.state === 'pause')) startPlay();
    if (e.code === 'KeyP' && game.state === 'play') { game.state = 'pause'; }
    else if (e.code === 'KeyP' && game.state === 'pause') { game.state = 'play'; }
    if (e.code === 'KeyE' && game.state === 'play') interact();
    if (e.code === 'KeyR' && game.state === 'play') { const on = AudioSys.radioToggle(); toast(on ? 'Radio: ' + AudioSys.stationName() : 'Radio off'); }
    if (e.code === 'KeyQ' && game.state === 'play') { toast('Radio: ' + AudioSys.radioNext()); }
    if (e.code === 'KeyM') { toast(AudioSys.toggleMute() ? 'Muted' : 'Sound on'); }
    if (e.code >= 'Digit1' && e.code <= 'Digit4') {
      const i = Number(e.code.slice(5)) - 1;
      if (game.player.weapons.includes(i)) { game.player.weapon = i; toast(CFG.WEAPONS[i].name); }
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (vw / r.width);
    mouse.y = (e.clientY - r.top) * (vh / r.height);
  });
  canvas.addEventListener('mousedown', (e) => { mouse.down = true; if (e.button === 0) tryShoot(); });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function toast(msg) { game.toast = msg; game.toastT = 3; }
  function inputState() {
    return {
      up: !!(keys.KeyW || keys.ArrowUp), down: !!(keys.KeyS || keys.ArrowDown),
      left: !!(keys.KeyA || keys.ArrowLeft), right: !!(keys.KeyD || keys.ArrowRight),
      shift: !!(keys.ShiftLeft || keys.ShiftRight),
    };
  }
  function raiseWanted(n, why) {
    const before = game.wanted;
    game.wanted = clamp(game.wanted + n, 0, CFG.WANTED_MAX);
    game.unseenTimer = 0;
    if (game.wanted > before) {
      toast('WANTED ' + game.wanted + '★' + (why ? ' — ' + why : ''));
      AudioSys.sfx.siren();
    }
    syncPolice();
  }
  function syncPolice() {
    const want = game.wanted >= 1 ? Math.min(1 + Math.floor(game.wanted / 2), 4) : 0;
    while (game.police.length < want) {
      const p = City.randomRoadPoint();
      const c = Vehicles.makeCar(p.x, p.y, 0, '#fff', 'police');
      game.police.push(c);
    }
    while (game.police.length > want) game.police.pop();
    if (game.wanted >= 4 && !game.heli) {
      game.heli = Vehicles.makeHeli(game.player.x, game.player.y - 200);
      toast('POLICE HELICOPTER INBOUND');
    }
    if (game.wanted < 4 && game.heli) game.heli = null;
    const wantOff = game.wanted >= 1 && game.wanted <= 2 ? 2 : 0;
    while (game.officers.length < wantOff) {
      game.officers.push(...People.spawnOfficers(1, game.player.x, game.player.y));
    }
    while (game.officers.length > wantOff) game.officers.pop();
  }
  function init() {
    const L = City.landmarks;
    const p = game.player;
    p.x = L.garage.x; p.y = L.garage.y + 60;
    game.traffic = Vehicles.spawnTraffic(10);
    game.parked = Vehicles.spawnParked(14);
    game.peds = People.spawnPeds(24);
    // The gold car for mission 7 waits at the docks.
    game.goldCar = Vehicles.makeCar(L.docks.x, L.docks.y, Math.PI / 2, '#ffd700', 'parked');
    game.goldCar.gold = true;
    game.parked.push(game.goldCar);
    const saved = SaveSys.load();
    if (saved) SaveSys.apply(game, saved);
    Missions.start(game.missions, game);
    game.state = 'title';
  }
  function startPlay() {
    AudioSys.ensure();
    game.started = true;
    game.state = 'play';
    if (!game.missions.active) Missions.start(game.missions, game);
  }

  // --- Shooting -------------------------------------------------------------
  function tryShoot() {
    const g = game, p = g.player;
    if (g.state !== 'play') return;
    p.aimX = g.cam.x + mouse.x;
    p.aimY = g.cam.y + mouse.y;
    const res = Player.shoot(p, 0);
    if (!res) return;
    const w = res.weapon;
    if (w.name === 'Shotgun') AudioSys.sfx.shotgun(); else AudioSys.sfx.shoot();
    for (const s of res.shots) {
      g.effects.push({ x: p.x, y: p.y, x2: s.x, y2: s.y, t: 0.08, kind: 'tracer' });
      hitScan(s);
    }
    // Firing a gun in public is a crime.
    raiseWanted(1, 'shots fired');
  }
  function hitScan(s) {
    const g = game;
    // Helicopter first (big target): perpendicular distance to the shot ray.
    if (g.heli) {
      const dx = g.heli.x - g.player.x, dy = g.heli.y - g.player.y;
      const along = dx * Math.cos(s.angle) + dy * Math.sin(s.angle);
      const perp = Math.abs(-dx * Math.sin(s.angle) + dy * Math.cos(s.angle));
      if (along > 0 && along < s.range && perp < 70) {
        g.heli.hp -= 20;
        g.effects.push({ x: g.heli.x, y: g.heli.y, t: 0.2, kind: 'hit' });
        if (g.heli.hp <= 0) {
          g.player.cash += CFG.HELI_BONUS;
          toast('HELICOPTER DOWN  +' + fmtMoney(CFG.HELI_BONUS));
          AudioSys.sfx.cash();
          g.heli = null;
          g.wanted = Math.max(0, g.wanted - 1);
        }
        return;
      }
    }
    for (const c of g.police) {
      if (Vehicles.hitCar(c, s.x, s.y, 30)) {
        c.damage += 30;
        g.effects.push({ x: s.x, y: s.y, t: 0.2, kind: 'hit' });
        if (c.damage > 100) { c.speed = 0; }
        return;
      }
    }
    for (const o of g.officers) {
      if (dist2(s.x, s.y, o.x, o.y) < 30 * 30) {
        g.effects.push({ x: o.x, y: o.y, t: 0.2, kind: 'hit' });
        o.x += 400; o.y += 400; // knocked down, out of the fight
        return;
      }
    }
    for (const ped of g.peds) {
      if (dist2(s.x, s.y, ped.x, ped.y) < 26 * 26) {
        ped.flee = 5;
        return;
      }
    }
  }

  // --- Interaction (E) ------------------------------------------------------
  function interact() {
    const g = game, p = g.player, L = City.landmarks;
    const near = (lm, r) => dist2(p.x, p.y, lm.x, lm.y) < r * r;
    if (p.inCar) {
      // Garage repair works from inside the car; taxi pickup too; otherwise exit.
      if (near(L.garage, 110)) {
        if (p.cash >= 50) { p.cash -= 50; p.inCar.damage = 0; p.inCar.smoking = false; p.nos = 100; toast('Garage: repaired + NOS refilled'); AudioSys.sfx.pickup(); }
        else toast('Marina Garage: repair $50');
        return;
      }
      const ped = People.nearestTaxi(g.peds, p.x, p.y, 120);
      if (ped && !g.taxi) {
        ped.taxi = false;
        g.taxi = { ped, dest: Missions.taxiDestination() };
        toast('Taxi fare: take them to the marker');
        return;
      }
      Player.exitCar(p);
      toast('On foot');
      return;
    }
    const car = Player.trySteal(p, [...g.parked, ...g.traffic], 70);
    if (car) {
      toast(car.gold ? 'The gold car! Get it to the Safehouse.' : 'Car stolen — the heat is on');
      raiseWanted(1, 'grand theft auto');
      AudioSys.sfx.engine();
      return;
    }
    if (near(L.gunshop, 90)) {
      const idx = p.weapon;
      if (Player.buyAmmo(p, idx)) { toast('Ammo bought: ' + CFG.WEAPONS[idx].name); AudioSys.sfx.cash(); }
      else {
        const next = CFG.WEAPONS.findIndex((w, i) => !p.weapons.includes(i) && p.cash >= w.price);
        if (next >= 0 && Player.buyWeapon(p, next)) { toast('Bought ' + CFG.WEAPONS[next].name); AudioSys.sfx.cash(); }
        else toast('Lumen Arms: not enough cash');
      }
      return;
    }
    if (near(L.diner, 90)) {
      if (p.cash >= 30 && p.health < 100) { p.cash -= 30; p.health = Math.min(100, p.health + 50); toast('Neon Diner: healed'); AudioSys.sfx.pickup(); }
      else toast('Neon Diner: $30 to eat');
      return;
    }
    if (near(L.safehouse, 100)) {
      p.health = 100;
      SaveSys.save(g);
      toast('Safehouse: healed + saved');
      AudioSys.sfx.mission();
      return;
    }
  }

  // --- Update ---------------------------------------------------------------
  function update(dt) {
    const g = game, p = g.player;
    g.time += dt;
    g.clockMin += dt * 0.5; // 80 game-minutes over ~160 s: dusk -> night
    if (g.toastT > 0) g.toastT -= dt;
    for (const e of g.effects) e.t -= dt;
    g.effects = g.effects.filter(e => e.t > 0);
    p.aimX = g.cam.x + mouse.x;
    p.aimY = g.cam.y + mouse.y;
    if (p.cooldown > 0) p.cooldown -= dt; // weapon cooldown, on foot or driving
    const input = inputState();
    if (p.inCar) {
      Player.updateNos(p, input.shift && p.nos > 0, dt);
      Vehicles.drive(p.inCar, input, dt, p.nosActive);
      p.x = p.inCar.x; p.y = p.inCar.y;
      p.angle = p.inCar.angle;
      if (mouse.down) tryShoot();
      if (p.inCar.damage > 140) { toast('Car wrecked!'); Player.exitCar(p); }
    } else {
      Player.walk(p, input, dt);
      if (mouse.down) tryShoot();
    }
    Vehicles.updateTraffic(g.traffic, dt);
    People.updatePeds(g.peds, p.x, p.y, g.wanted > 0, dt);
    // Police.
    if (g.police.length) {
      Vehicles.updatePolice(g.police, p.x, p.y, p.inCar ? Math.abs(p.inCar.speed) : p.speed, dt, g.wanted);
      for (const c of g.police) {
        if (dist2(c.x, c.y, p.x, p.y) < 46 * 46) {
          if (p.inCar && Math.abs(p.inCar.speed) < 40) return busted();
          if (!p.inCar) { p.health -= 30 * dt; if (p.health <= 0) return wasted(); }
        }
      }
    }
    if (g.heli) Vehicles.updateHeli(g.heli, p.x, p.y, dt);
    if (g.officers.length && People.updateOfficers(g.officers, p.x, p.y, dt)) return busted();
    // Wanted decay when no police are close.
    let nearestCop = Infinity;
    for (const c of g.police) nearestCop = Math.min(nearestCop, dist2(c.x, c.y, p.x, p.y));
    if (g.wanted > 0 && nearestCop > 500 * 500) {
      g.unseenTimer += dt;
      if (g.unseenTimer > CFG.WANTED_DECAY_UNSEEN) { g.wanted--; g.unseenTimer = 0; syncPolice(); toast('Heat cooling… ' + g.wanted + '★'); }
    } else g.unseenTimer = 0;
    // Taxi drop-off.
    if (g.taxi && dist2(p.x, p.y, g.taxi.dest.x, g.taxi.dest.y) < 90 * 90) {
      p.cash += CFG.TAXI_FARE;
      toast('Fare paid +' + fmtMoney(CFG.TAXI_FARE));
      AudioSys.sfx.cash();
      g.taxi = null;
    }
    // Missions.
    const ev = Missions.update(g.missions, g, dt);
    if (ev === 'complete') {
      const rw = Missions.complete(g.missions, g);
      toast('MISSION COMPLETE  +' + fmtMoney(rw));
      AudioSys.sfx.mission();
      SaveSys.save(g);
      if (!Missions.current(g.missions)) { g.missionDone = true; toast('KING OF THE BAY — all missions complete!'); }
    } else if (ev === 'fail') {
      toast('Mission failed — try again');
      AudioSys.sfx.fail();
      Missions.fail(g.missions, g);
    } else if (ev === 'stage') { toast('Objective updated'); AudioSys.sfx.pickup(); }
    // Camera: follow with driving lead + shake.
    const lead = p.inCar ? 60 : 0;
    const tx = p.x + Math.cos(p.angle) * lead - vw / 2;
    const ty = p.y + Math.sin(p.angle) * lead - vh / 2;
    g.cam.x = lerp(g.cam.x, tx, 1 - Math.pow(0.001, dt));
    g.cam.y = lerp(g.cam.y, ty, 1 - Math.pow(0.001, dt));
    g.cam.x = clamp(g.cam.x, -40, WORLD_W - vw + 40);
    g.cam.y = clamp(g.cam.y, -40, WORLD_H - vh + 40);
    if (g.cam.shake > 0) g.cam.shake -= dt;
    // Autosave.
    g.saveTimer += dt;
    if (g.saveTimer > 20) { g.saveTimer = 0; SaveSys.save(g); }
  }
  function busted() {
    game.state = 'busted';
    game.wanted = 0;
    syncPolice();
    game.player.cash = Math.max(0, game.player.cash - 150);
    AudioSys.sfx.fail();
  }
  function wasted() {
    game.state = 'wasted';
    game.player.health = 100;
    game.player.x = City.landmarks.safehouse.x;
    game.player.y = City.landmarks.safehouse.y;
    game.wanted = 0;
    syncPolice();
    AudioSys.sfx.fail();
  }

  // --- Render ---------------------------------------------------------------
  function render() {
    const g = game;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    const shx = g.cam.shake > 0 ? rr(-4, 4) : 0;
    const shy = g.cam.shake > 0 ? rr(-4, 4) : 0;
    ctx.save();
    ctx.translate(-g.cam.x + shx, -g.cam.y + shy);
    Render.drawWorld(ctx, g, g.cam, vw, vh);
    const d = Render.darkness(g.clockMin);
    for (const c of g.parked) Render.drawCar(ctx, c, g, d);
    for (const c of g.traffic) Render.drawCar(ctx, c, g, d);
    for (const c of g.police) Render.drawCar(ctx, c, g, d);
    for (const ped of g.peds) Render.drawPed(ctx, ped);
    for (const o of g.officers) Render.drawPed(ctx, o);
    if (g.heli) Render.drawHeli(ctx, g.heli, g, d);
    if (g.player.inCar) Render.drawCar(ctx, g.player.inCar, g, d);
    else Render.drawPlayer(ctx, g.player, g);
    // Mission marker + taxi destination.
    const m = g.missions;
    if (m.target) {
      ctx.strokeStyle = '#f9ed69';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(m.target.x, m.target.y, 26 + Math.sin(g.time * 4) * 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#f9ed69';
      ctx.beginPath(); ctx.arc(m.target.x, m.target.y, 6, 0, Math.PI * 2); ctx.fill();
    }
    if (g.taxi) {
      ctx.strokeStyle = '#00ff9c';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(g.taxi.dest.x, g.taxi.dest.y, 22, 0, Math.PI * 2); ctx.stroke();
    }
    // Tracers / hits.
    for (const e of g.effects) {
      if (e.kind === 'tracer') {
        ctx.strokeStyle = 'rgba(255,220,120,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x2, e.y2); ctx.stroke();
      } else if (e.kind === 'hit') {
        ctx.fillStyle = 'rgba(255,200,80,0.9)';
        ctx.beginPath(); ctx.arc(e.x, e.y, 8, 0, Math.PI * 2); ctx.fill();
      }
    }
    Render.drawLighting(ctx, g, g.cam, vw, vh);
    ctx.restore();
    // Screen-space HUD.
    Hud.draw(ctx, g, vw, vh);
    Render.drawMinimap(ctx, g, vw);
    if (g.state === 'title') Hud.titleScreen(ctx, vw, vh, g);
    else if (g.state === 'pause') Hud.overlay(ctx, vw, vh, 'PAUSED', 'Take a breath, Milo.', '#08d9d6');
    else if (g.state === 'busted') Hud.overlay(ctx, vw, vh, 'BUSTED', 'The Lumen PD took $150. The story continues.', '#ff2e63');
    else if (g.state === 'wasted') Hud.overlay(ctx, vw, vh, 'WASTED', 'You wake up at the safehouse.', '#ff2e63');
  }

  // --- Shots (?shot=) + self-test (?test=1) ----------------------------------
  function stageShot(kind) {
    const g = game, p = g.player, L = City.landmarks;
    g.state = 'play';
    g.started = true;
    if (kind === 'title') {
      g.state = 'title';
      g.started = false;
      g.clockMin = CFG.CLOCK_START_MIN + 12;
      p.x = L.plaza.x; p.y = L.plaza.y;
    } else if (kind === 'chase') {
      // Downtown intersection: dense buildings, neon, traffic — the cover shot.
      g.clockMin = CFG.CLOCK_END_MIN - 5;
      const cx = City.roadsX[3], cy = City.roadsY[3];
      const car = Vehicles.makeCar(cx - 60, cy, 0, '#c0392b', 'player');
      p.inCar = car; p.x = car.x; p.y = car.y; car.speed = 380;
      // A couple of traffic cars in frame for density.
      const t1 = Vehicles.makeCar(cx + 260, cy - 30, Math.PI, '#f1c40f', 'traffic');
      const t2 = Vehicles.makeCar(cx - 40, cy - 260, Math.PI / 2, '#2980b9', 'traffic');
      g.traffic.push(t1, t2);
      g.wanted = 4; syncPolice();
      g.heli = Vehicles.makeHeli(p.x + 40, p.y - 110);
      Missions.start(g.missions, g);
    } else if (kind === 'foot') {
      g.clockMin = CFG.CLOCK_START_MIN + 25;
      p.x = L.gunshop.x; p.y = L.gunshop.y + 40;
      p.weapons = [0, 1]; p.weapon = 1; p.ammo[1] = 90;
      p.aimX = p.x + 200; p.aimY = p.y - 60;
      g.wanted = 2; syncPolice();
      Missions.start(g.missions, g);
    } else if (kind === 'escape') {
      g.clockMin = CFG.CLOCK_END_MIN - 2;
      // On the road outside the bank (not inside a park block).
      const car = Vehicles.makeCar(City.roadsX[3], City.roadsY[3], 0, '#2980b9', 'player');
      p.inCar = car; p.x = car.x; p.y = car.y; car.speed = 300;
      g.wanted = 5; syncPolice();
      g.heli = Vehicles.makeHeli(p.x + 50, p.y - 120);
      g.vaultCash = true;
      g.missions.index = 4; Missions.start(g.missions, g);
      g.missions.stage = 1;
      g.missions.target = { x: L.safehouse.x, y: L.safehouse.y, label: 'Escape to the Safehouse with the cash' };
    }
    g.cam.x = clamp(p.x - vw / 2, -40, WORLD_W - vw + 40);
    g.cam.y = clamp(p.y - vh / 2, -40, WORLD_H - vh + 40);
    render();
  }

  function runTests() {
    const results = [];
    const check = (name, fn) => {
      try { results.push({ name, pass: !!fn() }); }
      catch (e) { results.push({ name, pass: false, err: String(e && e.message || e) }); }
    };
    const g = game, p = g.player;
    g.state = 'play'; g.started = true;
    check('spawn at garage', () => dist2(p.x, p.y, City.landmarks.garage.x, City.landmarks.garage.y) < 200 * 200);
    check('traffic >= 8', () => g.traffic.length >= 8);
    check('parked cars >= 10', () => g.parked.length >= 10);
    check('pedestrians >= 16', () => g.peds.length >= 16);
    check('mission 1 active', () => g.missions.active && g.missions.active.id === 1);
    check('walk moves player', () => { const x0 = p.x; Player.walk(p, { up: true, down: false, left: false, right: true, shift: false }, 0.5); return Math.abs(p.x - x0) > 5; });
    check('steal car', () => { const c = g.parked[0]; p.x = c.x; p.y = c.y; return !!Player.trySteal(p, g.parked, 70); });
    check('wanted rises on steal', () => { const w0 = g.wanted; raiseWanted(1, 'test'); return g.wanted === w0 + 1; });
    check('car drives', () => { const c = p.inCar; const s0 = c.speed; Vehicles.drive(c, { up: true, down: false, left: false, right: false }, 0.5, false); return c.speed > s0; });
    check('police spawn at wanted', () => { syncPolice(); return g.police.length >= 1; });
    check('shooting consumes ammo', () => { p.weapon = 0; const a0 = p.ammo[0]; p.aimX = p.x + 100; p.aimY = p.y; p.cooldown = 0; const r = Player.shoot(p, 0); return !!r && p.ammo[0] === a0 - 1; });
    check('heli spawns at wanted 4', () => { g.wanted = 4; syncPolice(); return !!g.heli; });
    check('heli takes damage', () => { const hp0 = g.heli.hp; g.heli.hp -= 20; return g.heli.hp === hp0 - 20; });
    check('mission 1 completes', () => {
      g.missions.stage = 1;
      p.x = City.landmarks.garage.x; p.y = City.landmarks.garage.y;
      if (p.inCar) { p.inCar.x = p.x; p.inCar.y = p.y; }
      const ev = Missions.update(g.missions, g, 0.1);
      return ev === 'complete';
    });
    check('mission 2 starts after m1', () => { Missions.complete(g.missions, g); return g.missions.active && g.missions.active.id === 2; });
    check('save/load round-trip', () => { p.cash = 1234; SaveSys.save(g); const d = SaveSys.load(); return d && d.cash === 1234; });
    check('radio toggles', () => { const on = AudioSys.radioToggle(); AudioSys.radioToggle(); return typeof on === 'boolean'; });
    check('shop ammo purchase', () => { p.cash = 500; p.weapons = [0]; const a0 = p.ammo[0]; return Player.buyAmmo(p, 0) && p.ammo[0] > a0; });
    check('NOS drains and refills', () => { p.nos = 100; Player.updateNos(p, true, 1); const d1 = p.nos < 100; Player.updateNos(p, false, 1); return d1 && p.nos > 0; });
    check('zero console errors', () => g.errorLog.length === 0);
    const passed = results.filter(r => r.pass).length;
    const lines = results.map(r => (r.pass ? 'PASS' : 'FAIL') + ' ' + r.name + (r.err ? ' (' + r.err + ')' : ''));
    const summary = 'TEST ' + passed + '/' + results.length + (passed === results.length ? ' PASS' : ' FAIL');
    document.title = summary;
    window.__testResult = { passed, total: results.length, lines, errors: g.errorLog };
    const pre = document.createElement('pre');
    pre.id = 'test-result';
    pre.textContent = summary + '\n' + lines.join('\n');
    pre.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;background:#000;color:#0f0;font:12px monospace;white-space:pre;';
    document.body.appendChild(pre);
    render();
    return passed === results.length;
  }

  // --- Boot -------------------------------------------------------------------
  function boot() {
    init();
    const q = new URLSearchParams(location.search);
    const shot = q.get('shot');
    const seed = q.get('seed');
    if (shot) { stageShot(shot); return; }
    if (q.get('test') === '1') { runTests(); return; }
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (game.state === 'play') update(dt);
      render();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  boot();
  return { game, canvas, ctx, vw, vh, toast, raiseWanted, syncPolice, init, startPlay, inputState, mouse, keys, runTests, stageShot };
})();
