// apps/web/src/components/auth/AuthLayout.tsx

import Link from 'next/link';
import Image from 'next/image';
import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showLogo?: boolean;
}

export default function AuthLayout({
  children,
  title,
  subtitle,
  showLogo = true,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen  flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        

        {/* Card */}
        <div className=" rounded-2xl shadow-2xl border border-[#2a3441] p-8">
          {/* Logo */}
        {showLogo && (
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <Image
                src="/LOGO.png"
                alt="Build Your Career"
                width={280}
                height={64}
                className="h-16 w-auto object-contain mx-auto"
              />
            </Link>
          </div>
        )}
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            {subtitle && (
              <p className="text-gray-400 mt-2">{subtitle}</p>
            )}
          </div>

          {/* Content */}
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>
            By continuing, you agree to our{' '}
            <Link href="/terms" className="text-[#6366f1] hover:text-[#818cf8] hover:underline transition-colors">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-[#6366f1] hover:text-[#818cf8] hover:underline transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}