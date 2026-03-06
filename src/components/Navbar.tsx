'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/live',      label: 'Live',      dot: true },
  { href: '/analytics', label: 'Analytics', dot: false },
  { href: '/strategy',  label: 'Strategy',  dot: false },
  { href: '/telemetry', label: 'Telemetry', dot: false },
  { href: '/calendar',  label: 'Calendar',  dot: false },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a]/97 backdrop-blur-md border-b border-[#1e2538]">
      <div className="max-w-screen-2xl mx-auto px-4 flex items-center h-12 gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0 group">
          <span className="text-[#E10600] font-black text-lg tracking-tight">F1</span>
          <span className="text-white font-bold text-lg tracking-tight">Live</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#E10600] animate-pulse-dot ml-0.5" />
        </Link>

        {/* Separator */}
        <div className="w-px h-4 bg-[#1e2538]" />

        {/* Nav links */}
        <div className="flex items-center gap-0.5">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`navbar-link flex items-center gap-1.5 ${isActive ? 'active' : ''}`}
              >
                {link.dot && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#00FF00]' : 'bg-[#374151]'}`} />
                )}
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/api/docs"
            target="_blank"
            className="text-[11px] text-[#4b5563] hover:text-[#6b7280] transition-colors"
          >
            API Docs
          </Link>
          <span className="text-[10px] text-[#374151]">
            by <span className="text-[#4b5563]">FOMO</span>
          </span>
        </div>
      </div>
    </nav>
  );
}
