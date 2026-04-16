'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { adminService } from '@/services/admin.service';

// Max plausible values in ms - anything above is a stale buffered entry from a previous
// navigation and should be discarded. Dev mode cold-starts can be slow but not indefinitely.
const MAX_PLAUSIBLE_MS = 30000;

export function WebVitalsReporter() {
  const pathname = usePathname();
  const reportedInitialLoad = useRef(false);

  useEffect(() => {
    const vitals: { name: string; value: number; page: string }[] = [];

    // Navigation Timing only applies to the initial full page load.
    // On SPA navigations (pathname changes), the navigation entry stays from the
    // original load so re-reading it would give incorrect cumulative times.
    if (!reportedInitialLoad.current) {
      reportedInitialLoad.current = true;

      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const nav = navEntries[0];
      if (nav && nav.loadEventEnd > 0) {
        const ttfb = Math.round(nav.responseStart - nav.requestStart);
        const domLoad = Math.round(nav.domContentLoadedEventEnd - nav.startTime);
        const pageLoad = Math.round(nav.loadEventEnd - nav.startTime);

        if (ttfb <= MAX_PLAUSIBLE_MS) vitals.push({ name: 'TTFB', value: ttfb, page: pathname });
        if (domLoad <= MAX_PLAUSIBLE_MS) vitals.push({ name: 'DomLoad', value: domLoad, page: pathname });
        if (pageLoad <= MAX_PLAUSIBLE_MS) vitals.push({ name: 'PageLoad', value: pageLoad, page: pathname });
      }

      const paintEntries = performance.getEntriesByType('paint');
      for (const entry of paintEntries) {
        if (entry.name === 'first-contentful-paint' && entry.startTime <= MAX_PLAUSIBLE_MS) {
          vitals.push({ name: 'FCP', value: Math.round(entry.startTime), page: pathname });
        }
      }
    }

    // LCP is valid per-navigation in a SPA since it tracks the largest element rendered
    // since the last user interaction. Do NOT use buffered:true here - that replays
    // old entries from previous navigations and produces nonsense cumulative times.
    let lcpValue: number | null = null;
    let lcpObserver: PerformanceObserver | null = null;
    try {
      lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) lcpValue = Math.round(last.startTime);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint' });
    } catch {
      // Browser may not support LCP observer
    }

    const report = () => {
      if (lcpValue !== null && lcpValue <= MAX_PLAUSIBLE_MS) {
        vitals.push({ name: 'LCP', value: lcpValue, page: pathname });
      }
      if (vitals.length > 0) {
        adminService.reportWebVitals(vitals).catch(() => {});
      }
    };

    const timer = setTimeout(report, 3000);

    return () => {
      clearTimeout(timer);
      lcpObserver?.disconnect();
    };
  }, [pathname]);

  return null;
}
