// Save / load via localStorage. Autosaves every 20 s and on mission completion.
'use strict';
const SaveSys = (function () {
  const KEY = 'lumen-bay-save-v3';
  function save(game) {
    try {
      const p = game.player;
      const data = {
        cash: p.cash, health: p.health, weapons: p.weapons, weapon: p.weapon, ammo: p.ammo,
        missionIndex: game.missions.index, missionsDone: game.missions.done,
        clockMin: game.clockMin, x: p.x, y: p.y,
      };
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function apply(game, data) {
    if (!data) return false;
    const p = game.player;
    p.cash = data.cash; p.health = data.health;
    p.weapons = data.weapons || [0];
    p.weapon = data.weapon || 0;
    p.ammo = data.ammo || [CFG.START_AMMO_PISTOL, 0, 0, 0];
    p.x = data.x; p.y = data.y;
    game.clockMin = data.clockMin || CFG.CLOCK_START_MIN;
    game.missions.index = data.missionIndex || 0;
    game.missions.done = data.missionsDone || [];
    return true;
  }
  function clear() { try { localStorage.removeItem(KEY); } catch (e) {} }
  // True when a save exists (title screen can offer "continue").
  function exists() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  return { save, load, apply, clear, exists, KEY };
})();
