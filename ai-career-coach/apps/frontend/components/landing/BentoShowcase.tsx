'use client';

import {
  FileText,
  Target,
  BookOpen,
  Award,
  Users,
} from 'lucide-react';
import { AnimatedSection, AnimatedElement } from './AnimatedWrappers';

export function BentoShowcase() {
  return (
    <div className="py-32 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <p className="text-[13px] font-medium text-primary tracking-wide uppercase mb-4">
            Platform
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-5">
            Built for serious
            <br />
            <span className="text-muted-foreground">career moves.</span>
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Large card - CV Analysis */}
          <AnimatedElement delay={0} className="md:row-span-2">
            <div className="h-full relative group p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.1] transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.05] rounded-full blur-[80px] group-hover:bg-primary/[0.08] transition-colors duration-700" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  Deep CV Intelligence
                </h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed mb-8">
                  Powered by advanced NLP, our engine doesn&apos;t just read your CV — it understands it.
                  Extract structured data from any format and get insights no human reviewer could match.
                </p>

                {/* Mock analysis UI */}
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-medium text-foreground">Skills Detected</span>
                      <span className="text-[11px] font-mono text-primary">24 found</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {['React', 'TypeScript', 'Node.js', 'Python', 'AWS', '+19'].map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 text-[11px] rounded-md bg-white/[0.04] border border-white/[0.06] text-muted-foreground"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-medium text-foreground">ATS Score</span>
                      <span className="text-[11px] font-mono text-success">87/100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06]">
                      <div className="w-[87%] h-full rounded-full bg-gradient-to-r from-success to-[hsl(173,80%,40%)]" />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-foreground">Experience Level</span>
                      <span className="text-[11px] font-mono text-[hsl(280,65%,60%)]">Senior</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedElement>

          {/* Top right - Job Matching */}
          <AnimatedElement delay={0.1}>
            <div className="relative group p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.1] transition-all duration-500">
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[hsl(280,65%,60%)]/[0.05] rounded-full blur-[60px] group-hover:bg-[hsl(280,65%,60%)]/[0.08] transition-colors duration-700" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-[hsl(280,65%,60%)]/10 border border-[hsl(280,65%,60%)]/20 flex items-center justify-center mb-5">
                  <Target className="w-6 h-6 text-[hsl(280,65%,60%)]" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Precision Matching
                </h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
                  Semantic similarity scoring powered by transformer embeddings. Every match includes a detailed breakdown.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[92, 88, 85].map((score) => (
                      <div
                        key={score}
                        className="w-8 h-8 rounded-full bg-white/[0.05] border-2 border-background flex items-center justify-center"
                      >
                        <span className="text-[9px] font-mono font-bold text-primary">{score}%</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">Top 3 matches</span>
                </div>
              </div>
            </div>
          </AnimatedElement>

          {/* Bottom right - Learning */}
          <AnimatedElement delay={0.2}>
            <div className="relative group p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.1] transition-all duration-500">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[hsl(173,80%,40%)]/[0.05] rounded-full blur-[60px] group-hover:bg-[hsl(173,80%,40%)]/[0.08] transition-colors duration-700" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-[hsl(173,80%,40%)]/10 border border-[hsl(173,80%,40%)]/20 flex items-center justify-center mb-5">
                  <BookOpen className="w-6 h-6 text-[hsl(173,80%,40%)]" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Adaptive Learning
                </h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
                  Curated courses and skill paths that evolve with your goals. Track progress and close skill gaps methodically.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-warning" />
                    <span className="text-[11px] text-muted-foreground">Curated courses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-[11px] text-muted-foreground">Personalized paths</span>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedElement>
        </div>
      </div>
    </div>
  );
}
