// apps/web/src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../context/authContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Career Coach - Smart Job Matching & Career Guidance',
  description: 'AI-powered career coaching platform with CV analysis, job matching, and interview preparation',
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