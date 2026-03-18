'use client';

import {
  FileText,
  Sparkles,
  Search,
  LineChart,
} from 'lucide-react';
import { AnimatedSection, AnimatedElement } from './AnimatedWrappers';

const workflowSteps = [
  {
    step: '01',
    title: 'Upload your CV',
    description:
      'Drop your resume in any format. Our AI instantly parses and structures your entire career history.',
    icon: FileText,
  },
  {
    step: '02',
    title: 'Get your analysis',
    description:
      'Receive a comprehensive breakdown — skills map, ATS score, experience timeline, and improvement areas.',
    icon: Sparkles,
  },
  {
    step: '03',
    title: 'Discover matches',
    description:
      'Our semantic engine finds roles that align with your profile, ranked by compatibility score.',
    icon: Search,
  },
  {
    step: '04',
    title: 'Accelerate growth',
    description:
      'Follow personalized learning paths, prep for interviews, and track your career progress in real time.',
    icon: LineChart,
  },
];

export function HowItWorks() {
  return (
    <div
      id="how-it-works"
      className="py-32 border-t border-white/[0.04]"
    >
      <div className="max-w-6xl mx-auto px-6">
        <AnimatedSection className="text-center mb-20">
          <p className="text-[13px] font-medium text-primary tracking-wide uppercase mb-4">
            Process
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-5">
            From upload to offer.
            <br />
            <span className="text-muted-foreground">Four simple steps.</span>
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {workflowSteps.map((step, index) => (
            <AnimatedElement key={step.step} delay={index * 0.12}>
              <div className="relative group">
                {/* Connector line */}
                {index < workflowSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(100%+4px)] w-[calc(100%-56px)] h-px bg-gradient-to-r from-white/[0.08] to-transparent z-0" />
                )}

                <div className="relative p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-[12px] font-mono font-medium text-muted-foreground/70">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </AnimatedElement>
          ))}
        </div>
      </div>
    </div>
  );
}
