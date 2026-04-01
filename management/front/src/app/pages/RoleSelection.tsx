import React from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { User, ShieldCheck, PieChart, Database } from 'lucide-react';

export default function RoleSelection() {
  const { setRole } = usePortfolio();
  const navigate = useNavigate();

  const handleSelectRole = (role: 'user' | 'admin') => {
    setRole(role);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          WealthWise
        </h1>
        <p className="text-xl text-slate-600 max-w-md mx-auto">
          Professional Portfolio Management & Analysis Platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Investor Card */}
        <Card 
          className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-blue-500 cursor-pointer overflow-hidden relative"
          onClick={() => handleSelectRole('user')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <PieChart size={120} />
          </div>
          <CardHeader className="pt-8 items-center text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <User size={32} />
            </div>
            <CardTitle className="text-2xl font-bold">Investor Portal</CardTitle>
            <CardDescription className="text-slate-500 mt-2">
              View your portfolio, track performance, and execute trades in a clean, focused environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8 flex justify-center">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6">
              Enter as Investor
            </Button>
          </CardContent>
        </Card>

        {/* Manager Card */}
        <Card 
          className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-amber-500 cursor-pointer overflow-hidden relative"
          onClick={() => handleSelectRole('admin')}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Database size={120} />
          </div>
          <CardHeader className="pt-8 items-center text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck size={32} />
            </div>
            <CardTitle className="text-2xl font-bold">Portfolio Manager</CardTitle>
            <CardDescription className="text-slate-500 mt-2">
              Full administrative access. Manage users, modify holdings, and clean up transaction data.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8 flex justify-center">
            <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-6 border-none">
              Enter as Manager
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 text-slate-400 text-sm italic">
        Tip: Managers can delete data and perform deep maintenance.
      </p>
    </div>
  );
}
