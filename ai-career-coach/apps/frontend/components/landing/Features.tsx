'use client';

import {
  FileText,
  Target,
  Search,
  BarChart3,
  GraduationCap,
} from 'lucide-react';
import { AnimatedSection, AnimatedElement } from './AnimatedWrappers';

const featuresList = [
  {
    icon: FileText,
    title: 'Smart CV Analysis',
    description:
      'Upload your CV and get instant, detailed feedback. Our AI extracts skills, experience, and qualifications — then scores your resume against industry standards.',
    gradient: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
  },
  {
    icon: Target,
    title: 'ATS Score Optimization',
    description:
      'See exactly how applicant tracking systems read your CV. Get a real ATS compatibility score and actionable suggestions to beat the filters.',
    gradient: 'from-success/20 to-success/5',
    iconColor: 'text-success',
  },
  {
    icon: Search,
    title: 'Semantic Job Matching',
    description:
      'Go beyond keywords. Our ML engine understands context and meaning to match you with roles that truly fit your skills and career goals.',
    gradient: 'from-[hsl(280,65%,60%)]/20 to-[hsl(280,65%,60%)]/5',
    iconColor: 'text-[hsl(280,65%,60%)]',
  },
  {
    icon: BarChart3,
    title: 'Salary Insights',
    description:
      'Access real market salary data for your target roles. Understand your worth and negotiate with confidence using data-backed benchmarks.',
    gradient: 'from-warning/20 to-warning/5',
    iconColor: 'text-warning',
  },
  {
    icon: GraduationCap,
    title: 'Learning Paths',
    description:
      'Personalized skill development roadmaps based on your career goals. Bridge the gap between where you are and where you want to be.',
    gradient: 'from-[hsl(173,80%,40%)]/20 to-[hsl(173,80%,40%)]/5',
    iconColor: 'text-[hsl(173,80%,40%)]',
  },
];

export function Features() {
  return (
    <div id="features" className="py-32">
      <div className="max-w-6xl mx-auto px-6">
        <AnimatedSection className="text-center mb-20">
          <p className="text-[13px] font-medium text-primary tracking-wide uppercase mb-4">
            Capabilities
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-5">
            Everything you need to
            <br />
            <span className="text-muted-foreground">land your next role.</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
            Five AI-powered tools working together to give you an unfair advantage in your job search.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuresList.map((feature, index) => (
            <AnimatedElement key={feature.title} delay={index * 0.08}>
              <div className="group relative h-full p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 hover:border-white/[0.1]">
                {/* Hover glow */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.06] flex items-center justify-center mb-4 group-hover:border-white/[0.1] transition-colors">
                    <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-[15px] font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    {feature.description}
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
