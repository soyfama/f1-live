import Link from 'next/link';

const FEATURES = [
  {
    href: '/live',
    icon: '🔴',
    title: 'Live Timing',
    desc: 'Real-time position tracking, gaps, sectors and tyre data updated every 2 seconds.',
  },
  {
    href: '/analytics',
    icon: '📊',
    title: 'Analytics',
    desc: 'Driver/team performance, long stints, best sectors and speed trap data.',
  },
  {
    href: '/strategy',
    icon: '🧠',
    title: 'Strategy Simulator',
    desc: 'Interactive race strategy simulator with pit stop optimization and degradation models.',
  },
  {
    href: '/telemetry',
    icon: '📡',
    title: 'Telemetry',
    desc: 'Lap-by-lap speed, throttle, brake comparison between drivers.',
  },
  {
    href: '/calendar',
    icon: '🗓️',
    title: 'Calendar',
    desc: 'Full season schedule with countdowns and session times in your timezone.',
  },
];

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-4xl w-full text-center mb-12">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="text-[#e10600] font-black text-5xl">F1</span>
          <span className="text-white font-bold text-5xl">Live</span>
        </div>
        <p className="text-xl text-gray-400 mt-3">
          Real-time Formula 1 data powered by OpenF1 API
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Live timing · Strategy simulation · Telemetry analysis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6 hover:border-[#e10600]/40 hover:bg-[#1f2535] transition-all group"
          >
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-[#e10600] transition-colors">
              {f.title}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/live"
          className="inline-flex items-center gap-2 bg-[#e10600] hover:bg-[#c00500] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse-fast" />
          Go Live
        </Link>
      </div>

      <p className="mt-8 text-xs text-gray-600">
        Data provided by{' '}
        <a href="https://openf1.org" target="_blank" rel="noopener" className="hover:text-gray-400 underline">
          OpenF1
        </a>
        {' '}— Not affiliated with Formula 1
      </p>
    </div>
  );
}
