(() => {
  const EXT = globalThis.browser ?? globalThis.chrome;
  if (!EXT?.runtime || !EXT?.storage?.local) return;

  const HAS_PROMISE_API = typeof globalThis.browser !== 'undefined' && EXT === globalThis.browser;
  const DEFAULTS = {
    profileVersion: 10,
    enabled: true,
    gainDb: 16,
    thresholdDb: -24,
    knee: 40,
    ratio: 6,
    attack: 0.0001,
    release: 0.03,
    lowShelfDb: 6,
    presenceDb: 4,
    highShelfDb: 6,
    noiseGateDb: -52,
    limiterDb: -1,
    drive: 0.6,
    loudness: 3.5,
    maxBoost: 24,
    sustain: true,
    sustainTargetDb: -6,
    sustainMaxGain: 12,
    forceRawMic: true,
    reverbEnabled: false,
    reverbDelay: 0.06,
    reverbFeedback: 0.35,
    reverbWet: 0.22,
    keepAlive: false,
    keepAliveGain: 0.0002,
    senderRefreshMs: 750
  };
  const MSG_CFG = 'MIC_MAXIMIZER_CONFIG';
  let hookReady = false;

  function storageGet(key) {
    if (HAS_PROMISE_API) return EXT.storage.local.get(key);
    return new Promise((resolve) => {
      try {
        EXT.storage.local.get(key, (res) => {
          if (EXT.runtime?.lastError) resolve({});
          else resolve(res || {});
        });
      } catch (_) {
        resolve({});
      }
    });
  }

  function sendMessage(message) {
    if (HAS_PROMISE_API) return EXT.runtime.sendMessage(message);
    return new Promise((resolve) => {
      try {
        EXT.runtime.sendMessage(message, () => resolve(!EXT.runtime?.lastError));
      } catch (_) {
        resolve(false);
      }
    });
  }

  function pushConfig(config) {
    window.postMessage({ type: MSG_CFG, payload: config }, '*');
  }

  async function loadConfig() {
    try {
      const res = await storageGet('micMaximizerConfig');
      const stored = res.micMaximizerConfig || {};
      if (stored.profileVersion !== DEFAULTS.profileVersion) return { ...DEFAULTS };
      return { ...DEFAULTS, ...stored };
    } catch (_) {
      return { ...DEFAULTS };
    }
  }

  async function sync() {
    pushConfig(await loadConfig());
  }

  function heartbeat() {
    if (!hookReady) return;
    sendMessage({ type: 'MICMAX_HEARTBEAT' }).catch(() => {});
  }

  window.addEventListener('message', (event) => {
    if (event.source === window && event.data?.type === 'MIC_MAXIMIZER_READY') {
      hookReady = true;
      sync();
      heartbeat();
    }
  });

  EXT.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.micMaximizerConfig) {
      sync();
    }
  });

  setInterval(() => {
    if (hookReady) {
      sync();
      heartbeat();
    }
  }, 8000);

  setTimeout(sync, 1500);

  console.log('[LOVELY BOY • ULTRA PRO V10] content service loaded');
})();
