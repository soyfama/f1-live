import StrategyClient from './StrategyClient';

export const metadata = {
  title: 'Race Strategy Simulator — F1 Live',
};

export default function StrategyPage() {
  return (
    <div className="max-w-screen-2xl mx-auto">
      <StrategyClient />
    </div>
  );
}
