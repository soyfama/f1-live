import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'F1 Live — Real-time Timing & Strategy',
  description: 'F1 live timing, analytics, race strategy simulator, telemetry and calendar powered by OpenF1',
  keywords: ['F1', 'Formula 1', 'live timing', 'racing', 'telemetry', 'strategy'],
  authors: [{ name: 'FOMO' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#0D0D14] text-[#EEEEF5] antialiased">
        <Navbar />
        <main className="pt-14">{children}</main>
      </body>
    </html>
  );
}
