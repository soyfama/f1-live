import Link from 'next/link';

const FEATURES = [
  {
    href: '/live',
    icon: '●',
    iconColor: '#E10600',
    title: 'Live Timing',
    desc: 'Real-time position tracking, gaps, sectors and tyre data updated every 2 seconds.',
    badge: 'LIVE',
  },
  {
    href: '/analytics',
    icon: '◈',
    iconColor: '#3671C6',
    title: 'Analytics',
    desc: 'Driver/team performance, long stints, best sectors and speed trap data.',
    badge: null,
  },
  {
    href: '/strategy',
    icon: '◎',
    iconColor: '#FF8000',
    title: 'Strategy Simulator',
    desc: 'Interactive race strategy simulator with pit stop optimization and degradation models.',
    badge: null,
  },
  {
    href: '/telemetry',
    icon: '◐',
    iconColor: '#00D2BE',
    title: 'Telemetry',
    desc: 'Lap-by-lap speed, throttle, brake comparison between drivers.',
    badge: null,
  },
  {
    href: '/calendar',
    icon: '◷',
    iconColor: '#BF00FF',
    title: 'Calendar',
    desc: 'Full season schedule with countdowns and session times in your timezone.',
    badge: null,
  },
];

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-6 py-12">
      {/* Hero */}
      <div className="max-w-2xl w-full text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-5">
          <span className="text-[#e10600] font-black text-6xl tracking-tighter">F1</span>
          <span className="text-white font-bold text-6xl tracking-tighter">Live</span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#E10600] animate-pulse-dot ml-1 mt-1 self-start" />
        </div>
        <p className="text-lg text-[#9ca3af] mt-2">
          Real-time Formula 1 data powered by OpenF1 API
        </p>
        <p className="text-sm text-[#4b5563] mt-1 font-mono">
          Live timing · Strategy simulation · Telemetry analysis
        </p>
      </div>

      {/* Feature grid */}
      <div className="max-w-4xl w-full mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.slice(0, 3).map((f) => (
            <FeatureCard key={f.href} feature={f} />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 lg:max-w-[calc(66.66%)] lg:mx-auto">
          {FEATURES.slice(3).map((f) => (
            <FeatureCard key={f.href} feature={f} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/live"
        className="inline-flex items-center gap-2.5 bg-[#e10600] hover:bg-[#c00500] text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-lg shadow-[#e10600]/20"
      >
        <span className="w-2 h-2 rounded-full bg-white animate-pulse-fast" />
        Go Live
      </Link>

      <p className="mt-8 text-xs text-[#374151]">
        Data provided by{' '}
        <a href="https://openf1.org" target="_blank" rel="noopener" className="hover:text-[#6b7280] underline transition-colors">
          OpenF1
        </a>
        {' '}— Not affiliated with Formula 1
      </p>
    </div>
  );
}

function FeatureCard({ feature }: { feature: typeof FEATURES[0] }) {
  return (
    <Link
      href={feature.href}
      className="group bg-[#0d1120] border border-[#1e2538] rounded-xl p-5 hover:border-[#2a3040] hover:bg-[#111827] transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl font-bold" style={{ color: feature.iconColor }}>{feature.icon}</span>
        {feature.badge && (
          <span className="text-[9px] bg-[#E10600]/15 text-[#E10600] border border-[#E10600]/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse-dot">
            {feature.badge}
          </span>
        )}
      </div>
      <h3 className="text-white font-semibold text-base mb-1.5 group-hover:text-[#e10600] transition-colors">
        {feature.title}
      </h3>
      <p className="text-[#6b7280] text-sm leading-relaxed">{feature.desc}</p>
    </Link>
  );
}
