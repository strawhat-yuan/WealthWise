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
import { Plus, Trash2, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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

type SortField = 'ticker' | 'name' | 'value' | 'gainLoss' | null;
type SortDirection = 'asc' | 'desc';

export default function Holdings() {
  const { holdings, removeHolding, addHolding, isAdmin, isLoading, error, latestPricesMap, stockMetadata } = usePortfolio();
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
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

  // Chart state
  const [selectedChartTicker, setSelectedChartTicker] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);

  const availableTickers = Object.keys(latestPricesMap).sort();

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

  const sortedHoldings = [...holdings].sort((a, b) => {
    if (!sortField) return 0;
    let comparison = 0;
    switch (sortField) {
      case 'ticker': comparison = a.ticker.localeCompare(b.ticker); break;
      case 'name': comparison = a.name.localeCompare(b.name); break;
      case 'value': comparison = calculateHoldingValue(a) - calculateHoldingValue(b); break;
      case 'gainLoss': comparison = calculateHoldingGainLoss(a) - calculateHoldingGainLoss(b); break;
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
            alert(`Sell failed: You only own ${owned} shares of ${ticker}.`);
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

  const handleTickerClick = async (ticker: string) => {
    setSelectedChartTicker(ticker);
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
      await removeHolding(tickerToDelete);
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
        <CardHeader>
          <CardTitle>All Holdings</CardTitle>
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
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Avg. Cost</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">24h Change</TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('value')}>
                    <div className="flex items-center justify-end">Total Value{getSortIcon('value')}</div>
                  </TableHead>
                  <TableHead className="text-right">Weight%</TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('gainLoss')}>
                    <div className="flex items-center justify-end">Gain/Loss{getSortIcon('gainLoss')}</div>
                  </TableHead>
                  <TableHead className="text-right">Realized P&L</TableHead>
                  <TableHead className="text-right text-center">Action</TableHead>
                  {isAdmin && <TableHead className="text-center">Admin</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHoldings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 12 : 11} className="text-center py-8 text-gray-500">
                      No holdings found. Pick a stock from below to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedHoldings.map((holding) => {
                    const value = calculateHoldingValue(holding);
                    const cost = calculateHoldingCost(holding);
                    const gainLoss = calculateHoldingGainLoss(holding);
                    const gainLossPercent = calculateHoldingGainLossPercent(holding);

                    return (
                      <TableRow key={holding.id}>
                        <TableCell className="font-medium">{holding.ticker}</TableCell>
                        <TableCell>{holding.name}</TableCell>
                        <TableCell className="text-right">{holding.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(holding.purchasePrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(holding.currentPrice)}</TableCell>
                        <TableCell className="text-right">
                          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${
                            (holding.changePercent || 0) >= 0 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {formatPercent(holding.changePercent || 0)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(value)}</TableCell>
                        <TableCell className="text-right text-gray-500 font-mono">
                          {totalPortfolioValue > 0 ? ((value / totalPortfolioValue) * 100).toFixed(1) + '%' : '0%'}
                        </TableCell>
                        <TableCell className="text-right">
                          {holding.type === 'cash' ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <div className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                              <div className="flex items-center justify-end gap-1">
                                {gainLoss >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                <span className="font-medium">{formatCurrency(gainLoss)}</span>
                              </div>
                              <div className="text-xs">{formatPercent(gainLossPercent)}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={holding.realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}>
                            <span className="font-medium">{formatCurrency(holding.realizedPnL)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 px-4">
                              <Button
                                size="sm"
                                onClick={() => handleOpenTradeDialog(holding.ticker, 'BUY')}
                                className="bg-green-600 hover:bg-green-700 h-8 px-4"
                              >
                                Buy
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleOpenTradeDialog(holding.ticker, 'SELL')}
                                className="h-8 px-4"
                                disabled={holding.quantity <= 0}
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
                  <TableHead>Ticker</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead className="text-right">Market Cap</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">24h Chg</TableHead>
                  <TableHead className="text-right">Action</TableHead>
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
                          onClick={() => handleTickerClick(ticker)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {ticker}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getSectorBadgeColor(meta.sector)} text-[10px] px-1.5 py-0`}>
                          {meta.sector || 'Others'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {formatMarketCap(meta.marketCap)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-700">
                        {formatCurrency(price || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-xs font-bold ${(change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercent(change || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                         <Button
                           size="sm"
                           onClick={() => handleOpenTradeDialog(ticker, 'BUY')}
                           className="bg-green-600 hover:bg-green-700"
                         >
                           Buy
                         </Button>
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
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{selectedChartTicker} - 1 Year Price History</DialogTitle>
          </DialogHeader>
          <div className="h-[400px] w-full mt-4">
            {isChartLoading ? (
              <div className="flex h-full items-center justify-center text-gray-500">
                Loading chart data...
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="ts" 
                    tickFormatter={(val) => {
                      const date = new Date(val);
                      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().substr(-2)}`;
                    }} 
                    minTickGap={30}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `$${val}`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="close" stroke="#3b82f6" dot={false} strokeWidth={2} />
                  <Line 
                    type="monotone" 
                    dataKey="buyEventPrice" 
                    stroke="none" 
                    dot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} 
                    isAnimationActive={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                No history data available.
              </div>
            )}
          </div>
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
              <Label htmlFor="qty" className="text-right">Quantity</Label>
              <Input
                id="qty"
                type="number"
                min="1"
                placeholder="0"
                value={tradeQty}
                onChange={(e) => setTradeQty(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Date</Label>
              <Input
                id="date"
                type="datetime-local"
                value={tradeDate}
                onChange={(e) => handleDateChange(selectedTradeTicker, e.target.value)}
                className="col-span-3"
              />
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
                    <span className="text-amber-600">N/A (Using Latest: {formatCurrency(latestPricesMap[selectedTradeTicker] || 0)})</span>
                  )}
                </span>
              </div>
               <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                 <span>Total Amount</span>
                 <span className="text-blue-600">
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
    </div>
  );
}