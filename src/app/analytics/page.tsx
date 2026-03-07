import AnalyticsClient from './AnalyticsClient';

export const metadata = {
  title: 'Analytics — F1 Live',
};

export default function AnalyticsPage() {
  return (
    <div className="max-w-screen-2xl mx-auto">
      <AnalyticsClient />
    </div>
  );
}
