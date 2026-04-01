import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Holding, PerformanceData } from '../types/portfolio';

// Mock performance data
const generatePerformanceData = (): PerformanceData[] => {
  const data: PerformanceData[] = [];
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');
  let currentValue = 35000;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
    const change = (Math.random() - 0.45) * 1000;
    currentValue += change;
    data.push({
      date: d.toISOString().split('T')[0],
      value: Math.round(currentValue),
    });
  }

  return data;
};

interface PortfolioContextType {
  holdings: Holding[];
  performanceData: PerformanceData[];
  addHolding: (holding: Omit<Holding, 'id'>) => void;
  updateHolding: (id: string, holding: Omit<Holding, 'id'>) => void;
  removeHolding: (id: string) => void;
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [performanceData] = useState<PerformanceData[]>(generatePerformanceData());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch user's holdings
      const holdingRes = await fetch('/api/stockholding/list');
      if (!holdingRes.ok) throw new Error('Failed to fetch holdings from backend');
      const dbHoldings = await holdingRes.json();

      // Fetch latest prices (we pick 2025-10-30 as the "latest" known valid date per SQL dump)
      const priceRes = await fetch('/api/stockprice/date/2025-10-30');
      if (!priceRes.ok) throw new Error('Failed to fetch stock prices from backend');
      const latestPrices = await priceRes.json();

      // Create a map for quick price lookup
      const priceMap: Record<string, number> = {};
      latestPrices.forEach((p: any) => {
        if (p.ticker) {
          priceMap[p.ticker] = parseFloat(p.close);
        }
      });

      // Map DB models to Frontend Holding interface
      const mappedHoldings: Holding[] = dbHoldings.map((h: any) => {
        const cPrice = priceMap[h.ticker] || 100.0;
        return {
          id: h.id.toString(),
          ticker: h.ticker,
          name: h.ticker + ' Stock', // Placeholder name
          type: 'stock',
          quantity: h.quantity,
          currentPrice: cPrice,
          purchasePrice: cPrice * 0.8, // mockup purchase price to show some gain
          purchaseDate: h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : '2025-01-01'
        };
      });

      setHoldings(mappedHoldings);
    } catch (err: any) {
      setError(err.message || 'An error occurred fetching portfolio data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refreshData = () => {
    fetchData();
  };

  const addHolding = async (holding: Omit<Holding, 'id'>) => {
    try {
      const res = await fetch('/api/stockholding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: holding.ticker, quantity: holding.quantity })
      });
      if (res.ok) {
        // Also record a BUY trade for this addition
        await fetch('/api/stocktrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker: holding.ticker,
            tradeType: 'BUY',
            price: holding.currentPrice,
            quantity: holding.quantity,
            amount: holding.currentPrice * holding.quantity,
            ts: new Date().toISOString()
          })
        });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateHolding = async (id: string, holding: Omit<Holding, 'id'>) => {
    try {
      const res = await fetch('/api/stockholding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(id), ticker: holding.ticker, quantity: holding.quantity })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeHolding = async (id: string) => {
    try {
      const res = await fetch(`/api/stockholding/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PortfolioContext.Provider
      value={{
        holdings,
        performanceData,
        addHolding,
        updateHolding,
        removeHolding,
        isLoading,
        error,
        refreshData
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};