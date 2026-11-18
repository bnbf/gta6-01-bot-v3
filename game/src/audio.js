// WebAudio: synthesized SFX (no audio files) + two procedural synthwave radio stations.
'use strict';
const AudioSys = (function () {
  let ctx = null, master = null, muted = false;
  let radioOn = false, station = 0, radioTimer = null, radioNodes = null;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch (e) { return false; }
  }
  function tone(freq, dur, type, vol, slide) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur);
  }
  function noise(dur, vol, filterFreq) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = filterFreq || 1200;
    const g = ctx.createGain();
    g.gain.value = vol || 0.2;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }
  const sfx = {
    shoot() { noise(0.09, 0.25, 3000); tone(180, 0.08, 'square', 0.12, 60); },
    shotgun() { noise(0.22, 0.35, 1400); tone(120, 0.15, 'sawtooth', 0.14, 40); },
    crash() { noise(0.3, 0.3, 700); },
    pickup() { tone(660, 0.09, 'sine', 0.18); setTimeout(() => tone(990, 0.12, 'sine', 0.18), 90); },
    mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.2), i * 110)); },
    fail() { tone(220, 0.3, 'sawtooth', 0.16, 110); },
    siren() { tone(700, 0.4, 'sine', 0.05, 950); },
    cash() { [880, 1174, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.1, 'sine', 0.14), i * 70)); },
    engine() { tone(70, 0.2, 'sawtooth', 0.04, 110); },
  };
  // Two stations: 0 = "NEON DRIVE" (minor synthwave arpeggio), 1 = "VICE FM" (slower bass).
  const STATIONS = [
    { name: 'NEON DRIVE', bpm: 112, bass: [55, 55, 65.4, 49], arp: [220, 261.6, 329.6, 392, 329.6, 261.6] },
    { name: 'VICE FM', bpm: 88, bass: [49, 58.3, 65.4, 73.4], arp: [196, 246.9, 293.7, 392, 293.7, 246.9] },
  ];
  function radioStart() {
    if (!ensure()) return;
    radioStop();
    radioOn = true;
    const st = STATIONS[station];
    const step = 60 / st.bpm / 2;
    let i = 0;
    const tick = () => {
      if (!radioOn) return;
      if (!muted) {
        const b = st.bass[i % st.bass.length];
        tone(b, step * 1.8, 'sawtooth', 0.10);
        const a = st.arp[i % st.arp.length];
        tone(a * 2, step * 0.9, 'square', 0.045);
        if (i % 4 === 0) noise(0.05, 0.05, 5000);
      }
      i++;
      radioTimer = setTimeout(tick, step * 1000);
    };
    tick();
  }
  function radioStop() { radioOn = false; if (radioTimer) { clearTimeout(radioTimer); radioTimer = null; } }
  function radioToggle() { if (radioOn) radioStop(); else radioStart(); return radioOn; }
  function radioNext() { station = (station + 1) % STATIONS.length; if (radioOn) radioStart(); return STATIONS[station].name; }
  function toggleMute() { muted = !muted; if (muted) radioStop(); return muted; }
  return { ensure, sfx, radioToggle, radioNext, toggleMute, STATIONS, isRadioOn: () => radioOn, stationName: () => STATIONS[station].name, isMuted: () => muted };
})();
