import { useState, useEffect } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import {
  calculateHoldingValue,
  calculateHoldingCost,
  calculateHoldingGainLoss,
  calculateHoldingGainLossPercent,
  formatCurrency,
  formatPercent,
  formatMarketCap,
} from '../utils/portfolioUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Plus, Minus, Trash2, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Clock, Loader2, Check } from 'lucide-react';
import { HoldingsSkeleton } from '../components/HoldingsSkeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

type SortField = 'ticker' | 'name' | 'value' | 'gainLoss' | 'quantity' | 'price' | 'change' | 'dailyPnL' | null;
type MarketSortField = 'ticker' | 'name' | 'sector' | 'marketCap' | 'price' | 'change' | null;
type SortDirection = 'asc' | 'desc';

export default function Holdings() {
  const { holdings, closedHoldings, trades, removeHolding, removeRealizedProfit, addHolding, isAdmin, isLoading, error, latestPricesMap, stockMetadata } = usePortfolio();
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');

  const [marketSortField, setMarketSortField] = useState<MarketSortField>('ticker');
  const [marketSortDirection, setMarketSortDirection] = useState<SortDirection>('asc');
  const [historicalPrices, setHistoricalPrices] = useState<Record<string, number>>({});
  const [fetchingPrices, setFetchingPrices] = useState<Record<string, boolean>>({});

  // Trade Modal State
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedTradeTicker, setSelectedTradeTicker] = useState<string>('');
  const [tradeQty, setTradeQty] = useState<string>('');
  const [tradeDate, setTradeDate] = useState<string>('');

  // Deletion state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tickerToDelete, setTickerToDelete] = useState<string | null>(null);
  const [isValidationErrorOpen, setIsValidationErrorOpen] = useState(false);
  const [validationErrorMsg, setValidationErrorMsg] = useState('');

  // Chart state
  const [selectedChartTicker, setSelectedChartTicker] = useState<string | null>(null);
  const [isBuyVisibleInModal, setIsBuyVisibleInModal] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);

  const handleMarketSort = (field: MarketSortField) => {
    if (marketSortField === field) {
      setMarketSortDirection(marketSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setMarketSortField(field);
      setMarketSortDirection('desc');
    }
  };

  const availableTickers = Object.keys(latestPricesMap).sort((a, b) => {
    if (!marketSortField) return 0;
    let comparison = 0;
    const aData = latestPricesMap[a];
    const bData = latestPricesMap[b];
    const aPrice = termOrVal(aData, 'price');
    const bPrice = termOrVal(bData, 'price');
    const aChange = termOrVal(aData, 'changePercent');
    const bChange = termOrVal(bData, 'changePercent');
    const aMeta = stockMetadata[a] || {};
    const bMeta = stockMetadata[b] || {};

    switch (marketSortField) {
      case 'ticker': comparison = a.localeCompare(b); break;
      case 'name': comparison = (aMeta.name || a).localeCompare(bMeta.name || b); break;
      case 'sector': comparison = (aMeta.sector || '').localeCompare(bMeta.sector || ''); break;
      case 'marketCap': comparison = (aMeta.marketCap || 0) - (bMeta.marketCap || 0); break;
      case 'price': comparison = aPrice - bPrice; break;
      case 'change': comparison = aChange - bChange; break;
    }
    return marketSortDirection === 'asc' ? comparison : -comparison;
  });

  function termOrVal(data: any, field: 'price'|'changePercent') {
    if (data && typeof data === 'object') return data[field] || 0;
    return field === 'price' ? (typeof data === 'number' ? data : 0) : 0;
  }

  const getMarketSortIcon = (field: MarketSortField) => {
    if (marketSortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return marketSortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />
    );
  };

  // Show loading skeleton
  if (isLoading) {
    return <HoldingsSkeleton />;
  }

  // Show error message
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-500 mt-2">
              Please check your connection and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const displayData = activeTab === 'active' ? holdings.filter(h => Number(h.quantity) > 0) : closedHoldings;

  const sortedHoldings = [...displayData].sort((a, b) => {
    if (!sortField) return 0;
    let comparison = 0;
    const aValue = calculateHoldingValue(a);
    const bValue = calculateHoldingValue(b);
    const aChg = a.changePercent || 0;
    const bChg = b.changePercent || 0;

    switch (sortField) {
      case 'ticker': comparison = a.ticker.localeCompare(b.ticker); break;
      case 'name': comparison = a.name.localeCompare(b.name); break;
      case 'quantity': comparison = a.quantity - b.quantity; break;
      case 'price': comparison = a.currentPrice - b.currentPrice; break;
      case 'change': comparison = aChg - bChg; break;
      case 'value': comparison = aValue - bValue; break;
      case 'dailyPnL': {
          const aPnL = aValue * (aChg / (100 + aChg));
          const bPnL = bValue * (bChg / (100 + bChg));
          comparison = aPnL - bPnL;
          break;
      }
      case 'gainLoss': {
          const aVal = activeTab === 'active' ? calculateHoldingGainLoss(a) : (a.realizedPnL || 0);
          const bVal = activeTab === 'active' ? calculateHoldingGainLoss(b) : (b.realizedPnL || 0);
          comparison = aVal - bVal;
          break;
      }
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />
    );
  };

  const handleOpenTradeDialog = (ticker: string, type: 'BUY' | 'SELL') => {
    setSelectedTradeTicker(ticker);
    setTradeType(type);
    setTradeQty('');
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setTradeDate(localNow);
    setIsTradeDialogOpen(true);
    
    // Trigger price fetch for current date automatically
    handleDateChange(ticker, localNow);
  };

  const handleConfirmTrade = async () => {
    const qty = parseInt(tradeQty);
    if (!qty || qty <= 0) {
       alert("Please enter a valid quantity.");
       return;
    }

    const ticker = selectedTradeTicker;
    const isBuy = tradeType === 'BUY';
    const dateOnly = tradeDate.split('T')[0];
    
    // Use cached historical price or latest price
    const latestData = latestPricesMap[ticker];
    const latestPrice = typeof latestData === 'object' ? latestData.price : latestData;
    let executionPrice = historicalPrices[`${ticker}_${dateOnly}`] || latestPrice || 100;

    const tradeTs = new Date(tradeDate).toISOString();
    
    if (!isBuy) {
        const owned = holdings.find(h => h.ticker === ticker)?.quantity || 0;
        if (qty > owned) {
            setValidationErrorMsg(`Transaction Failed: You are trying to sell ${qty} shares of ${ticker}, but you only own ${owned} shares in your active portfolio.`);
            setIsValidationErrorOpen(true);
            return;
        }
    }

    await addHolding({
      ticker,
      name: ticker + " Stock",
      type: "stock",
      quantity: isBuy ? qty : -qty,
      currentPrice: executionPrice, 
      purchasePrice: executionPrice,
      realizedPnL: 0,
      purchaseDate: dateOnly
    }, tradeTs);
    
    setIsTradeDialogOpen(false);
  };

  const handleDateChange = async (ticker: string, value: string) => {
    setTradeDate(value);
    
    if (value) {
      const dateOnly = value.split('T')[0];
      const cacheKey = `${ticker}_${dateOnly}`;
      
      if (historicalPrices[cacheKey] || fetchingPrices[cacheKey]) return;

      setFetchingPrices(prev => ({ ...prev, [cacheKey]: true }));
      try {
        const res = await fetch(`/api/stockprice/detail?ticker=${ticker}&date=${dateOnly}`);
        if (res.ok) {
          const detail = await res.json();
          if (detail && detail.close) {
            setHistoricalPrices(prev => ({ ...prev, [cacheKey]: detail.close }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch historical price:', err);
      } finally {
        setFetchingPrices(prev => ({ ...prev, [cacheKey]: false }));
      }
    }
  };

  const handleTickerClick = async (ticker: string, showBuy: boolean = true) => {
    setSelectedChartTicker(ticker);
    setSelectedTradeTicker(ticker);
    setIsBuyVisibleInModal(showBuy);
    
    // Initialize trade date and fetch price
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setTradeDate(localNow);
    handleDateChange(ticker, localNow);

    setIsChartOpen(true);
    setIsChartLoading(true);
    try {
      const [priceRes, tradeRes] = await Promise.all([
        fetch(`/api/stockprice/ticker/${ticker}`),
        fetch(`/api/stocktrade/ticker/${ticker}`)
      ]);
      if (!priceRes.ok || !tradeRes.ok) throw new Error("Failed to fetch data");
      const prices = await priceRes.json();
      const trades = await tradeRes.json();
      
      const pricesWithBuys = [...prices];
      trades.forEach((trade: any) => {
        if (trade.tradeType !== 'BUY') return;
        const tradeTime = new Date(trade.ts).getTime();
        
        let closestP = pricesWithBuys[0];
        let minDiff = Infinity;
        pricesWithBuys.forEach(p => {
          const diff = Math.abs(new Date(p.ts).getTime() - tradeTime);
          if (diff < minDiff) { 
            minDiff = diff; 
            closestP = p; 
          }
        });
        if (closestP) {
          closestP.buyEventPrice = closestP.close;
          closestP.tradeQuantity = (closestP.tradeQuantity || 0) + trade.quantity;
        }
      });
      setChartData(pricesWithBuys);
    } catch (err) {
      console.error(err);
      setChartData([]);
    } finally {
      setIsChartLoading(false);
    }
  };

  const confirmDeleteHolding = async () => {
    if (tickerToDelete) {
      if (activeTab === 'closed') {
        await removeRealizedProfit(tickerToDelete);
      } else {
        await removeHolding(tickerToDelete);
      }
      setTickerToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const getAssetTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'stock': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'bond': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cash': return 'bg-green-100 text-green-800 border-green-200';
      case 'etf': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSectorBadgeColor = (sector?: string) => {
    switch (sector?.toLowerCase()) {
      case 'technology': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'financial': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'healthcare': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'energy': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'automotive': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'communication services': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'consumer cyclical': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold">{new Date(label).toLocaleDateString()}</p>
          <p className="text-gray-700 mt-1">
            Close Price: <span className="font-medium text-black">{formatCurrency(p.close)}</span>
          </p>
          {p.tradeQuantity && p.tradeQuantity > 0 ? (
            <div className="mt-2 text-sm text-amber-600 font-bold bg-amber-50 px-2 py-1.5 rounded flex items-center gap-1">
              🚀 Bought {p.tradeQuantity.toLocaleString()} shares
            </div>
          ) : null}
        </div>
      );
    }
    return null;
  };

  const totalPortfolioValue = holdings.reduce((sum, holding) => sum + (holding.quantity * holding.currentPrice), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this holding?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all records for <strong>{tickerToDelete}</strong>. Historical trade records will not be deleted from the ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteHolding} className="bg-red-600 hover:bg-red-700">
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-3xl">Holdings</h2>
          <p className="text-gray-600 mt-1">Manage your portfolio holdings</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Portfolio Sections</CardTitle>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <Button
              variant={activeTab === 'active' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('active')}
              className="px-4 h-8 text-xs font-bold transition-all"
            >
              Active Holdings ({holdings.filter(h => Number(h.quantity) > 0).length})
            </Button>
            <Button
              variant={activeTab === 'closed' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('closed')}
              className="px-4 h-8 text-xs font-bold transition-all"
            >
              Realized Profits ({closedHoldings.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer group" onClick={() => handleSort('ticker')}>
                    <div className="flex items-center">Ticker{getSortIcon('ticker')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer group" onClick={() => handleSort('name')}>
                    <div className="flex items-center">Name{getSortIcon('name')}</div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('quantity')}>
                    <div className="flex items-center justify-end">Quantity{getSortIcon('quantity')}</div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('price')}>
                    <div className="flex items-center justify-end">Current Price{getSortIcon('price')}</div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('change')}>
                    <div className="flex items-center justify-end">24h Change{getSortIcon('change')}</div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('value')}>
                    <div className="flex items-center justify-end">Total Value{getSortIcon('value')}</div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('gainLoss')}>
                    <div className="flex items-center justify-end">Cumulative P&L{getSortIcon('gainLoss')}</div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('dailyPnL')}>
                    <div className="flex items-center justify-end">Daily P&L{getSortIcon('dailyPnL')}</div>
                  </TableHead>
                  <TableHead className="text-center font-bold">Action</TableHead>
                  {isAdmin && <TableHead className="text-center font-bold">Admin</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHoldings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 12 : 11} className="text-center py-12 text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-lg font-medium">No results in {activeTab === 'active' ? 'active holdings' : 'closed positions'}.</p>
                        <p className="text-sm">Trades you execute will appear here automatically.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedHoldings.map((holding) => {
                    const value = activeTab === 'active' ? calculateHoldingValue(holding) : (holding.totalSoldValue || 0);
                    const gainLoss = activeTab === 'active' ? calculateHoldingGainLoss(holding) : (holding.realizedPnL || 0);
                    const gainLossPercent = activeTab === 'active' ? calculateHoldingGainLossPercent(holding) : 0;

                    return (
                      <TableRow key={holding.id}>
                        <TableCell className="font-medium">
                          <button 
                            onClick={() => handleTickerClick(holding.ticker, false)}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                          >
                            {holding.ticker}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{holding.name}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-gray-700">{holding.quantity.toLocaleString()}</TableCell>
                        <TableCell className={`text-right tabular-nums font-bold ${(holding.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(holding.currentPrice)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            (holding.changePercent || 0) >= 0 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {formatPercent(holding.changePercent || 0)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-bold text-gray-900">{formatCurrency(value)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {holding.type === 'cash' ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <div className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                              <div className="flex items-center justify-end gap-1 tabular-nums">
                                {gainLoss >= 0 ? <Plus className="w-2 h-2" /> : <Minus className="w-2 h-2" />}
                                <span className="font-bold">{formatCurrency(Math.abs(gainLoss))}</span>
                              </div>
                              <div className="text-[10px] opacity-80 tabular-nums">{formatPercent(gainLossPercent)}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const chg = holding.changePercent || 0;
                            const dailyPnL = activeTab === 'active' ? value * (chg / (100 + chg)) : 0;
                            return (
                               <div className={`${dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'} font-medium tabular-nums`}>
                                 <div className="flex items-center justify-end gap-0.5">
                                   {dailyPnL >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                   <span>{formatCurrency(Math.abs(dailyPnL))}</span>
                                 </div>
                               </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleOpenTradeDialog(holding.ticker, 'BUY')}
                                className="bg-green-600 hover:bg-green-700 h-8 px-4 font-bold"
                              >
                                Buy
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleOpenTradeDialog(holding.ticker, 'SELL')}
                                className="h-8 px-4 font-bold"
                                disabled={activeTab === 'closed' || holding.quantity <= 0}
                              >
                                Sell
                              </Button>
                          </div>
                        </TableCell>
                        {isAdmin && (
                           <TableCell className="text-center">
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => {
                                 setTickerToDelete(holding.ticker);
                                 setIsDeleteDialogOpen(true);
                               }}
                               className="text-red-500 hover:text-red-700 hover:bg-red-50"
                             >
                               <Trash2 className="h-4 w-4" />
                             </Button>
                           </TableCell>
                         )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Stocks Market</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer group" onClick={() => handleMarketSort('ticker')}>
                    <div className="flex items-center">Ticker{getMarketSortIcon('ticker')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer group" onClick={() => handleMarketSort('name')}>
                    <div className="flex items-center">Name{getMarketSortIcon('name')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer group" onClick={() => handleMarketSort('sector')}>
                    <div className="flex items-center">Sector{getMarketSortIcon('sector')}</div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleMarketSort('marketCap')}>
                    <div className="flex items-center justify-end">Market Cap{getMarketSortIcon('marketCap')}</div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleMarketSort('price')}>
                    <div className="flex items-center justify-end">Price{getMarketSortIcon('price')}</div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleMarketSort('change')}>
                    <div className="flex items-center justify-end">24h Chg{getMarketSortIcon('change')}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableTickers.map((ticker) => {
                   const marketData = latestPricesMap[ticker];
                   const price = marketData && typeof marketData === 'object' ? marketData.price : marketData;
                   const change = marketData && typeof marketData === 'object' ? marketData.changePercent : 0;
                   const meta = stockMetadata[ticker] || {};

                   return (
                    <TableRow key={ticker}>
                      <TableCell className="font-medium">
                        <button 
                          onClick={() => {
                            handleTickerClick(ticker);
                            setTradeQty(''); // Clear form when opening
                            setTradeType('BUY');
                          }}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {ticker}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">{meta.name || ticker}</TableCell>
                      <TableCell>
                        <Badge className={`${getSectorBadgeColor(meta.sector)} text-[10px] px-1.5 py-0`}>
                          {meta.sector || 'Others'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-600 font-medium">
                        {formatMarketCap(meta.marketCap)}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-bold ${
                        (change || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(price || 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          (change || 0) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {formatPercent(change || 0)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isChartOpen} onOpenChange={setIsChartOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">{selectedChartTicker}</span>
                <span className="text-gray-500 font-normal">{stockMetadata[selectedChartTicker || '']?.name}</span>
              </div>
              <Badge className="bg-blue-100 text-blue-700">{stockMetadata[selectedChartTicker || '']?.sector}</Badge>
            </DialogTitle>
          </DialogHeader>
          
          {/* Professional OHLCV + Price Header Panel */}
          {!isChartLoading && chartData.length > 0 && (() => {
            const lastIdx = chartData.length - 1;
            const latest = chartData[lastIdx];
            const prev = lastIdx > 0 ? chartData[lastIdx - 1] : latest;
            const diff = latest.close - prev.close;
            const diffPct = prev.close !== 0 ? (diff / prev.close) * 100 : 0;
            
            const getCompColor = (curr: number, pVal: number) => 
               curr > pVal ? 'text-green-600' : (curr < pVal ? 'text-red-600' : 'text-gray-900');

            return (
              <div className="flex items-end justify-between py-6 border-b border-t mt-2 px-2 bg-gray-50/30">
                {/* Left Side: Large Current Price */}
                <div className="flex flex-col">
                  <div className="text-4xl font-black tracking-tighter text-gray-900">
                    {formatCurrency(latest.close)}
                  </div>
                  <div className={`flex items-center gap-2 mt-1 font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="text-sm">{diff >= 0 ? '+' : ''}{formatCurrency(diff)}</span>
                    <span className="text-sm">({diff >= 0 ? '+' : ''}{diffPct.toFixed(2)}%)</span>
                  </div>
                </div>

                {/* Right Side: Detailed Stats with Comparative Color */}
                <div className="flex gap-8">
                  {[
                    { label: 'Open', value: latest.open, pVal: prev.open },
                    { label: 'High', value: latest.high, pVal: prev.high },
                    { label: 'Low', value: latest.low, pVal: prev.low },
                    { label: 'Close', value: latest.close, pVal: prev.close }
                  ].map((stat, idx) => (
                    <div key={idx} className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{stat.label}</p>
                      <p className={`text-sm font-bold mt-0.5 ${getCompColor(stat.value, stat.pVal)}`}>
                        {formatCurrency(stat.value)}
                      </p>
                    </div>
                  ))}
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Volume</p>
                    <p className="text-sm font-bold mt-0.5 text-gray-700">
                      {latest.volume?.toLocaleString() || '—'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Helper for rendering trade dots in ticker chart */}
          {(() => {
            const renderTickerTradeDot = (props: any) => {
               const { cx, cy, payload } = props;
               const dateStr = new Date(payload.ts).toISOString().split('T')[0];
               const tickerTrades = trades.filter(t => {
                  if (!t || !t.ts) return false;
                  const tStr = typeof t.ts === 'string' ? t.ts : new Date(t.ts).toISOString();
                  return t.ticker === selectedChartTicker && tStr.split('T')[0] === dateStr;
               });
               
               if (tickerTrades.length > 0) {
                 // Sort such that SELL is prioritized or show both if needed. For now, show SELL if present.
                 const hasSell = tickerTrades.some(t => t.tradeType?.toUpperCase() === 'SELL');
                 const hasBuy = tickerTrades.some(t => t.tradeType?.toUpperCase() === 'BUY');
                 
                 const color = hasSell ? '#ef4444' : '#10b981';
                 const label = hasSell && hasBuy ? 'B/S' : (hasSell ? 'S' : 'B');

                 return (
                   <g key={`ticker-dot-${payload.ts}`}>
                     <circle cx={cx} cy={cy} r={7} fill={color} stroke="#fff" strokeWidth={2} />
                     <text x={cx} y={cy + 3} textAnchor="middle" fill="#fff" fontSize={hasSell && hasBuy ? "6" : "8"} fontWeight="bold">
                       {label}
                     </text>
                   </g>
                 );
               }
               return <circle r={0} />;
            };

            // Inject the function to be used by Line below
            (window as any)._renderTickerTradeDot = renderTickerTradeDot;
            return null;
          })()}

          <div className="h-[350px] w-full mt-6 bg-gray-50/50 rounded-xl p-2 border border-dashed border-gray-200">
            {isChartLoading ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-2"></div>
                Loading chart data...
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="ts" 
                    tickFormatter={(val) => {
                      const date = new Date(val);
                      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().substr(-2)}`;
                    }} 
                    minTickGap={30}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `$${val}`}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="close" 
                    stroke="#3b82f6" 
                    dot={(window as any)._renderTickerTradeDot} 
                    strokeWidth={3} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                No history data available.
              </div>
            )}
          </div>
          
          {!isChartLoading && selectedChartTicker && isBuyVisibleInModal && (
            <div className="mt-8 border-t pt-6 bg-blue-50/30 -mx-6 px-6 pb-2">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    Quick Buy {selectedChartTicker}
                  </h3>
                  <div className="text-sm font-medium text-gray-600 bg-white px-3 py-1 rounded-full border">
                    Latest: <span className="text-blue-600">{formatCurrency(latestPricesMap[selectedChartTicker]?.price || 100)}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="qty-dialog" className="text-sm font-semibold">Quantity</Label>
                    <Input
                      id="qty-dialog"
                      type="number"
                      min="1"
                      placeholder="Number of shares..."
                      value={tradeQty}
                      onChange={(e) => setTradeQty(e.target.value)}
                      className="bg-white border-blue-100"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="date-dialog" className="text-sm font-bold flex items-center gap-2 text-gray-700">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        Trade Date & Time
                      </Label>
                      {(() => {
                        const dateOnly = tradeDate.split('T')[0];
                        const isFetching = fetchingPrices[`${selectedChartTicker}_${dateOnly}`];
                        const hasPrice = historicalPrices[`${selectedChartTicker}_${dateOnly}`];
                        
                        return (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                            {isFetching ? (
                              <span className="text-blue-600 flex items-center animate-pulse">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Fetching Price
                              </span>
                            ) : hasPrice ? (
                              <span className="text-green-600 flex items-center">
                                <Check className="w-3 h-3 mr-1" /> Price Synced
                              </span>
                            ) : (
                              <span className="text-gray-400">Custom Date</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                       <Input
                         id="date-dialog"
                         type="datetime-local"
                         value={tradeDate}
                         onChange={(e) => handleDateChange(selectedChartTicker || '', e.target.value)}
                         className="bg-white border-blue-100 h-10 shadow-sm focus:ring-2 focus:ring-blue-100 transition-all font-mono text-sm"
                       />
                       
                       <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Today', days: 0 },
                            { label: 'Yesterday', days: 1 },
                            { label: '1y Ago', days: 365 }
                          ].map((preset) => (
                            <Button
                              key={preset.label}
                              variant="outline"
                              size="sm"
                              className="h-8 text-[10px] font-bold border-blue-50 hover:bg-blue-50 text-blue-600 bg-blue-50/20"
                              onClick={() => {
                                const d = new Date();
                                d.setDate(d.getDate() - preset.days);
                                const localVal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                handleDateChange(selectedChartTicker || '', localVal);
                              }}
                            >
                              {preset.label}
                            </Button>
                          ))}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-blue-100 shadow-sm mt-2">
                   <div className="flex flex-col">
                     <span className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-0.5">Estimated Total</span>
                     <span className="text-3xl font-black text-blue-700 tabular-nums tracking-tight">
                        {(() => {
                           const marketData = latestPricesMap[selectedChartTicker];
                           const latestPrice = marketData && typeof marketData === 'object' ? marketData.price : marketData;
                           const price = historicalPrices[`${selectedChartTicker}_${tradeDate.split('T')[0]}`] || latestPrice || 0;
                           const qty = parseInt(tradeQty) || 0;
                           return formatCurrency(price * qty);
                        })()}
                     </span>
                   </div>
                   <Button 
                     className="bg-blue-600 hover:bg-blue-700 h-12 px-10 text-lg font-bold shadow-lg shadow-blue-200 transition-all active:scale-95" 
                     onClick={async () => {
                        await handleConfirmTrade();
                        setIsChartOpen(false); // Close on success
                     }}
                     disabled={!tradeQty || parseInt(tradeQty) <= 0}
                   >
                     Confirm Buy
                   </Button>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-2">
                  * Prices are based on historical closing data for the selected date. Using current market price if no historical data found.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Trade Transaction Dialog */}
      <Dialog open={isTradeDialogOpen} onOpenChange={setIsTradeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center text-xl">
              <span>{tradeType} {selectedTradeTicker}</span>
              <Badge className={tradeType === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {tradeType}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-right flex flex-col justify-center">
                <Label htmlFor="qty" className="text-sm font-semibold">Quantity</Label>
                {tradeType === 'SELL' && (
                  <span className="text-[10px] text-blue-600 font-bold">
                    Own: {holdings.find(h => h.ticker === selectedTradeTicker)?.quantity || 0}
                  </span>
                )}
              </div>
              <Input
                id="qty"
                type="number"
                min="1"
                placeholder="0"
                value={tradeQty}
                onChange={(e) => setTradeQty(e.target.value)}
                className="col-span-3 font-mono"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="date" className="text-right pt-2 font-bold flex items-center justify-end gap-1">
                <Calendar className="w-3 h-3 text-blue-500" /> Date
              </Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="date"
                  type="datetime-local"
                  value={tradeDate}
                  onChange={(e) => handleDateChange(selectedTradeTicker || '', e.target.value)}
                  className="bg-white border-blue-100 h-9 shadow-sm focus:ring-2 focus:ring-blue-100 transition-all font-mono text-xs"
                />
                
                <div className="flex gap-2">
                   {[
                     { label: 'Today', days: 0 },
                     { label: 'Yesterday', days: 1 },
                     { label: '1y Ago', days: 365 }
                   ].map((preset) => (
                     <Button
                       key={preset.label}
                       variant="outline"
                       size="sm"
                       className="h-6 text-[9px] px-2 font-bold border-blue-50 hover:bg-blue-50 text-blue-600 bg-blue-50/20"
                       onClick={() => {
                         const d = new Date();
                         d.setDate(d.getDate() - preset.days);
                         const localVal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                         handleDateChange(selectedTradeTicker || '', localVal);
                       }}
                     >
                       {preset.label}
                     </Button>
                   ))}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-100 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Closing Price ({tradeDate.split('T')[0]})</span>
                <span className="font-medium">
                  {fetchingPrices[`${selectedTradeTicker}_${tradeDate.split('T')[0]}`] ? (
                    <span className="text-blue-500 animate-pulse">Fetching...</span>
                  ) : historicalPrices[`${selectedTradeTicker}_${tradeDate.split('T')[0]}`] ? (
                    formatCurrency(historicalPrices[`${selectedTradeTicker}_${tradeDate.split('T')[0]}`])
                  ) : (
                    <span>{formatCurrency(typeof latestPricesMap[selectedTradeTicker] === 'object' ? latestPricesMap[selectedTradeTicker].price : (latestPricesMap[selectedTradeTicker] || 0))}</span>
                  )}
                </span>
              </div>
               <div className="flex justify-between text-xl font-black border-t-2 border-dashed border-gray-100 pt-4 mt-2">
                 <span className="text-gray-400 font-bold text-sm self-center uppercase tracking-widest">Total Amount</span>
                 <span className="text-blue-600 tabular-nums">
                    {(() => {
                       const marketData = latestPricesMap[selectedTradeTicker];
                       const latestPrice = marketData && typeof marketData === 'object' ? marketData.price : marketData;
                       const price = historicalPrices[`${selectedTradeTicker}_${tradeDate.split('T')[0]}`] || latestPrice || 0;
                       const qty = parseInt(tradeQty) || 0;
                       return formatCurrency(price * qty);
                    })()}
                 </span>
               </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsTradeDialogOpen(false)}>Cancel</Button>
            <Button 
                className={tradeType === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} 
                onClick={handleConfirmTrade}
                disabled={!tradeQty || parseInt(tradeQty) <= 0}
            >
              Confirm {tradeType}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Validation Error Dialog */}
      <AlertDialog open={isValidationErrorOpen} onOpenChange={setIsValidationErrorOpen}>
        <AlertDialogContent className="border-red-100 bg-white">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-red-700 text-xl font-black">Insufficient Shares</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-600 font-medium py-2 px-1">
              {validationErrorMsg}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction 
              onClick={() => setIsValidationErrorOpen(false)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-red-200 transition-all active:scale-95"
            >
              Understand & Adjust
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}