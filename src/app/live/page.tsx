import LiveTimingClient from './LiveTimingClient';

export const metadata = {
  title: 'Live Timing — F1 Live',
};

export default function LivePage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <LiveTimingClient />
    </div>
  );
}
