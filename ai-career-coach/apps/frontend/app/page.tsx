import { Navigation } from '../components/landing/Navigation';
import { Hero } from '../components/landing/Hero';
import { StatsBar } from '../components/landing/StatsBar';
import { Features } from '../components/landing/Features';
import { HowItWorks } from '../components/landing/HowItWorks';
import { BentoShowcase } from '../components/landing/BentoShowcase';
import { FinalCTA } from '../components/landing/FinalCTA';
import { Footer } from '../components/landing/Footer';

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
