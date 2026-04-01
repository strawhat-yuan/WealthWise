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
  totalRealizedPnL: number;
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
  const [totalRealizedPnL, setTotalRealizedPnL] = useState<number>(0);
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

      // Fetch trades to compute cost basis and Realized P&L
      const tradeRes = await fetch('/api/stocktrade/list');
      if (!tradeRes.ok) throw new Error('Failed to fetch trades from backend');
      const trades = await tradeRes.json();

      // Compute Realized P&L and Moving Avg Cost
      // Sort trades historically
      trades.sort((a: any, b: any) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

      let realizedPnL = 0;
      const costBasisMap: Record<string, { qty: number, totalCost: number, realized: number }> = {};

      trades.forEach((trade: any) => {
        const t = trade.ticker;
        if (!costBasisMap[t]) costBasisMap[t] = { qty: 0, totalCost: 0, realized: 0 };
        const state = costBasisMap[t];

        if (trade.tradeType === 'BUY') {
          state.qty += trade.quantity;
          state.totalCost += trade.amount;
        } else if (trade.tradeType === 'SELL') {
          if (state.qty > 0) {
            const avgCostPerShare = state.totalCost / state.qty;
            const realizedVal = (trade.price - avgCostPerShare) * trade.quantity;
            realizedPnL += realizedVal;
            state.realized += realizedVal;

            state.qty -= trade.quantity;
            state.totalCost -= avgCostPerShare * trade.quantity;
            if (state.qty <= 0) {
              state.qty = 0;
              state.totalCost = 0;
            }
          }
        }
      });
      setTotalRealizedPnL(realizedPnL);

      // Fetch latest prices using the dynamic endpoint previously built
      const priceRes = await fetch('/api/stockprice/market/latest');
      if (!priceRes.ok) throw new Error('Failed to fetch stock prices from backend');
      const latestPrices = await priceRes.json();

      // Map DB models to Frontend Holding interface
      const mappedHoldings: Holding[] = dbHoldings.map((h: any) => {
        const cPrice = latestPrices[h.ticker] || 100.0;
        
        let pPrice = cPrice * 0.8;
        let tRealized = 0;
        const cb = costBasisMap[h.ticker];
        if (cb) {
            tRealized = cb.realized;
            if (cb.qty > 0) {
                pPrice = cb.totalCost / cb.qty; // Accurate historical cost basis!
            }
        }

        return {
          id: h.id.toString(),
          ticker: h.ticker,
          name: h.ticker + ' Stock', // Placeholder name
          type: 'stock',
          quantity: h.quantity,
          currentPrice: cPrice,
          purchasePrice: pPrice,
          realizedPnL: tRealized,
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
      const isBuy = holding.quantity > 0;
      const absQty = Math.abs(holding.quantity);

      const res = await fetch('/api/stockholding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: holding.ticker, quantity: holding.quantity })
      });
      if (res.ok) {
        // Also record a BUY or SELL trade for this action
        await fetch('/api/stocktrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker: holding.ticker,
            tradeType: isBuy ? 'BUY' : 'SELL',
            price: holding.currentPrice,
            quantity: absQty,
            amount: holding.currentPrice * absQty,
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
        totalRealizedPnL,
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