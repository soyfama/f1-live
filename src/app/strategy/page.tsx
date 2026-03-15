import StrategyClient from './StrategyClient';

export const metadata = {
  title: 'Race Strategy Simulator — F1 Live',
};

export default function StrategyPage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex">
      <StrategyClient />
    </div>
  );
}
