'use client';

import Link from 'next/link';
import { Trophy, TrendingUp, Users, MessageSquare, LayoutDashboard } from 'lucide-react';

const FANTASY_LINKS = [
  { href: '/fantasy', label: 'Overview', icon: LayoutDashboard },
  { href: '/fantasy/live', label: 'Live Points', icon: Trophy },
  { href: '/fantasy/prices', label: 'Prices', icon: TrendingUp },
  { href: '/fantasy/team', label: 'Team', icon: Users },
  { href: '/fantasy/assistant', label: 'Assistant', icon: MessageSquare },
];

export default function FantasyHubPage() {
  return (
    <div>
      {/* Hero Section */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="hero-gradient rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                F1 Fantasy <span className="text-[#E8002D]">2026</span>
              </h1>
              <p className="text-[#7878A0] text-lg">
                Live points simulator, price tracker & AI assistant
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-[#7878A0]">Budget</div>
                <div className="text-2xl font-bold text-white">$100M</div>
              </div>
              <div className="w-px h-12 bg-[rgba(255,255,255,0.07)]" />
              <div className="text-right">
                <div className="text-sm text-[#7878A0]">Drivers</div>
                <div className="text-2xl font-bold text-white">22</div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/fantasy/live" className="f1-card group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(232,0,45,0.12)] flex items-center justify-center">
                <Trophy className="text-[#E8002D]" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white group-hover:text-[#E8002D] transition-colors">Live Points</h3>
                <p className="text-xs text-[#7878A0]">Real-time scoring</p>
              </div>
            </div>
            <p className="text-sm text-[#7878A0]">
              Track fantasy points during races and qualifying sessions with live updates.
            </p>
          </Link>

          <Link href="/fantasy/prices" className="f1-card group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(0,255,68,0.12)] flex items-center justify-center">
                <TrendingUp className="text-[#00FF44]" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white group-hover:text-[#00FF44] transition-colors">Price Tracker</h3>
                <p className="text-xs text-[#7878A0]">Market trends</p>
              </div>
            </div>
            <p className="text-sm text-[#7878A0]">
              Monitor driver price changes, value scores, and market movements.
            </p>
          </Link>

          <Link href="/fantasy/team" className="f1-card group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(0,215,182,0.12)] flex items-center justify-center">
                <Users className="text-[#00D7B6]" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white group-hover:text-[#00D7B6] transition-colors">Team Builder</h3>
                <p className="text-xs text-[#7878A0]">Optimize squad</p>
              </div>
            </div>
            <p className="text-sm text-[#7878A0]">
              Build your fantasy team within the $100M budget with smart suggestions.
            </p>
          </Link>

          <Link href="/fantasy/assistant" className="f1-card group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[rgba(191,0,255,0.12)] flex items-center justify-center">
                <MessageSquare className="text-[#BF00FF]" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white group-hover:text-[#BF00FF] transition-colors">Assistant</h3>
                <p className="text-xs text-[#7878A0]">Pitwall AI</p>
              </div>
            </div>
            <p className="text-sm text-[#7878A0]">
              Get AI-powered advice on team selection, strategy, and value picks.
            </p>
          </Link>
        </div>

        {/* Current GP Banner */}
        <div className="f1-card border-l-4 border-l-[#E8002D]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-[#E8002D] uppercase tracking-wider mb-1">
                Current Season
              </div>
              <h2 className="text-xl font-bold text-white mb-1">F1 2026 Season</h2>
              <p className="text-sm text-[#7878A0]">
                24 races • New regulations • All drivers available
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00FF44] animate-pulse-dot" />
              <span className="text-sm text-[#00FF44] font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
