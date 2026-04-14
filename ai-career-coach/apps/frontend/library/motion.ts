import type { Variants, Transition } from 'framer-motion';

export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  counter: 1.0,
} as const;

// expo-out: fast initial movement with an elegant settle
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const BASE_TRANSITION: Transition = {
  duration: DURATION.base,
  ease: EASE_OUT,
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: BASE_TRANSITION },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: BASE_TRANSITION },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
};
