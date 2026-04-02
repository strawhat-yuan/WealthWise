import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Holding, PerformanceData } from '../types/portfolio';

// Performance calculation helper will be logic-based from now on.

interface PortfolioContextType {
  holdings: Holding[];
  closedHoldings: Holding[];
  performanceData: PerformanceData[];
  totalRealizedPnL: number;
  role: 'user' | 'admin';
  isAdmin: boolean;
  setRole: (role: 'user' | 'admin') => void;
  addHolding: (holding: Omit<Holding, 'id'>, customTs?: string) => void;
  updateHolding: (id: string, holding: Omit<Holding, 'id'>) => void;
  removeHolding: (ticker: string) => Promise<boolean>;
  removeRealizedProfit: (ticker: string) => Promise<boolean>;
  deleteTrade: (id: number) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
  latestPricesMap: Record<string, any>;
  stockMetadata: Record<string, any>;
  trades: any[];
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<'user' | 'admin'>(() => {
    return (localStorage.getItem('wealthwise_role') as any) || 'user';
  });
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [closedHoldings, setClosedHoldings] = useState<Holding[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [totalRealizedPnL, setTotalRealizedPnL] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestPricesMap, setLatestPricesMap] = useState<Record<string, any>>({});
  const [stockMetadata, setStockMetadata] = useState<Record<string, any>>({});
  const [trades, setTrades] = useState<any[]>([]);

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
      const tradesSummaryMap: Record<string, { totalSoldQty: number, totalSoldValue: number }> = {};
      const costBasisMap: Record<string, { qty: number, totalCost: number, realized: number }> = {};

