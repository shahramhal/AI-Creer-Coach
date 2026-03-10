'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  FileText,
  Target,
  TrendingUp,
  Search,
  BarChart3,
  GraduationCap,
  Shield,
  ChevronRight,
  ArrowRight,
  Users,
  Briefcase,
  Award,
  CheckCircle2,
  Sparkles,
  LineChart,
  BookOpen,
  Zap,
} from 'lucide-react';

/* ──────────────────────────── Animated Section Wrapper ──────────────────────────── */

function AnimatedSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });

  return (
    <motion.section
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

function AnimatedElement({
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

/* ──────────────────────────── Counter Animation ──────────────────────────── */

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
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

  return (
    <motion.span
      ref={nodeRef}
      initial={0}
      whileInView={target}
      viewport={{ once: true }}
      transition={{ duration: 2, ease: 'easeOut' }}
      onUpdate={(latest) => {
        if (nodeRef.current) {
          nodeRef.current.textContent = Math.round(latest as number).toLocaleString();
        }
      }}
    >
      0
    </motion.span>
  );
}

/* ──────────────────────────── Navigation ──────────────────────────── */

function Navigation() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/70 border-b border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center group">
          <Image
            src="/LOGO.png"
            alt="Build Your Career"
            width={180}
            height={44}
            className="h-10 w-auto object-contain"
          />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#stats" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
            Results
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="text-[13px] font-medium text-white bg-primary hover:bg-primary/90 transition-all px-4 py-2 rounded-full"
          >
            Get started free
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

/* ──────────────────────────── Hero ──────────────────────────── */

function Hero() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.96]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 60]);

  return (
    <motion.div
      ref={heroRef}
      style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
      className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.07] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-[hsl(280,65%,60%)]/[0.05] rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[hsl(173,80%,40%)]/[0.04] rounded-full blur-[80px]" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[12px] font-medium text-muted-foreground tracking-wide uppercase">
            Intelligent career platform
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-bold tracking-tight leading-[1.05] mb-6"
        >
          <span className="text-foreground">Your career,</span>
          <br />
          <span className="bg-gradient-to-r from-primary via-[hsl(280,65%,60%)] to-[hsl(173,80%,50%)] bg-clip-text text-transparent">
            accelerated.
          </span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          AI-powered CV analysis, semantic job matching, and personalized career
          guidance — all in one platform built for modern job seekers.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/auth/register"
            className="group flex items-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary/90 text-white text-[15px] font-medium rounded-full transition-all hover:shadow-[0_0_30px_-5px_hsl(239,84%,67%,0.4)]"
          >
            Start for free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="#features"
            className="flex items-center gap-2 px-8 py-3.5 border border-white/[0.1] hover:border-white/[0.2] text-foreground text-[15px] font-medium rounded-full transition-all hover:bg-white/[0.03]"
          >
            See how it works
          </a>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mt-16 flex items-center justify-center gap-6 text-[12px] text-muted-foreground/60"
        >
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> SOC 2 compliant
          </span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> No credit card required
          </span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Setup in 2 minutes
          </span>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-6 h-10 rounded-full border-2 border-white/[0.1] flex items-start justify-center pt-2"
        >
          <div className="w-1 h-2 rounded-full bg-white/20" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ──────────────────────────── Stats Bar ──────────────────────────── */

const platformStats = [
  { value: 50000, suffix: '+', label: 'CVs Analyzed', icon: FileText },
  { value: 12000, suffix: '+', label: 'Jobs Matched', icon: Briefcase },
  { value: 94, suffix: '%', label: 'Match Accuracy', icon: Target },
  { value: 8500, suffix: '+', label: 'Career Transitions', icon: TrendingUp },
];

function StatsBar() {
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

/* ──────────────────────────── Features ──────────────────────────── */

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

function Features() {
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
            Five integrated tools working together to give you an unfair advantage in your job search.
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

/* ──────────────────────────── How It Works ──────────────────────────── */

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

function HowItWorks() {
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
                    <span className="text-[12px] font-mono font-medium text-muted-foreground/50">
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

/* ──────────────────────────── Bento Showcase ──────────────────────────── */

function BentoShowcase() {
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
          {/* Large card — CV Analysis */}
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

          {/* Top right — Job Matching */}
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

          {/* Bottom right — Learning */}
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
                    <span className="text-[11px] text-muted-foreground">120+ courses</span>
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


/* ──────────────────────────── Final CTA ──────────────────────────── */

function FinalCTA() {
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
                Join thousands of professionals who&apos;ve already accelerated their careers.
                Start analyzing your CV in under two minutes.
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

/* ──────────────────────────── Footer ──────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <Image
              src="/LOGO.png"
              alt="Build Your Career"
              width={120}
              height={32}
              className="h-8 w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-8">
            <a href="#features" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </a>
            <Link href="/auth/login" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/auth/register" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              Sign up
            </Link>
          </div>

          <p className="text-[11px] text-muted-foreground/40">
            &copy; {new Date().getFullYear()} Build Your Career. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ──────────────────────────── Page ──────────────────────────── */

export default function Home() {
  return (
    <main className="bg-background text-foreground overflow-x-hidden">
      <Navigation />
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <BentoShowcase />
      <FinalCTA />
      <Footer />
    </main>
  );
}
