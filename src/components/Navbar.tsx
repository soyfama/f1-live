'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/live',       label: 'Live',       dot: true },
  { href: '/analytics',  label: 'Analytics',  dot: false },
  { href: '/strategy',   label: 'Strategy',   dot: false },
  { href: '/telemetry',  label: 'Telemetry',  dot: false },
  { href: '/standings',  label: 'Standings',  dot: false },
  { href: '/calendar',   label: 'Calendar',   dot: false },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 navbar-glass">
      <div className="max-w-screen-2xl mx-auto px-4 flex items-center h-14 gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="relative">
            <span className="text-[#E10600] font-black text-xl tracking-tight">F1</span>
            <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[#E10600] animate-pulse-dot" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Live</span>
        </Link>

        {/* Separator */}
        <div className="w-px h-5 bg-white/10" />

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`navbar-link flex items-center gap-2 ${isActive ? 'active' : ''}`}
              >
                {link.dot && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#E10600] animate-pulse-dot' : 'bg-[#444]'}`} />
                )}
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/api/docs"
            target="_blank"
            className="text-[11px] text-[#555] hover:text-[#888] transition-colors uppercase tracking-wider font-medium"
          >
            API
          </Link>
          <span className="text-[10px] text-[#333]">
            by <span className="text-[#E10600] font-bold">FOMO</span>
          </span>
        </div>
      </div>
    </nav>
  );
}
