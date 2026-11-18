// Story missions (7), taxi fares, and the street race. A mission is a small state
// machine: {id, name, brief, reward, stage, target, timer}. Game drives it.
'use strict';
const Missions = (function () {
  function makeState() {
    return { index: 0, stage: 0, timer: 0, target: null, collected: 0, checkpoints: [], raceTime: 0, done: [], active: null };
  }
  function current(st) { return CFG.MISSIONS[st.index] || null; }
  function start(st, game) {
    const m = current(st);
    if (!m) return;
    st.stage = 0; st.collected = 0; st.timer = 0; st.checkpoints = [];
    const L = City.landmarks;
    if (m.id === 1) { st.target = { x: L.garage.x, y: L.garage.y, label: 'Deliver the car to Marina Garage' }; }
    if (m.id === 2) { st.target = { x: L.pier.x, y: L.pier.y, label: 'Pick up the package at Lumen Pier' }; st.timer = 120; }
    if (m.id === 3) { st.target = { x: L.gunshop.x, y: L.gunshop.y, label: 'Collect from Lumen Arms (1/3)' }; }
    if (m.id === 4) { st.target = { x: L.safehouse.x, y: L.safehouse.y, label: 'Reach the Safehouse once the heat is gone' }; }
    if (m.id === 5) { st.target = { x: L.bank.x, y: L.bank.y, label: 'Rob the Lumen Bank vault' }; }
    if (m.id === 6) {
      st.checkpoints = [];
      for (let i = 0; i < CFG.RACE_CHECKPOINTS; i++) {
        const p = City.randomRoadPoint();
        st.checkpoints.push({ x: p.x, y: p.y, hit: false });
      }
      st.target = { x: st.checkpoints[0].x, y: st.checkpoints[0].y, label: 'Race checkpoint 1/' + CFG.RACE_CHECKPOINTS };
      st.timer = CFG.RACE_TIME_LIMIT; st.raceTime = 0;
    }
    if (m.id === 7) { st.target = { x: L.docks.x, y: L.docks.y, label: 'Steal the gold car at the Docks' }; }
    st.active = m;
  }
  function atTarget(st, x, y, r) {
    return st.target && dist2(x, y, st.target.x, st.target.y) < r * r;
  }
  // Returns an event string when something notable happens, else null.
  function update(st, game, dt) {
    const m = current(st);
    if (!m) return null;
    const p = game.player, L = City.landmarks;
    if (m.id === 2 || m.id === 6) {
      st.timer -= dt;
      if (m.id === 6) st.raceTime += dt;
      if (st.timer <= 0) return 'fail';
    }
    if (m.id === 1) {
      if (st.stage === 0 && p.inCar) { st.stage = 1; return 'stage'; }
      if (st.stage === 1 && atTarget(st, p.x, p.y, 90)) return 'complete';
    }
    if (m.id === 2) {
      if (st.stage === 0 && atTarget(st, p.x, p.y, 70)) {
        st.stage = 1;
        st.target = { x: L.plaza.x, y: L.plaza.y, label: 'Deliver the package to Lumen Plaza' };
        return 'stage';
      }
      if (st.stage === 1 && atTarget(st, p.x, p.y, 70)) return 'complete';
    }
    if (m.id === 3) {
      const shops = [L.gunshop, L.diner, L.garage];
      if (st.collected < 3 && atTarget(st, p.x, p.y, 80)) {
        st.collected++;
        if (st.collected >= 3) return 'complete';
        const s = shops[st.collected];
        st.target = { x: s.x, y: s.y, label: 'Collect from ' + s.name + ' (' + (st.collected + 1) + '/3)' };
        return 'stage';
      }
    }
    if (m.id === 4) {
      if (game.wanted === 0 && atTarget(st, p.x, p.y, 90)) return 'complete';
    }
    if (m.id === 5) {
      if (st.stage === 0 && atTarget(st, p.x, p.y, 80)) {
        st.stage = 1; game.vaultCash = true;
        st.target = { x: L.safehouse.x, y: L.safehouse.y, label: 'Escape to the Safehouse with the cash' };
        return 'stage';
      }
      if (st.stage === 1 && dist2(p.x, p.y, L.safehouse.x, L.safehouse.y) < 90 * 90) return 'complete';
    }
    if (m.id === 6) {
      const cp = st.checkpoints.find(c => !c.hit);
      if (cp && dist2(p.x, p.y, cp.x, cp.y) < 80 * 80) {
        cp.hit = true;
        const next = st.checkpoints.find(c => !c.hit);
        if (!next) return 'complete';
        const i = st.checkpoints.indexOf(next) + 1;
        st.target = { x: next.x, y: next.y, label: 'Race checkpoint ' + i + '/' + CFG.RACE_CHECKPOINTS };
        return 'stage';
      }
    }
    if (m.id === 7) {
      if (st.stage === 0 && p.inCar && p.inCar.gold) { st.stage = 1; st.target = { x: L.safehouse.x, y: L.safehouse.y, label: 'Bring the gold car to the Safehouse' }; return 'stage'; }
      if (st.stage === 1 && atTarget(st, p.x, p.y, 90)) return 'complete';
    }
    return null;
  }
  function complete(st, game) {
    const m = current(st);
    if (!m) return 0;
    game.player.cash += m.reward;
    st.done.push(m.id);
    st.index++;
    st.active = null;
    if (current(st)) start(st, game);
    return m.reward;
  }
  function fail(st, game) {
    const m = current(st);
    if (!m) return;
    start(st, game); // retry the same mission
  }
  // Taxi side job: pick a destination road point for a fare.
  function taxiDestination() { return City.randomRoadPoint(); }
  return { makeState, current, start, update, complete, fail, atTarget, taxiDestination };
})();
