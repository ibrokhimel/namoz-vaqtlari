import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { dismissPrompt, installUpdate, useUpdate } from './update-store.js';

const OK_KEYS = new Set(['Enter', 'NumpadEnter', 'Select']);
const BACK_KEYS = new Set(['Escape', 'Backspace', 'GoBack', 'BrowserBack']);

// "A new version is available — update?" OK = update, Back = later.
// Takes the remote's keys first (capture phase) while it is shown.
export default function UpdatePrompt() {
  const u = useUpdate();
  const open = u.prompt && (u.status === 'available' || u.status === 'installing');
  const installing = u.status === 'installing';

  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => {
      if (!OK_KEYS.has(e.key) && !BACK_KEYS.has(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      if (installing || e.repeat || e.type !== 'keydown') return;
      if (OK_KEYS.has(e.key)) installUpdate(); else dismissPrompt();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKey, true); };
  }, [open, installing]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="update-scrim" key="scrim" role="dialog" aria-modal="true" aria-label="Yangilanish"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <motion.div className="update-card" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }} transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}>
            <h2>{installing ? 'Yangilanmoqda…' : 'Yangi versiya mavjud'}</h2>
            <p className="uc-version">v{u.current.version} → <b>v{u.info.version}</b></p>
            {u.info.message && <p className="uc-note">{u.info.message}</p>}
            {installing
              ? <div className="uc-progress" aria-hidden="true"><i /></div>
              : <div className="uc-actions">
                  <span className="uc-key primary">OK — Yangilash</span>
                  <span className="uc-key">Orqaga — Keyinroq</span>
                </div>}
            {u.error && <p className="uc-error">Yangilab boʻlmadi: {u.error}. Keyinroq qayta urinib koʻring.</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
