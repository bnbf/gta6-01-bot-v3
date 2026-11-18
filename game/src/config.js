// LUMEN BAY — Neon Heat: shared constants. Original 2D top-down open-world crime game.
'use strict';
const CFG = {
  // World: 7 x 6 blocks, roads between them, beach + sea to the south.
  BLOCK: 260, ROAD: 90, COLS: 7, ROWS: 6,
  BEACH: 170, SEA: 260,
  SEED: 20261118,
  // Player / physics
  WALK_SPEED: 175, RUN_SPEED: 285,
  CAR_ACCEL: 420, CAR_BRAKE: 900, CAR_MAX: 560, CAR_REVERSE: 200,
  CAR_TURN: 2.6, CAR_GRIP: 3.2, CAR_DRAG: 0.55,
  // Clock: golden dusk 18:40 -> neon night 20:00. darkness 0..1.
  CLOCK_START_MIN: 18 * 60 + 40, CLOCK_END_MIN: 20 * 60,
  // Wanted
  WANTED_MAX: 5,
  WANTED_DECAY_UNSEEN: 6, // seconds at 0 stars before decay tick
  // Economy
  START_CASH: 250, START_HEALTH: 100, START_AMMO_PISTOL: 60,
  TAXI_FARE: 45, HELI_BONUS: 500,
  // Weapons: name, damage, rate (shots/sec), spread (rad), range, auto, price, ammo price
  WEAPONS: [
    { name: 'Pistol', dmg: 26, rate: 4, spread: 0.05, range: 460, auto: false, price: 0, ammo: 24, ammoPrice: 20 },
    { name: 'SMG', dmg: 16, rate: 11, spread: 0.14, range: 400, auto: true, price: 300, ammo: 90, ammoPrice: 45 },
    { name: 'Shotgun', dmg: 15, rate: 1.4, spread: 0.34, range: 300, auto: false, price: 450, ammo: 18, ammoPrice: 35, pellets: 6 },
    { name: 'Rifle', dmg: 55, rate: 2.6, spread: 0.02, range: 700, auto: false, price: 800, ammo: 30, ammoPrice: 60 },
  ],
  SHOPS: [
    { type: 'gun', name: 'LUMEN ARMS', color: '#ff2e63' },
    { type: 'diner', name: 'NEON DINER', color: '#08d9d6' },
    { type: 'garage', name: 'MARINA GARAGE', color: '#f9ed69' },
  ],
  // Missions: id, name, brief, reward
  MISSIONS: [
    { id: 1, name: 'First Wheels', brief: 'Steal a car and deliver it to Marina Garage.', reward: 200 },
    { id: 2, name: 'Neon Courier', brief: 'Pick up the package at the pier and deliver it downtown before the timer runs out.', reward: 300 },
    { id: 3, name: 'Protection Money', brief: 'Collect from 3 shops. Some owners need persuading.', reward: 350 },
    { id: 4, name: 'Heat Wave', brief: 'Lose a 3-star wanted level, then reach the safehouse.', reward: 400 },
    { id: 5, name: 'The Big Score', brief: 'Rob the Lumen Bank vault, grab the cash, and escape the 5-star heat.', reward: 1200 },
    { id: 6, name: 'Midnight Race', brief: 'Beat the street race: 5 checkpoints, fastest time wins.', reward: 600 },
    { id: 7, name: 'King of the Bay', brief: 'Take the crown: steal the gold car from the docks and bring it to the safehouse.', reward: 1500 },
  ],
  RACE_CHECKPOINTS: 5, RACE_TIME_LIMIT: 150,
  // Colours
  PALETTE: {
    duskSky: '#2b1a4a', duskHorizon: '#ff7e3d', nightSky: '#070312',
    road: '#23232e', roadLine: '#c9c9a3', sidewalk: '#3a3a48',
    grass: '#1d4a2a', sand: '#c2a878', sea: '#0a2e4a', seaDeep: '#062036',
    buildingRoof: '#2e2e3d', buildingEdge: '#45455c',
  },
};
// Neon sign colours used across the city.
const NEON_COLORS = ['#ff2e63', '#08d9d6', '#f9ed69', '#ff9f1c', '#b537f2', '#00ff9c'];
const WORLD_W = CFG.COLS * CFG.BLOCK + (CFG.COLS + 1) * CFG.ROAD;
const WORLD_H = CFG.ROWS * CFG.BLOCK + (CFG.ROWS + 1) * CFG.ROAD + CFG.BEACH + CFG.SEA;
