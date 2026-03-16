'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, TrendingUp, Users, MessageSquare, LayoutDashboard, Lock } from 'lucide-react';

const FANTASY_LINKS = [
  { href: '/fantasy', label: 'Overview', icon: LayoutDashboard },
  { href: '/fantasy/live', label: 'Live Points', icon: Trophy },
  { href: '/fantasy/prices', label: 'Prices', icon: TrendingUp },
  { href: '/fantasy/team', label: 'Team', icon: Users },
  { href: '/fantasy/assistant', label: 'Assistant', icon: MessageSquare },
];

export default function FantasySubNav() {
  const pathname = usePathname();
  const isAdminPage = pathname === '/fantasy/admin';
  
  return (
    <div className="sticky top-14 z-40 bg-[#0D0D14] border-b border-[rgba(255,255,255,0.07)]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 py-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <span className="text-[#E8002D] font-bold text-sm mr-3 shrink-0 hidden sm:block">
            🏁 FANTASY
          </span>
          {FANTASY_LINKS.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[rgba(232,0,45,0.12)] text-white'
                    : 'text-[#7878A0] hover:text-white hover:bg-[#1C1C2E]'
                }`}
              >
                <Icon size={14} className="shrink-0" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
          {/* Admin link - solo icono visible siempre */}
          <Link
            href="/fantasy/admin"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0 ml-auto ${
              isAdminPage
                ? 'bg-[rgba(232,0,45,0.12)] text-white'
                : 'text-[#7878A0] hover:text-white hover:bg-[#1C1C2E]'
            }`}
            title="Admin"
          >
            <Lock size={14} className="shrink-0" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
