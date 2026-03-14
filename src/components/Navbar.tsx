'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 navbar-glass">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-14 gap-4 sm:gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="relative">
            <span className="text-[#E10600] font-black text-xl tracking-tight">F1</span>
            <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[#E10600] animate-pulse-dot" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Live</span>
        </Link>

        {/* Separator - hidden on small mobile */}
        <div className="w-px h-5 bg-white/10 hidden sm:block" />

        {/* Desktop Nav links */}
        <div className="hidden md:flex items-center gap-1">
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
            className="text-[11px] text-[#555] hover:text-[#888] transition-colors uppercase tracking-wider font-medium hidden sm:block"
          >
            API
          </Link>
          <span className="text-[10px] text-[#333] hidden sm:inline">
            by <span className="text-[#E10600] font-bold">FOMO</span>
          </span>
          
          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            <span className="text-2xl text-white">☰</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-[#0a0a0a] border-b border-white/10 shadow-2xl">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActive 
                      ? 'bg-[#E10600]/15 text-white border border-[#E10600]/30' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.dot && (
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#E10600] animate-pulse-dot' : 'bg-[#444]'}`} />
                  )}
                  {!link.dot && <span className="w-2 h-2 rounded-full bg-transparent" />}
                  {link.label}
                </Link>
              );
            })}
            
            {/* Mobile-only footer links */}
            <div className="border-t border-white/10 mt-4 pt-4">
              <Link
                href="/api/docs"
                target="_blank"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-transparent" />
                API Docs
              </Link>
              <div className="px-4 py-3 text-xs text-[#333]">
                by <span className="text-[#E10600] font-bold">FOMO</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
