import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'F1 Live — Real-time Timing & Strategy',
  description: 'F1 live timing, analytics, race strategy simulator, telemetry and calendar powered by OpenF1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0e1a] text-gray-100">
        <Navbar />
        <main className="pt-14">{children}</main>
      </body>
    </html>
  );
}
