import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Holding, PerformanceData } from '../types/portfolio';

// Performance calculation helper will be logic-based from now on.

interface PortfolioContextType {
  holdings: Holding[];
  performanceData: PerformanceData[];
  totalRealizedPnL: number;
  role: 'user' | 'admin';
  isAdmin: boolean;
  setRole: (role: 'user' | 'admin') => void;
  addHolding: (holding: Omit<Holding, 'id'>, customTs?: string) => void;
  updateHolding: (id: string, holding: Omit<Holding, 'id'>) => void;
  removeHolding: (ticker: string) => Promise<boolean>;
  deleteTrade: (id: number) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
  latestPricesMap: Record<string, any>;
  stockMetadata: Record<string, any>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<'user' | 'admin'>(() => {
    return (localStorage.getItem('wealthwise_role') as any) || 'user';
  });
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [totalRealizedPnL, setTotalRealizedPnL] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestPricesMap, setLatestPricesMap] = useState<Record<string, any>>({});
  const [stockMetadata, setStockMetadata] = useState<Record<string, any>>({});

  const setRole = (newRole: 'user' | 'admin') => {
    setRoleState(newRole);
    localStorage.setItem('wealthwise_role', newRole);
  };

  const isAdmin = role === 'admin';

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
      const latestPricesMap = await priceRes.json();

      // --- NEW: Fetch Stock Metadata (Sector, Market Cap, Name) ---
      const infoRes = await fetch('/api/stockinfo/map');
      const stockInfoMap = infoRes.ok ? await infoRes.json() : {};

      // Map DB models to Frontend Holding interface
      const mappedHoldings: Holding[] = dbHoldings.map((h: any) => {
        const rawData = latestPricesMap[h.ticker];
        // Defensive check: Handle both raw number (legacy/fallback) and DTO object
        const cPrice = rawData && typeof rawData === 'object' ? (rawData.price || 100.0) : (typeof rawData === 'number' ? rawData : 100.0);
        const changePct = rawData && typeof rawData === 'object' ? (rawData.changePercent || 0) : 0;
        
        const info = stockInfoMap[h.ticker] || {};
        
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
          name: info.name || h.ticker + ' Stock',
          type: 'stock',
          quantity: h.quantity,
          currentPrice: cPrice,
          purchasePrice: pPrice,
          realizedPnL: tRealized,
          purchaseDate: h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : '2025-01-01',
          sector: info.sector || 'Others',
          marketCap: info.marketCap || 0,
          changePercent: changePct
        };
      });

      setHoldings(mappedHoldings);
      setLatestPricesMap(latestPricesMap);
      setStockMetadata(stockInfoMap);

      // --- NEW: Calculate Actual Portfolio Performance over time ---
      // 1. Collect all unique tickers from trades
      const uniqueTickers = Array.from(new Set(trades.map((t: any) => t.ticker))) as string[];
      
      // 2. Fetch all historical prices for involved tickers
      const priceHistoryMap: Record<string, any[]> = {};
      await Promise.all(uniqueTickers.map(async (t: string) => {
          const res = await fetch(`/api/stockprice/ticker/${t}`);
          if (res.ok) {
              const hist = await res.json();
              // Sort by date ascending
              hist.sort((a: any, b: any) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
              priceHistoryMap[t] = hist;
          }
      }));

      // 3. Define timeline (Weekly from first trade to now)
      const performancePoints: PerformanceData[] = [];
      if (trades.length > 0) {
          const firstTradeTs = new Date(trades[0].ts);
          const now = new Date();
          
          for (let d = new Date(firstTradeTs); d <= now; d.setDate(d.getDate() + 7)) {
              let dailyValue = 0;
              const dateStr = d.toISOString().split('T')[0];
              
              // Calculate holding quantities as of date 'd'
              uniqueTickers.forEach(ticker => {
                  let qtyAtTime = 0;
                  trades.forEach((trade: any) => {
                      if (trade.ticker === ticker && new Date(trade.ts) <= d) {
                          qtyAtTime += trade.tradeType === 'BUY' ? trade.quantity : -trade.quantity;
                      }
                  });
                  
                  if (qtyAtTime > 0) {
                      // Find price at or before date 'd'
                      const history = priceHistoryMap[ticker] || [];
                      let priceAtTime = 0;
                      // Find the latest price in history that is <= date 'd'
                      for (let i = history.length - 1; i >= 0; i--) {
                          if (new Date(history[i].ts) <= d) {
                              priceAtTime = history[i].close;
                              break;
                          }
                      }
                      // If no historical price found before this date, use the first available price
                      if (priceAtTime === 0 && history.length > 0) {
                          priceAtTime = history[0].close;
                      }
                      
                      dailyValue += qtyAtTime * priceAtTime;
                  }
              });
              
              performancePoints.push({
                  date: dateStr,
                  value: Math.round(dailyValue)
              });
          }
      }
      
      setPerformanceData(performancePoints);
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

  const addHolding = async (holding: Omit<Holding, 'id'>, customTs?: string) => {
    try {
      const isBuy = holding.quantity > 0;
      const absQty = Math.abs(holding.quantity);
      const tradeTime = customTs || new Date().toISOString();

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
            ts: tradeTime
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

  const removeHolding = async (ticker: string) => {
    console.log(`[Portfolio] Attempting to remove holding by Ticker: ${ticker}`);
    try {
      const res = await fetch(`/api/stockholding/ticker/${ticker}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        console.log(`[Portfolio] Successfully removed holding: ${ticker}`);
        await fetchData();
        return true;
      } else {
        const errorText = await res.text();
        console.error(`[Portfolio] Failed to remove holding: ${res.status}`, errorText);
        alert(`删除持仓失败 (Ticker: ${ticker})\n服务器状态: ${res.status}\n详情: ${errorText || '无'}`);
        return false;
      }
    } catch (e: any) {
      console.error('[Portfolio] Error removing holding:', e);
      alert(`网络错误: 无法删除记录 ${ticker}\n${e.message}`);
      return false;
    }
  };

  const deleteTrade = async (id: number) => {
    console.log(`[Portfolio] Attempting to delete trade: ${id}`);
    try {
      const res = await fetch(`/api/stocktrade/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        console.log(`[Portfolio] Successfully deleted trade: ${id}`);
        await fetchData();
        return true;
      } else {
        const errorText = await res.text();
        console.error(`[Portfolio] Failed to delete trade: ${res.status}`, errorText);
        alert(`删除交易记录失败 (#${id})\n服务器状态: ${res.status}\n详情: ${errorText || '无'}`);
        return false;
      }
    } catch (e: any) {
      console.error('[Portfolio] Error deleting trade:', e);
      alert(`网络错误: 无法删除交易记录 ${id}\n${e.message}`);
      return false;
    }
  };

  return (
    <PortfolioContext.Provider
      value={{
        holdings,
        performanceData,
        totalRealizedPnL,
        role,
        isAdmin,
        setRole,
        addHolding,
        updateHolding,
        removeHolding,
        deleteTrade,
        isLoading,
        error,
        refreshData,
        latestPricesMap,
        stockMetadata
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