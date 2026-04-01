import { Outlet, Link, useLocation } from 'react-router';
import { PortfolioProvider } from '../context/PortfolioContext';
import { LayoutDashboard, Briefcase, TrendingUp } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <PortfolioProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <h1 className="font-bold text-xl">Portfolio Manager</h1>
              </div>
              <nav className="flex gap-1">
                <Link
                  to="/"
                  className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                    isActive('/')
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  to="/holdings"
                  className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                    isActive('/holdings')
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Holdings
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
    </PortfolioProvider>
  );
}
