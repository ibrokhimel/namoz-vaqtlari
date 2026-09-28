// Update state for the TV app: checked at launch (asks once if there is a
// new version), re-checked quietly every 6 hours (status bar only), and
// installable later from the settings panel.
import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import { CURRENT, fetchLatest, isNewer } from '../core/updater.js';

const RECHECK_MS = 6 * 3600000;
const BOOT_KEY = 'nv-updated';          // set just before switching: the new version fades in
const SIM_KEY = 'nv-sim-current';       // dev preview only: pretend the update was installed
const wait = ms => new Promise(r => setTimeout(r, ms));
const store = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } };
const read = k => { try { return localStorage.getItem(k); } catch { return null; } };

// Dev preview: after a pretend install, run as that version for this session
function simulatedCurrent() {
  if (!import.meta.env.DEV) return CURRENT;
  try { return JSON.parse(sessionStorage.getItem(SIM_KEY)) || CURRENT; } catch { return CURRENT; }
}

// status: idle | checking | none | available | installing | error
// progress: 0..1 while installing
let state = { status: 'idle', info: null, error: '', prompt: false, progress: 0, current: simulatedCurrent() };
const listeners = new Set();
const set = patch => { state = { ...state, ...patch }; listeners.forEach(l => l()); };

export const isNative = () => Capacitor.isNativePlatform();

// Updates run in the APK and on a hosted build; not on the dev server
// (unless ?update=1), where every newer commit would look like an update.
function enabled() {
  if (isNative()) return true;
  if (import.meta.env.DEV) return new URLSearchParams(location.search).get('update') === '1';
  return true;
}

export async function checkNow({ prompt = false } = {}) {
  if (!enabled() || state.status === 'checking' || state.status === 'installing') return;
  set({ status: 'checking', error: '' });
  try {
    const info = await fetchLatest();
    if (isNewer(info, state.current)) set({ status: 'available', info, prompt: prompt || state.prompt });
    else set({ status: 'none', info: null, prompt: false });
  } catch (e) {
    set({ status: state.info ? 'available' : 'error', error: e.message || String(e) });
  }
}

export async function installUpdate() {
  const { info } = state;
  if (!info || state.status === 'installing') return;
  set({ status: 'installing', prompt: false, progress: 0, error: '' });
  await wait(1400);                                   // the screen fades to black first
  let listener;
  try {
    if (isNative()) {
      const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
      listener = await CapacitorUpdater.addListener('download', ({ percent }) => set({ progress: Math.min(0.97, percent / 100) }));
      const bundle = await CapacitorUpdater.download({ url: info.url, version: info.version, checksum: info.sha256 });
      await finish(info);
      await CapacitorUpdater.set({ id: bundle.id });   // reloads the app on the new version
    } else {
      // hosted web build: the server already has the new files; the bar
      // stands for the reload. Dev preview pretends to install.
      for (let i = 1; i <= 30; i++) { await wait(90); set({ progress: 0.97 * (1 - (1 - i / 30) ** 2) }); }
      if (import.meta.env.DEV) sessionStorage.setItem(SIM_KEY, JSON.stringify({ version: info.version, name: info.name, builtAt: info.builtAt }));
      await finish(info);
      location.reload();
    }
  } catch (e) {
    set({ status: 'available', prompt: true, progress: 0, error: e.message || String(e) });
  } finally {
    listener?.remove?.();
  }
}

async function finish(info) {
  set({ progress: 1 });
  store(BOOT_KEY, info.name || info.version);
  await wait(700);                                    // let the bar reach the end
}

// Right after an update: the new version starts behind a black screen that
// fades away (read once, at start)
export const bootedFromUpdate = (() => {
  const v = read(BOOT_KEY);
  if (v) store(BOOT_KEY, null);
  return v;
})();

export const dismissPrompt = () => set({ prompt: false, error: '' });

let started = false;
export function startUpdates() {
  if (started) return;
  started = true;
  if (isNative()) {
    // tell the updater this bundle started fine (otherwise it rolls back)
    import('@capgo/capacitor-updater').then(({ CapacitorUpdater }) => CapacitorUpdater.notifyAppReady()).catch(() => {});
  }
  setTimeout(() => checkNow({ prompt: true }), 4000);          // at launch: ask once
  setInterval(() => checkNow(), RECHECK_MS);                   // later: status bar only
}

export function useUpdate() {
  return useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}
