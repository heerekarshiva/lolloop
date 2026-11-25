export type FullscreenPref = 'always' | 'never' | 'ask';

const PREF_KEY = 'lolloop.fullscreen';
const PSEUDO_CLASS = '__lolloop_pseudo_fs';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

function requestFS(el: HTMLElement): Promise<void> {
  if (el.requestFullscreen) return el.requestFullscreen();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webkitEl = el as any;
  if (webkitEl.webkitRequestFullscreen) return webkitEl.webkitRequestFullscreen();
  return Promise.reject(new Error('not supported'));
}

function exitFS(): Promise<void> {
  if (document.exitFullscreen) return document.exitFullscreen();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = document as any;
  if (d.webkitExitFullscreen) return d.webkitExitFullscreen();
  return Promise.reject(new Error('not supported'));
}

function getFullscreenElement(): Element | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return document.fullscreenElement ?? (document as any).webkitFullscreenElement ?? null;
}

export interface FullscreenManager {
  isFullscreen: boolean;
  isSupported: boolean;
  isPseudoFullscreen: boolean;
  request(element: HTMLElement): Promise<void>;
  exit(): Promise<void>;
  toggle(element: HTMLElement): Promise<void>;
  getPreference(): FullscreenPref;
  setPreference(p: FullscreenPref): void;
  onChange(cb: (isFS: boolean) => void): () => void;
  dispose(): void;
}

export function createFullscreenManager(): FullscreenManager {
  const ios = isIOS();
  const supported = !ios && typeof document !== 'undefined' &&
    (document.documentElement.requestFullscreen != null ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document.documentElement as any).webkitRequestFullscreen != null);

  let pseudoActive = false;
  let pseudoElement: HTMLElement | null = null;
  const changeListeners = new Set<(isFS: boolean) => void>();

  // Inject pseudo-fullscreen styles once
  if (typeof document !== 'undefined') {
    const id = '__lolloop_pseudo_fs_style';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `.${PSEUDO_CLASS}{position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100dvh!important;z-index:9999!important;}`;
      document.head.appendChild(style);
    }
  }

  function notifyListeners(isFS: boolean) {
    changeListeners.forEach((cb) => cb(isFS));
  }

  const onFSChange = () => {
    const isFS = getFullscreenElement() !== null;
    notifyListeners(isFS || pseudoActive);
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', onFSChange);
    document.addEventListener('webkitfullscreenchange', onFSChange);
  }

  function loadPref(): FullscreenPref {
    try {
      const v = localStorage.getItem(PREF_KEY);
      if (v === 'always' || v === 'never' || v === 'ask') return v;
    } catch { /* ignore */ }
    return 'ask';
  }

  function savePref(p: FullscreenPref) {
    try { localStorage.setItem(PREF_KEY, p); } catch { /* ignore */ }
  }

  function enterPseudo(el: HTMLElement) {
    pseudoElement = el;
    pseudoActive = true;
    el.classList.add(PSEUDO_CLASS);
    if (typeof document !== 'undefined') document.body.style.overflow = 'hidden';
    notifyListeners(true);
  }

  function exitPseudo() {
    if (pseudoElement) {
      pseudoElement.classList.remove(PSEUDO_CLASS);
      pseudoElement = null;
    }
    pseudoActive = false;
    if (typeof document !== 'undefined') document.body.style.overflow = '';
    notifyListeners(false);
  }

  async function tryLockOrientation() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (screen.orientation as any).lock('landscape');
    } catch { /* not supported, ignore */ }
  }

  const mgr: FullscreenManager = {
    get isFullscreen() {
      return pseudoActive || getFullscreenElement() !== null;
    },
    get isSupported() { return supported; },
    get isPseudoFullscreen() { return pseudoActive; },

    async request(element: HTMLElement): Promise<void> {
      if (ios || !supported) {
        enterPseudo(element);
        return;
      }
      await requestFS(element);
      await tryLockOrientation();
    },

    async exit(): Promise<void> {
      if (pseudoActive) { exitPseudo(); return; }
      if (getFullscreenElement()) await exitFS();
    },

    async toggle(element: HTMLElement): Promise<void> {
      if (mgr.isFullscreen) await mgr.exit();
      else await mgr.request(element);
    },

    getPreference(): FullscreenPref { return loadPref(); },
    setPreference(p: FullscreenPref) { savePref(p); },

    onChange(cb: (isFS: boolean) => void): () => void {
      changeListeners.add(cb);
      return () => changeListeners.delete(cb);
    },

    dispose(): void {
      if (pseudoActive) exitPseudo();
      changeListeners.clear();
      if (typeof document !== 'undefined') {
        document.removeEventListener('fullscreenchange', onFSChange);
        document.removeEventListener('webkitfullscreenchange', onFSChange);
      }
    },
  };

  return mgr;
}
