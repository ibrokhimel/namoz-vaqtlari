// Motion helpers for the TV (React Bits BlurText + a digit roll), each with
// a static fallback when the TV asks for reduced motion.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import BlurText from './reactbits/BlurText.jsx';

// Digits that roll to a new value, each at its natural width: General Sans
// has no tabular figures, so fixed-width digit boxes (a counter) would leave
// gaps around narrow digits like 1. The old digit slips up and out, the new
// one rises in.  digits: e.g. 2 renders 5 as "05"
export function RollingNumber({ value, digits = String(value).length, className }) {
  const reduce = useReducedMotion();
  const text = String(value).padStart(digits, '0');
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <span className={`roll ${className || ''}`} aria-label={text}>
      {[...text].map((ch, i) => (
        <span className="roll-slot" key={i}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={ch} className="roll-digit"
              initial={{ y: '0.5em', opacity: 0, filter: 'blur(4px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: '-0.5em', opacity: 0, filter: 'blur(4px)' }}
              transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}>{ch}</motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

// A word that comes into focus letter by letter (React Bits BlurText).
// Remount it (change its key) to play it again.
export function FocusText({ text, className }) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <BlurText text={text} className={`blur-text ${className || ''}`} animateBy="letters" direction="bottom" animateOnMount
      delay={45} stepDuration={0.32}
      animationFrom={{ filter: 'blur(12px)', opacity: 0, y: 18 }}
      animationTo={[{ filter: 'blur(4px)', opacity: 0.6, y: -3 }, { filter: 'blur(0px)', opacity: 1, y: 0 }]}
      easing={t => 1 - Math.pow(1 - t, 4)} />
  );
}
