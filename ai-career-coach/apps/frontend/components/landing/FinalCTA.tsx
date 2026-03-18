'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AnimatedSection } from './AnimatedWrappers';

export function FinalCTA() {
  return (
    <div className="py-32 border-t border-white/[0.04]">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <AnimatedSection>
          <div className="relative">
            {/* Background glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[500px] h-[300px] bg-primary/[0.06] rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-5">
                Ready to take control
                <br />
                <span className="bg-gradient-to-r from-primary to-[hsl(280,65%,60%)] bg-clip-text text-transparent">
                  of your career?
                </span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-10">
                Start analyzing your CV in under two minutes. Free to use, no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/register"
                  className="group flex items-center gap-2 px-10 py-4 bg-primary hover:bg-primary/90 text-white text-base font-medium rounded-full transition-all hover:shadow-[0_0_40px_-5px_hsl(239,84%,67%,0.5)]"
                >
                  Get started — it&apos;s free
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              <p className="mt-5 text-[12px] text-muted-foreground/50">
                No credit card required &middot; Free tier available &middot; Cancel anytime
              </p>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </div>
  );
}