      trades.forEach((trade: any) => {
        const t = trade.ticker;
        if (!costBasisMap[t]) costBasisMap[t] = { qty: 0, totalCost: 0, realized: 0 };
        if (!tradesSummaryMap[t]) tradesSummaryMap[t] = { totalSoldQty: 0, totalSoldValue: 0 };
        
        const state = costBasisMap[t];
        const summary = tradesSummaryMap[t];

        if (trade.tradeType === 'BUY') {
          state.qty += trade.quantity;
          state.totalCost += trade.amount;
        } else if (trade.tradeType === 'SELL') {
          summary.totalSoldQty += trade.quantity; // Sum of all shares sold
          summary.totalSoldValue += trade.amount; // Sum of all sell values (price * quantity)
          
          if (state.qty > 0) {
            const avgCostPerShare = state.totalCost / state.qty;
            const realizedVal = (trade.price - avgCostPerShare) * trade.quantity;
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
      
      // Update total realized P&L to be the sum of all sell values as requested
      const totalSellValue = Object.values(tradesSummaryMap).reduce((sum, s) => sum + s.totalSoldValue, 0);
      setTotalRealizedPnL(totalSellValue);

      // Fetch latest prices using the dynamic endpoint previously built
      const priceRes = await fetch('/api/stockprice/market/latest');
      if (!priceRes.ok) throw new Error('Failed to fetch stock prices from backend');
      const latestPricesMap = await priceRes.json();

      // --- NEW: Fetch Stock Metadata (Sector, Market Cap, Name) ---
      const infoRes = await fetch('/api/stockinfo/map');
      const stockInfoMap = infoRes.ok ? await infoRes.json() : {};

      // --- NEW: Fetch Realized Summary from DB ---
      const realizedRes = await fetch('/api/stocktrade/realized');
      const realizedHistory = realizedRes.ok ? await realizedRes.json() : [];

      // Map DB models to Frontend Holding interface
      const mappedHoldings: Holding[] = dbHoldings.map((h: any) => {
        const rawData = latestPricesMap[h.ticker];
        // Defensive check: Handle both raw number (legacy/fallback) and DTO object
        const cPrice = rawData && typeof rawData === 'object' ? (rawData.price || 100.0) : (typeof rawData === 'number' ? rawData : 100.0);
        const changePct = rawData && typeof rawData === 'object' ? (rawData.changePercent || 0) : 0;
        
        const info = stockInfoMap[h.ticker] || {};
        
        let pPrice = cPrice * 0.8;
        let netGain = 0;
        let tSoldValue = 0;
        const summary = tradesSummaryMap[h.ticker];
        if (summary) {
            tSoldValue = summary.totalSoldValue;
        }

        const cb = costBasisMap[h.ticker];
        if (cb) {
            netGain = cb.realized;
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
          realizedPnL: netGain, // Back to actual Profit/Loss
          totalSoldValue: tSoldValue, // New field for Total Sell Price
          purchaseDate: h.createdAt ? new Date(h.createdAt).toISOString().split('T')[0] : '2025-01-01',
          sector: info.sector || 'Others',
          marketCap: info.marketCap || 0,
          changePercent: changePct
        };
      });

      setHoldings(mappedHoldings);
      setTrades(trades);

      // --- UPDATED: Map Realized History from DB instead of local calculation ---
      const closedHoldings: Holding[] = realizedHistory.map((rh: any) => {
          const t = rh.ticker;
          const info = stockInfoMap[t] || {};
          const rawData = latestPricesMap[t];
          const cPrice = rawData && typeof rawData === 'object' ? (rawData.price || 100.0) : (typeof rawData === 'number' ? rawData : 100.0);
          const changePct = rawData && typeof rawData === 'object' ? (rawData.changePercent || 0) : 0;
          
          const summary = tradesSummaryMap[t] || { totalSoldQty: 0, totalSoldValue: 0 };
          const cb = costBasisMap[t];
          
          return {
            id: 'realized-' + t,
            ticker: t,
            name: info.name || t + ' Stock',
            type: 'stock' as const,
            quantity: summary.totalSoldQty, // Cumulative total SOLD
            currentPrice: cPrice,
            purchasePrice: 0, // Not applicable for realized summary
            realizedPnL: cb ? cb.realized : 0, // Actual Profit/Loss
            totalSoldValue: summary.totalSoldValue, // Cumulative total sell value
            purchaseDate: '2025-01-01', // Dynamic calculation if needed
            sector: info.sector || 'Others',
            marketCap: info.marketCap || 0,
            changePercent: changePct
          };
      });

      setClosedHoldings(closedHoldings);
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

      // 3. Define timeline (Daily from first trade to now)
      const performancePoints: PerformanceData[] = [];
      if (trades.length > 0) {
          const firstTradeTs = new Date(trades[0].ts);
          firstTradeTs.setHours(0, 0, 0, 0); // Start of first day
          
          const now = new Date();
          const todayStr = now.toISOString().split('T')[0];
          let lastDateStr = "";

          // Loop through each day
          for (let d = new Date(firstTradeTs); d <= now; d.setDate(d.getDate() + 1)) {
              const checkPoint = new Date(d);
              checkPoint.setHours(23, 59, 59, 999); // Look at data as of END of day
              
              let dailyValue = 0;
              const dateStr = checkPoint.toISOString().split('T')[0];
              lastDateStr = dateStr;
              
              // Calculate holding quantities as of date 'checkPoint'
              uniqueTickers.forEach(ticker => {
                  let qtyAtTime = 0;
                  trades.forEach((trade: any) => {
                      if (trade.ticker === ticker && new Date(trade.ts) <= checkPoint) {
                          qtyAtTime += trade.tradeType === 'BUY' ? trade.quantity : -trade.quantity;
                      }
                  });
                  
                  if (qtyAtTime > 0) {
                      const history = priceHistoryMap[ticker] || [];
                      let priceAtTime = 0;
                      for (let i = history.length - 1; i >= 0; i--) {
                          if (new Date(history[i].ts) <= checkPoint) {
                              priceAtTime = history[i].close;
                              break;
                          }
                      }
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

          // 4. Force last point to match CURRENT total value if not already there
          const currentTotalValue = mappedHoldings.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);
          if (lastDateStr !== todayStr) {
              performancePoints.push({
                  date: todayStr,
                  value: Math.round(currentTotalValue)
              });
          } else if (performancePoints.length > 0) {
              // Update the last point to be accurately current
              performancePoints[performancePoints.length - 1].value = Math.round(currentTotalValue);
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
        alert(`Failed to remove holding (Ticker: ${ticker})\nStatus: ${res.status}\nDetails: ${errorText || 'None'}`);
        return false;
      }
    } catch (e: any) {
      console.error('[Portfolio] Error removing holding:', e);
      alert(`Network error: Could not remove record ${ticker}\n${e.message}`);
      return false;
    }
  };

  const removeRealizedProfit = async (ticker: string) => {
    console.log(`[Portfolio] Attempting to remove realized profit for: ${ticker}`);
    try {
      const res = await fetch(`/api/stocktrade/realized/${ticker}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        console.log(`[Portfolio] Successfully removed realized profit: ${ticker}`);
        await fetchData();
        return true;
      } else {
        const errorText = await res.text();
        console.error(`[Portfolio] Failed to remove realized profit: ${res.status}`, errorText);
        alert(`Failed to remove realized profit (Ticker: ${ticker})\nStatus: ${res.status}\nDetails: ${errorText || 'None'}`);
        return false;
      }
    } catch (e: any) {
      console.error('[Portfolio] Error removing realized profit:', e);
      alert(`Network error: Could not remove record ${ticker}\n${e.message}`);
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
        alert(`Failed to delete trade record (#${id})\nServer status: ${res.status}\nDetails: ${errorText || 'None'}`);
        return false;
      }
    } catch (e: any) {
      console.error('[Portfolio] Error deleting trade:', e);
      alert(`Network error: Could not delete trade record ${id}\n${e.message}`);
      return false;
    }
  };

  return (
    <PortfolioContext.Provider
      value={{
        holdings,
        closedHoldings,
        performanceData,
        totalRealizedPnL,
        role,
        isAdmin,
        setRole,
        addHolding,
        updateHolding,
        removeHolding,
        removeRealizedProfit,
        deleteTrade,
        isLoading,
        error,
        refreshData,
        latestPricesMap,
        stockMetadata,
        trades
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