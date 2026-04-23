'use client';

import {
  FileText,
  Briefcase,
  Target,
  TrendingUp,
} from 'lucide-react';
import { AnimatedSection, AnimatedElement, AnimatedCounter } from './AnimatedWrappers';

const platformStats = [
  { value: 6, suffix: '+', label: 'Core AI Tools', icon: FileText },
  { value: 3, suffix: '', label: 'Job Sources', icon: Briefcase },
  { value: 10, suffix: 'min', label: 'Setup Time', icon: Target },
  { value: 100, suffix: '%', label: 'Free to Start', icon: TrendingUp },
];

export function StatsBar() {
  return (
    <AnimatedSection id="stats" className="relative py-24 border-y border-white/[0.04]">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {platformStats.map((stat, index) => (
              <AnimatedElement key={stat.label} delay={index * 0.1} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-foreground mb-1">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-[13px] text-muted-foreground">{stat.label}</div>
            </AnimatedElement>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
