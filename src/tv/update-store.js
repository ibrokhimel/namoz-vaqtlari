// Update state for the TV app: checked at launch (asks once if there is a
// new version), re-checked quietly every 6 hours (status bar only), and
// installable later from the settings panel.
import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import { CURRENT, fetchLatest, isNewer } from '../core/updater.js';

const RECHECK_MS = 6 * 3600000;

// status: idle | checking | none | available | installing | error
let state = { status: 'idle', info: null, error: '', prompt: false, current: CURRENT };
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
    if (isNewer(info)) set({ status: 'available', info, prompt: prompt || state.prompt });
    else set({ status: 'none', info: null, prompt: false });
  } catch (e) {
    set({ status: state.info ? 'available' : 'error', error: e.message || String(e) });
  }
}

export async function installUpdate() {
  const { info } = state;
  if (!info || state.status === 'installing') return;
  set({ status: 'installing', prompt: true, error: '' });
  try {
    if (isNative()) {
      const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
      const bundle = await CapacitorUpdater.download({ url: info.url, version: info.version, checksum: info.sha256 });
      await CapacitorUpdater.set({ id: bundle.id });   // reloads the app on the new version
    } else {
      location.reload();                              // hosted web build: just load the latest
    }
  } catch (e) {
    set({ status: 'available', prompt: true, error: e.message || String(e) });
  }
}

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
