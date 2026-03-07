// StockDetail page stub
import { useParams } from 'react-router-dom';

export function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{ticker?.toUpperCase()}</h1>
      <p className="text-gray-500">TODO: QuoteCard, CandlestickChart, Indicators, Fundamentals, News.</p>
    </div>
  );
}
