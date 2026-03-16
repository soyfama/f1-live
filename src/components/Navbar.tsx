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
  { href: '/fantasy',    label: 'Fantasy',    dot: false, new: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#0D0D14] border-b border-[rgba(255,255,255,0.07)]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-full gap-4 sm:gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="relative">
            <span className="text-[#E8002D] font-black text-xl tracking-tight">F1</span>
            <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[#E8002D] animate-pulse-dot" />
          </div>
          <span className="text-[#EEEEF5] font-bold text-xl tracking-tight">Live</span>
        </Link>

        {/* Separator - hidden on small mobile */}
        <div className="w-px h-5 bg-[rgba(255,255,255,0.07)] hidden sm:block" />

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
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#E8002D] animate-pulse-dot' : 'bg-[#4A4A6A]'}`} />
                )}
                {link.label}
                {link.new && (
                  <span className="text-[10px] bg-[#E8002D] text-white px-1.5 py-0.5 rounded font-bold">NEW</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/api/docs"
            target="_blank"
            className="text-[11px] text-[#4A4A6A] hover:text-[#7878A0] transition-colors uppercase tracking-wider font-medium hidden sm:block"
          >
            API
          </Link>
          <span className="text-[10px] text-[#4A4A6A] hidden sm:inline">
            by <span className="text-[#E8002D] font-bold">FOMO</span>
          </span>
          
          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[#1C1C2E] transition-colors"
            aria-label="Toggle menu"
          >
            <span className="text-2xl text-[#EEEEF5]">☰</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-[#0D0D14] border-b border-[rgba(255,255,255,0.07)] shadow-2xl">
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
                      ? 'bg-[rgba(232,0,45,0.12)] text-[#EEEEF5] border border-[rgba(232,0,45,0.3)]' 
                      : 'text-[#7878A0] hover:text-[#EEEEF5] hover:bg-[#1C1C2E]'
                  }`}
                >
                  {link.dot && (
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#E8002D] animate-pulse-dot' : 'bg-[#4A4A6A]'}`} />
                  )}
                  {!link.dot && <span className="w-2 h-2 rounded-full bg-transparent" />}
                  <span className="flex items-center gap-2">
                    {link.label}
                    {link.new && (
                      <span className="text-[10px] bg-[#E8002D] text-white px-1.5 py-0.5 rounded font-bold">NEW</span>
                    )}
                  </span>
                </Link>
              );
            })}
            
            {/* Mobile-only footer links */}
            <div className="border-t border-[rgba(255,255,255,0.07)] mt-4 pt-4">
              <Link
                href="/api/docs"
                target="_blank"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-[#4A4A6A] hover:text-[#7878A0] hover:bg-[#1C1C2E] transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-transparent" />
                API Docs
              </Link>
              <div className="px-4 py-3 text-xs text-[#4A4A6A]">
                by <span className="text-[#E8002D] font-bold">FOMO</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
