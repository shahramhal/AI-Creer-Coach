'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useEffect } from 'react'; // Add useEffect to imports
import { useMotionValue, useTransform, animate } from 'framer-motion';

export function AnimatedSection({
  children,
  className = '',
  delay = 0,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });

  return (
    <motion.section
      id={id}
      ref={sectionRef}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export function AnimatedElement({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'right';
}) {
  const elementRef = useRef(null);
  const isInView = useInView(elementRef, { once: true, margin: '-40px' });

  const initialPosition =
    direction === 'up'
      ? { opacity: 0, y: 30 }
      : direction === 'left'
        ? { opacity: 0, x: -30 }
        : { opacity: 0, x: 30 };

  const animatedPosition =
    direction === 'up'
      ? { opacity: 1, y: 0 }
      : { opacity: 1, x: 0 };

  return (
    <motion.div
      ref={elementRef}
      initial={initialPosition}
      animate={isInView ? animatedPosition : initialPosition}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const counterRef = useRef(null);
  const isInView = useInView(counterRef, { once: true });

  return (
    <motion.span
      ref={counterRef}
      className="font-mono tabular-nums"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
    >
      {isInView && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <CountUp target={value} />
          {suffix}
        </motion.span>
      )}
    </motion.span>
  );
}

function CountUp({ target }: { target: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    
    const controls = animate(count, target, {
      duration: 2,
      ease: 'easeOut',
    });

    return () => controls.stop();
  }, [count, target]);

  return (
    <motion.span ref={nodeRef}>
      {}
      {rounded}
    </motion.span>
  );
}
