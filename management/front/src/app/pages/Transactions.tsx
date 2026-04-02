import { useState, useEffect } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { formatCurrency } from '../utils/portfolioUtils';
import { ArrowDownLeft, ArrowUpRight, Trash2 } from 'lucide-react';
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

interface TradeRecord {
  id: number;
  ticker: string;
  tradeType: string;
  price: number;
  quantity: number;
  amount: number;
  ts: string;
}

export default function Transactions() {
  const { isAdmin, deleteTrade } = usePortfolio();
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deletion state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState<TradeRecord | null>(null);

  useEffect(() => {
    fetch('/api/stocktrade/list')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch transaction history');
        return res.json();
      })
      .then(data => {
        setTrades(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const confirmDeleteTrade = async () => {
    if (tradeToDelete) {
      const success = await deleteTrade(tradeToDelete.id);
      if (success) {
        setTrades(prev => prev.filter(t => t.id !== tradeToDelete.id));
        setTradeToDelete(null);
        setIsDeleteDialogOpen(false);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the transaction record for <strong>{tradeToDelete?.ticker}</strong> (#{tradeToDelete?.id})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTrade} className="bg-red-600 hover:bg-red-700">
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-3xl">Transactions</h2>
          <p className="text-gray-600 mt-1">Review your historical trade activity</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-gray-500">
              Loading transactions...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-48 text-red-500">
              {error}
            </div>
          ) : trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <p>No transactions found.</p>
              <p className="text-sm">Head over to the Holdings page to add a stock to your portfolio.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Executed Price</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    {isAdmin && <TableHead className="text-center">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="text-gray-600">
                        {formatDate(trade.ts)}
                      </TableCell>
                      <TableCell className="font-medium text-lg">
                        {trade.ticker}
                      </TableCell>
                      <TableCell>
                        {trade.tradeType === 'BUY' ? (
                          <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1 w-max">
                            <ArrowDownLeft className="h-3 w-3" /> BUY
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 flex items-center gap-1 w-max">
                            <ArrowUpRight className="h-3 w-3" /> SELL
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {trade.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(trade.price)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(trade.amount)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                             onClick={() => {
                               setTradeToDelete(trade);
                               setIsDeleteDialogOpen(true);
                             }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
