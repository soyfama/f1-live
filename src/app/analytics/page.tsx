import AnalyticsClient from './AnalyticsClient';

export const metadata = {
  title: 'Analytics — F1 Live',
};

export default function AnalyticsPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex">
      <AnalyticsClient />
    </div>
  );
}
