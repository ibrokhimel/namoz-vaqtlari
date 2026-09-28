// Thin wrappers that fit the React Bits components to the TV: palette,
// type, and a static fallback when the TV asks for reduced motion.
import { useReducedMotion } from 'motion/react';
import Counter from './reactbits/Counter.jsx';
import BlurText from './reactbits/BlurText.jsx';

// Digits that roll to their new value (React Bits Counter).
//  digits: fixed width, e.g. 2 renders 5 as "05"
export function RollingNumber({ value, digits = String(value).length, fontSize, className }) {
  const reduce = useReducedMotion();
  const text = String(value).padStart(digits, '0');
  if (reduce) return <span className={className}>{text}</span>;
  const places = Array.from({ length: digits }, (_, i) => 10 ** (digits - i - 1));
  return (
    <span className={className} aria-label={text}>
      <Counter value={Number(value)} places={places} fontSize={fontSize} padding={0} gap={0}
        horizontalPadding={0} borderRadius={0} gradientHeight={0} textColor="inherit" fontWeight="inherit" />
    </span>
  );
}

// A word that comes into focus letter by letter (React Bits BlurText).
// Remount it (change its key) to play it again.
export function FocusText({ text, className }) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <BlurText text={text} className={`blur-text ${className || ''}`} animateBy="letters" direction="bottom"
      delay={45} stepDuration={0.32}
      animationFrom={{ filter: 'blur(12px)', opacity: 0, y: 18 }}
      animationTo={[{ filter: 'blur(4px)', opacity: 0.6, y: -3 }, { filter: 'blur(0px)', opacity: 1, y: 0 }]}
      easing={t => 1 - Math.pow(1 - t, 4)} />
  );
}
