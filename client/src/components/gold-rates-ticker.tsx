import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetalRates {
  gold22k: number;
  gold18k: number;
  silver: number;
  lastUpdated: string;
}

export default function GoldRatesTicker() {
  const [rates, setRates] = useState<MetalRates>({
    gold22k: 6420.00,
    gold18k: 5265.00,
    silver: 74.50,
    lastUpdated: new Date().toLocaleTimeString()
  });

  // Simulate rate updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRates(prev => ({
        gold22k: prev.gold22k + (Math.random() - 0.5) * 20,
        gold18k: prev.gold18k + (Math.random() - 0.5) * 15,
        silver: prev.silver + (Math.random() - 0.5) * 2,
        lastUpdated: new Date().toLocaleTimeString()
      }));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const tickerItems = [
    { label: 'Gold 22K', price: rates.gold22k, unit: '₹/10g', trend: 'up' },
    { label: 'Gold 18K', price: rates.gold18k, unit: '₹/10g', trend: 'up' },
    { label: 'Silver', price: rates.silver, unit: '₹/1g', trend: 'down' },
    { label: 'Last Updated', price: rates.lastUpdated, unit: '', trend: null }
  ];

  return (
    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-2 overflow-hidden relative" data-testid="ticker-gold-rates">
      <div className="animate-scroll whitespace-nowrap">
        <div className="inline-flex items-center space-x-8">
          {tickerItems.map((item, index) => (
            <div key={index} className="inline-flex items-center space-x-2 min-w-max">
              <span className="font-semibold">{item.label}:</span>
              <span className="font-bold">
                {typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
              </span>
              <span className="text-sm">{item.unit}</span>
              {item.trend && (
                <div className="inline-flex items-center">
                  {item.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-300" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-300" />
                  )}
                </div>
              )}
            </div>
          ))}
          {/* Duplicate items for seamless scrolling */}
          {tickerItems.map((item, index) => (
            <div key={`dup-${index}`} className="inline-flex items-center space-x-2 min-w-max">
              <span className="font-semibold">{item.label}:</span>
              <span className="font-bold">
                {typeof item.price === 'number' ? item.price.toFixed(2) : item.price}
              </span>
              <span className="text-sm">{item.unit}</span>
              {item.trend && (
                <div className="inline-flex items-center">
                  {item.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-300" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-300" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}