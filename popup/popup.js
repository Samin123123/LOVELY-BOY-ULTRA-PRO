const EXT = globalThis.browser ?? globalThis.chrome;
const HAS_PROMISE_API = typeof globalThis.browser !== 'undefined' && EXT === globalThis.browser;
const PASSWORD = 'LOVELY BOY';

const DEFAULTS = {
  profileVersion: 10,
  enabled: true,
  gainDb: 16,
  loudness: 3.5,
  maxBoost: 15,
  drive: 0.6,
  thresholdDb: -24,
  ratio: 6,
  limiterDb: -1,
  presenceDb: 4,
  lowShelfDb: 6,
  highShelfDb: 6,
  noiseGateDb: -52,
  sustain: true,
  sustainTargetDb: -6,
  sustainMaxGain: 10,
  forceRawMic: true,
  reverbEnabled: false,
  reverbDelay: 0.06,
  reverbFeedback: 0.35,
  reverbWet: 0.22,
  keepAlive: false,
  keepAliveGain: 0.0002,
  senderRefreshMs: 750
};

const PRESETS = {
  monster: { gainDb: 22, loudness: 6.5, drive: 1.2, lowShelfDb: 8, presenceDb: 6, highShelfDb: 5, reverbEnabled: false, noiseGateDb: -50 },
  studio:  { gainDb: 12, loudness: 2.2, drive: 0.2, lowShelfDb: 3, presenceDb: 5, highShelfDb: 8, reverbEnabled: false, noiseGateDb: -48 },
  echo:    { gainDb: 16, loudness: 3.2, drive: 0.5, lowShelfDb: 4, presenceDb: 4, highShelfDb: 5, reverbEnabled: true, reverbWet: 0.32, reverbFeedback: 0.45, reverbDelay: 0.085 },
  bass:    { gainDb: 18, loudness: 4.0, drive: 0.8, lowShelfDb: 14, presenceDb: 3, highShelfDb: 2, reverbEnabled: false, noiseGateDb: -52 }
};

const ids = Object.keys(DEFAULTS).filter(k => k !== 'profileVersion');

// Create Falling Flower Petals
function spawnPetals() {
  const container = document.getElementById('petals-container');
  if (!container) return;
  for (let i = 0; i < 18; i++) {
    const petal = document.createElement('div');
    petal.className = 'petal';
    const size = 7 + Math.random() * 8;
    petal.style.width = `${size}px`;
    petal.style.height = `${size * 0.7}px`;
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.animationDuration = `${5 + Math.random() * 6}s`;
    petal.style.animationDelay = `${Math.random() * 5}s`;
    container.appendChild(petal);
  }
}

function get(key) {
  if (HAS_PROMISE_API) return EXT.storage.local.get(key);
  return new Promise(r => EXT.storage.local.get(key, v => r(EXT.runtime?.lastError ? {} : v || {})));
}
function set(v) {
  if (HAS_PROMISE_API) return EXT.storage.local.set(v);
  return new Promise(r => EXT.storage.local.set(v, () => r(!EXT.runtime?.lastError)));
}
function send(m) {
  if (HAS_PROMISE_API) return EXT.runtime.sendMessage(m);
  return new Promise(r => {
    try { EXT.runtime.sendMessage(m, v => r(EXT.runtime?.lastError ? null : v || null)); }
    catch (e) { r(null); }
  });
}

function fmt(v) {
  const n = Number(v);
  return Math.abs(n) < 0.01 && n !== 0 ? n.toFixed(4) : Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function labels() {
  ids.forEach(id => {
    const el = document.getElementById(id), o = document.getElementById(id + 'Val');
    if (el && o && el.type !== 'checkbox') {
      const unit = (id === 'gainDb' || id === 'noiseGateDb') ? ' dB' : '';
      o.textContent = fmt(el.value) + unit;
    }
  });
}

async function read() {
  const x = await get('micMaximizerConfig'), saved = x.micMaximizerConfig || {};
  return saved.profileVersion === 10 ? { ...DEFAULTS, ...saved } : { ...DEFAULTS };
}

async function save(c) {
  const merged = { ...DEFAULTS, ...c };
  await set({ micMaximizerConfig: merged });
  apply(merged);
}

function apply(c) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!c[id];
    else el.value = c[id];
  });
  const viz = document.getElementById('visualizer');
  if (viz) viz.classList.toggle('active', !!c.enabled);
  labels();
}

async function init() {
  spawnPetals();
  const savedTheme = (await get('ultraTheme')).ultraTheme || 'rose';
  document.body.setAttribute('data-theme', savedTheme);
  document.querySelectorAll('.theme-dot').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.setTheme === savedTheme);
    btn.addEventListener('click', async () => {
      const t = btn.dataset.setTheme;
      document.body.setAttribute('data-theme', t);
      document.querySelectorAll('.theme-dot').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await set({ ultraTheme: t });
    });
  });

  const unlocked = (await get('fbxMicUnlocked')).fbxMicUnlocked === true;
  document.getElementById('login').hidden = unlocked;
  document.getElementById('app').hidden = !unlocked;
  if (!unlocked) return;

  const c = await read();
  apply(c);

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', async () => {
      const v = await read();
      v[id] = el.type === 'checkbox' ? el.checked : Number(el.value);
      await save(v);
    });
  });

  // Card Switches
  document.getElementById('openMicOn')?.addEventListener('change', async e => {
    const v = await read(); v.enabled = e.target.checked; await save(v);
  });
  document.getElementById('noiseClearOn')?.addEventListener('change', async e => {
    const v = await read();
    v.noiseGateDb = e.target.checked ? -52 : -95;
    v.highShelfDb = e.target.checked ? 6 : 0;
    await save(v);
  });
  document.getElementById('bassOn')?.addEventListener('change', async e => {
    const v = await read();
    v.lowShelfDb = e.target.checked ? 6 : 0;
    v.presenceDb = e.target.checked ? 4 : 0;
    await save(v);
  });

  // Presets
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const v = await read();
      await save({ ...v, ...PRESETS[btn.dataset.preset], enabled: true });
    });
  });

  await status();
  setInterval(status, 5000);
}

async function status() {
  const el = document.getElementById('hookStatus');
  if (!el) return;
  try {
    const s = await send({ type: 'MICMAX_STATUS_REQUEST' });
    const age = s?.lastHeartbeat ? Date.now() - s.lastHeartbeat : Infinity;
    el.textContent = s?.ok && age < 12000 ? '🟢 ACTIVE on WhatsApp Web' : '🟡 Open or reload WhatsApp Web';
  } catch (e) {
    el.textContent = '🔴 WhatsApp Web not detected';
  }
}

document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const p = document.getElementById('password').value;
  if (p === PASSWORD) {
    await set({ fbxMicUnlocked: true });
    document.getElementById('loginError').textContent = '';
    document.getElementById('login').hidden = true;
    document.getElementById('app').hidden = false;
    await init();
  } else {
    document.getElementById('loginError').textContent = 'Wrong password. Try again.';
    document.getElementById('password').value = '';
  }
});

init();
        
