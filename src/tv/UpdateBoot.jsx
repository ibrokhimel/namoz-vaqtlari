import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { bootedFromUpdate, useUpdate } from './update-store.js';

// Installing an update looks like a device restart: the screen fades to
// black, a thin bar fills while the new version downloads, and the new
// version then rises out of the black.
export default function UpdateBoot() {
  const u = useUpdate();
  const installing = u.status === 'installing';
  const [arrived, setArrived] = useState(!!bootedFromUpdate);

  // the remote does nothing while installing
  useEffect(() => {
    if (!installing) return undefined;
    const eat = e => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('keydown', eat, true);
    window.addEventListener('keyup', eat, true);
    return () => { window.removeEventListener('keydown', eat, true); window.removeEventListener('keyup', eat, true); };
  }, [installing]);

  useEffect(() => {
    if (!arrived) return undefined;
    const t = setTimeout(() => setArrived(false), 900);   // hold the black a moment, then reveal
    return () => clearTimeout(t);
  }, [arrived]);

  const show = installing || arrived;
  const progress = arrived ? 1 : u.progress;
  const name = arrived ? bootedFromUpdate : u.info?.name;

  return (
    <AnimatePresence>
      {show && (
        <motion.div className="boot" key="boot" aria-live="polite" aria-label="Yangilanmoqda"
          initial={{ opacity: arrived ? 1 : 0 }} animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 2.4, ease: [0.4, 0, 0.2, 1] } }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}>
          <motion.div className="boot-inner" initial={{ opacity: arrived ? 1 : 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }} transition={{ delay: arrived ? 0 : 1, duration: 0.8 }}>
            <p className="boot-mark">Namoz Vaqtlari</p>
            <div className="boot-bar"><i style={{ transform: `scaleX(${progress})` }} /></div>
            <p className="boot-ver">{name ? `v${name}` : ''}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
