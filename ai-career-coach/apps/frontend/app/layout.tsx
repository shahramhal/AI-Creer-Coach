// apps/web/src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../context/authContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Build Your Career — Smart Job Matching & Career Guidance',
  description: 'AI-powered career platform with CV analysis, semantic job matching, salary insights, and personalized learning paths',
  icons: {
    icon: '/LOGO_to_circle.png',
    apple: '/LOGO_to_circle.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}