import { Outlet, Link, useLocation } from 'react-router';
import { PortfolioProvider, usePortfolio } from '../context/PortfolioContext';
import { LayoutDashboard, Briefcase, TrendingUp, History, LogOut, Shield } from 'lucide-react';

function LayoutContent() {
  const location = useLocation();
  const { role, isAdmin } = usePortfolio();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="font-bold text-xl leading-none">WealthWise</h1>
                <div className="flex items-center gap-1.5 mt-1">
                  {isAdmin ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      <Shield className="w-2.5 h-2.5" /> Manager
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Investor
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <nav className="flex items-center gap-1">
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
                  isActive('/dashboard')
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                to="/holdings"
                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
                  isActive('/holdings')
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Holdings
              </Link>
              <Link
                to="/transactions"
                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
                  isActive('/transactions')
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <History className="w-4 h-4" />
                Transactions
              </Link>
              
              <div className="w-px h-6 bg-gray-200 mx-2" />
              
              <Link
                to="/"
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors group"
                title="Exit / Switch Role"
              >
                <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default function Layout() {
  return <LayoutContent />;
}
