'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, TrendingUp, Users, MessageSquare, LayoutDashboard, Wrench } from 'lucide-react';

const FANTASY_LINKS = [
  { href: '/fantasy', label: 'Overview', icon: LayoutDashboard },
  { href: '/fantasy/live', label: 'Live Points', icon: Trophy },
  { href: '/fantasy/prices', label: 'Prices', icon: TrendingUp },
  { href: '/fantasy/team', label: 'Team', icon: Users },
  { href: '/fantasy/assistant', label: 'Assistant', icon: MessageSquare },
];

export default function FantasyTeamPage() {
  const pathname = usePathname();
  
  return (
    <div className="pt-14">
      {/* Fantasy Sub-Navbar */}
      <div className="sticky top-14 z-40 bg-[#0D0D14] border-b border-[rgba(255,255,255,0.07)]">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 py-2 overflow-x-auto">
            <span className="text-[#E8002D] font-bold text-sm mr-4 shrink-0">
              🏁 FANTASY
            </span>
            {FANTASY_LINKS.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-[rgba(232,0,45,0.12)] text-white'
                      : 'text-[#7878A0] hover:text-white hover:bg-[#1C1C2E]'
                  }`}
                >
                  <Icon size={14} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="text-[#E8002D]" size={24} />
              Team Builder
            </h1>
            <p className="text-sm text-[#7878A0] mt-1">
              Build your fantasy team within the $100M budget
            </p>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="f1-card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[rgba(232,0,45,0.12)] flex items-center justify-center mb-4">
              <Wrench className="text-[#E8002D]" size={32} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Coming Soon</h2>
            <p className="text-[#7878A0] max-w-md">
              The Team Builder is under construction. You'll be able to drag & drop drivers, 
              optimize your squad, and track your fantasy team's performance.
            </p>
            <Link 
              href="/fantasy/assistant"
              className="mt-6 px-6 py-2 bg-[#E8002D] text-white rounded-lg font-medium hover:bg-[#B80024] transition-colors"
            >
              Ask Pitwall AI for Team Advice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
