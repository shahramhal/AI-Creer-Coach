'use client';

import { useEffect } from 'react';
import { useMotionValue, useTransform, animate, motion } from 'framer-motion';
import { cn } from '@/library/utils';

interface CountUpProps {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

export function CountUp({ value, duration = 1, suffix = '', className }: CountUpProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: 'easeOut' });
    return () => controls.stop();
  }, [count, value, duration]);

  return (
    <>
      <motion.span className={cn('tabular-nums', className)}>{rounded}</motion.span>
      {suffix}
    </>
  );
}
