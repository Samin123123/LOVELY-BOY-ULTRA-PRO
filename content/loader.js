(() => {
  if (window.__lovelyBoyUltraProLoaded) return;
  window.__lovelyBoyUltraProLoaded = true;

  const start = () => {
    try {
      if (!window.__micMaxInjectorReady) {
        const s = document.createElement('script');
        s.src = (globalThis.browser ?? globalThis.chrome).runtime.getURL('core/injector.js');
        s.onload = () => s.remove();
        s.onerror = () => s.remove();
        (document.head || document.documentElement).appendChild(s);
      }
    } catch (_) {}
  };

  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
