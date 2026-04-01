import { useState, useEffect } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import {
  calculateHoldingValue,
  calculateHoldingCost,
  calculateHoldingGainLoss,
  calculateHoldingGainLossPercent,
  formatCurrency,
  formatPercent,
} from '../utils/portfolioUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Plus, Trash2, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { HoldingsSkeleton } from '../components/HoldingsSkeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type SortField = 'ticker' | 'name' | 'value' | 'gainLoss' | null;
type SortDirection = 'asc' | 'desc';

export default function Holdings() {
  const { holdings, removeHolding, addHolding, isLoading, error } = usePortfolio();
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [availableStocks, setAvailableStocks] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  // Chart state
  const [selectedChartTicker, setSelectedChartTicker] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);

  useEffect(() => {
    fetch('/api/stockprice/tickers')
      .then(res => res.json())
      .then(data => setAvailableStocks(data))
      .catch(err => console.error('Failed to fetch available stocks:', err));
  }, []);

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

  const handleAddStock = (ticker: string) => {
    const qtyStr = quantities[ticker];
    const qty = parseInt(qtyStr);
    if (!qty || qty <= 0) {
       alert("Please enter a valid quantity");
       return;
    }
    addHolding({
      ticker,
      name: ticker + " Stock",
      type: "stock",
      quantity: qty,
      currentPrice: 100, 
      purchasePrice: 100,
      purchaseDate: new Date().toISOString()
    });
    setQuantities(prev => ({ ...prev, [ticker]: '' }));
  };

  const handleQuantityChange = (ticker: string, value: string) => {
    setQuantities(prev => ({ ...prev, [ticker]: value }));
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

  const getAssetTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'stock': return 'bg-blue-100 text-blue-800';
      case 'bond': return 'bg-green-100 text-green-800';
      case 'cash': return 'bg-gray-100 text-gray-800';
      case 'etf': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find the main close price payload (it might be index 0 or 1 depending on hover overlap)
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

  return (
    <div className="space-y-6">
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
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Avg. Cost</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('value')}>
                    <div className="flex items-center justify-end">Total Value{getSortIcon('value')}</div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('gainLoss')}>
                    <div className="flex items-center justify-end">Gain/Loss{getSortIcon('gainLoss')}</div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHoldings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
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
                        <TableCell>
                          <Badge className={getAssetTypeBadgeColor(holding.type)}>{holding.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{holding.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(holding.purchasePrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(holding.currentPrice)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(value)}</TableCell>
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
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeHolding(holding.id!)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* NEW: Stock List for adding holdings */}
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
                  <TableHead className="text-right">Quantity to Add</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableStocks.map((ticker) => (
                  <TableRow key={ticker}>
                    <TableCell className="font-medium">
                      <button 
                        onClick={() => handleTickerClick(ticker)}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {ticker}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <input
                          type="number"
                          placeholder="e.g. 100"
                          min="1"
                          value={quantities[ticker] || ''}
                          onChange={(e) => handleQuantityChange(ticker, e.target.value)}
                          className="w-24 px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleAddStock(ticker)}
                        className="flex items-center gap-1 ml-auto"
                      >
                        <Plus className="w-4 h-4" /> Add
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {availableStocks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                      No stocks available in the market database.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Chart Dialog */}
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
    </div>
  );
}