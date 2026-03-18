'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, CheckCircle2, Zap } from 'lucide-react';

export function Hero() {
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
          className="mt-16 flex items-center justify-center gap-6 text-[12px] text-muted-foreground/80"
        >
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
