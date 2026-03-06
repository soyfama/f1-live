import LiveTimingClient from './LiveTimingClient';

export const metadata = {
  title: 'Live Timing — F1 Live',
};

export default function LivePage() {
  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-6">
      <LiveTimingClient />
    </div>
  );
}
