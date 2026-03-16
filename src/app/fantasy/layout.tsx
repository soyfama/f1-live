import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'F1 Fantasy 2026 | Live Points & Team Builder',
  description: 'F1 Fantasy points simulator, price tracker, and AI assistant for the 2026 season',
};

export default function FantasyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0D0D14]">
      {children}
    </div>
  );
}
