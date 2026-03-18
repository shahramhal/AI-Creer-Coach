import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
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
