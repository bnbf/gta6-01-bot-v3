// LUMEN BAY city: deterministic seeded layout. 7x6 blocks, roads, parks, beach + sea,
// neon signs, landmarks. Collision helpers for cars and pedestrians.
'use strict';
const City = (function () {
  const blocks = [];   // {x,y,w,h,type,buildings:[{x,y,w,h,hgt,color,sign}]}
  const signs = [];    // {x,y,text,color,vertical}
  const landmarks = {}; // named places: garage, diner, gunshop, bank, safehouse, pier, docks, plaza
  const roadsX = [], roadsY = []; // road centre lines

  function roadCenter(i) { return CFG.ROAD + i * (CFG.BLOCK + CFG.ROAD) + CFG.BLOCK / 2; }
  function build() {
    for (let i = 0; i <= CFG.COLS; i++) roadsX.push(CFG.ROAD / 2 + i * (CFG.BLOCK + CFG.ROAD));
    for (let j = 0; j <= CFG.ROWS; j++) roadsY.push(CFG.ROAD / 2 + j * (CFG.BLOCK + CFG.ROAD));
    const cityH = CFG.ROWS * CFG.BLOCK + (CFG.ROWS + 1) * CFG.ROAD;
    const types = ['downtown', 'residential', 'shops', 'park', 'industrial', 'marina'];
    for (let j = 0; j < CFG.ROWS; j++) {
      for (let i = 0; i < CFG.COLS; i++) {
        const x = CFG.ROAD + i * (CFG.BLOCK + CFG.ROAD);
        const y = CFG.ROAD + j * (CFG.BLOCK + CFG.ROAD);
        const type = types[Math.floor(rng() * types.length)];
        const b = { x, y, w: CFG.BLOCK, h: CFG.BLOCK, type, buildings: [] };
        if (type === 'park') {
          b.park = true;
          for (let k = 0; k < 14; k++) b.buildings.push({ palm: true, x: x + rr(20, CFG.BLOCK - 20), y: y + rr(20, CFG.BLOCK - 20) });
        } else {
          const n = ri(2, 4);
          for (let k = 0; k < n; k++) {
            const bw = rr(70, 130), bh = rr(70, 130);
            const bx = x + rr(8, CFG.BLOCK - bw - 8), by = y + rr(8, CFG.BLOCK - bh - 8);
            const col = pick(['#2e2e3d', '#3a2e4a', '#2e3a4a', '#46303a']);
            const bld = { x: bx, y: by, w: bw, h: bh, hgt: rr(14, 60), color: col, sign: null };
            if (rng() < 0.45) {
              bld.sign = { text: pick(['NEON', 'LUMEN', 'BAY', '24H', 'HOTEL', 'BAR', 'CLUB', 'PIZZA', 'TACOS', 'CINEMA']), color: pick(NEON_COLORS) };
              signs.push({ x: bx + bw / 2, y: by - 6, text: bld.sign.text, color: bld.sign.color });
            }
            b.buildings.push(bld);
          }
        }
        blocks.push(b);
      }
    }
    // Landmarks (fixed positions, deterministic).
    landmarks.garage = { x: roadCenter(1), y: roadsY[CFG.ROWS] + 30, name: 'Marina Garage', kind: 'garage' };
    landmarks.diner = { x: roadCenter(3), y: roadsY[2] - 10, name: 'Neon Diner', kind: 'diner' };
    landmarks.gunshop = { x: roadCenter(4), y: roadsY[1] + 10, name: 'Lumen Arms', kind: 'gun' };
    landmarks.bank = { x: roadCenter(3), y: roadsY[3] + 10, name: 'Lumen Bank', kind: 'bank' };
    landmarks.safehouse = { x: roadCenter(0), y: roadsY[0] + 20, name: 'Safehouse', kind: 'safehouse' };
    landmarks.pier = { x: roadCenter(5), y: cityH + CFG.BEACH / 2, name: 'Lumen Pier', kind: 'pier' };
    landmarks.docks = { x: roadCenter(6), y: cityH + CFG.BEACH / 2, name: 'Docks', kind: 'docks' };
    landmarks.plaza = { x: roadCenter(2), y: roadsY[2], name: 'Lumen Plaza', kind: 'plaza' };
    // Big skyline signs along the beach front.
    signs.push({ x: roadCenter(2), y: cityH + 14, text: 'LUMEN BAY', color: '#ff2e63', big: true });
    signs.push({ x: roadCenter(4), y: cityH + 14, text: 'NEON HEAT', color: '#08d9d6', big: true });
  }
  function isRoad(x, y) {
    if (y > CFG.ROWS * CFG.BLOCK + (CFG.ROWS + 1) * CFG.ROAD) return true; // beach strip is open
    for (const rx of roadsX) if (Math.abs(x - rx) < CFG.ROAD / 2) return true;
    for (const ry of roadsY) if (Math.abs(y - ry) < CFG.ROAD / 2) return true;
    return false;
  }
  function blockedAt(x, y, pad) {
    for (const b of blocks) {
      for (const bd of b.buildings) {
        if (bd.palm) continue;
        if (x > bd.x - pad && x < bd.x + bd.w + pad && y > bd.y - pad && y < bd.y + bd.h + pad) return true;
      }
    }
    return false;
  }
  // Nearest point on a road centre line (for traffic waypoints / spawning).
  function nearestRoad(x, y) {
    let best = null, bd = Infinity;
    for (const rx of roadsX) for (const ry of roadsY) {
      const d = dist2(x, y, rx, ry);
      if (d < bd) { bd = d; best = { x: rx, y: ry }; }
    }
    return best;
  }
  function randomRoadPoint() {
    const horiz = rng() < 0.5;
    if (horiz) return { x: rr(60, WORLD_W - 60), y: pick(roadsY) + rr(-18, 18) };
    return { x: pick(roadsX) + rr(-18, 18), y: rr(60, CFG.ROWS * CFG.BLOCK + CFG.ROWS * CFG.ROAD) };
  }
  // A point on the beach avenue (southernmost road) — used for the opening shot.
  function beachRoadPoint() { return { x: WORLD_W * 0.5, y: roadsY[CFG.ROWS] }; }
  build();
  return { blocks, signs, landmarks, roadsX, roadsY, isRoad, blockedAt, nearestRoad, randomRoadPoint, beachRoadPoint, cityH: CFG.ROWS * CFG.BLOCK + (CFG.ROWS + 1) * CFG.ROAD };
})();
