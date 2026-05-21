import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Warehouse, LogIn, Mail, Lock, Shield, Package, ShoppingBag, ClipboardList, CheckCircle, Eye } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Login() {
  const { login, logout } = useApp();
  const [portal, setPortal] = useState('store'); // 'store', 'purchase', or 'viewer'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // 1. Attempt login
    const success = await login(email, password);
    setLoading(false);
    
    if (success) {
      // 2. Fetch authenticated user from storage to check role compatibility
      const storedUser = JSON.parse(localStorage.getItem('erp_user'));
      if (storedUser) {
        const isUserAdmin = storedUser.role === 'admin';
        const isUserStore = storedUser.role === 'store_team';
        const isUserPurchase = storedUser.role === 'purchase_team';
        const isUserViewer = storedUser.role === 'viewer';

        if (portal === 'store' && !isUserStore && !isUserAdmin) {
          logout();
          setError('Access Denied: This account is not authorized for the Store Team portal. Please select the correct portal.');
        } else if (portal === 'purchase' && !isUserPurchase && !isUserAdmin) {
          logout();
          setError('Access Denied: This account is not authorized for the Purchase Team portal. Please select the correct portal.');
        } else if (portal === 'viewer' && !isUserViewer && !isUserAdmin) {
          logout();
          setError('Access Denied: This account is not authorized for the View Only Portal. Please select the correct portal.');
        }
      }
    } else {
      setError('Invalid email or password. Please verify your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-primary-light/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-success/15 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-500 z-10 border border-border/50">
        {/* Branding Side */}
        <div className={cn(
          "md:w-1/2 p-12 text-white flex flex-col justify-between transition-all duration-700 relative",
          portal === 'store' ? "bg-primary-dark" : portal === 'purchase' ? "bg-slate-900" : "bg-sky-950"
        )}>
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          <div className="relative z-10">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform hover:scale-105 duration-300",
              portal === 'store' ? "bg-white text-primary-dark" : portal === 'purchase' ? "bg-white text-slate-900" : "bg-white text-sky-950"
            )}>
              {portal === 'store' ? <Warehouse className="w-8 h-8" /> : portal === 'purchase' ? <ShoppingBag className="w-8 h-8" /> : <Eye className="w-8 h-8" />}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-3">DEEPIKA BUILTECH ERP</h1>
            <p className="text-white/75 leading-relaxed text-sm font-medium">
              Enterprise construction resources, inventory tracking, and billing operations, orchestrated with role-based precision.
            </p>
          </div>
          
          <div className="space-y-4 mt-8 relative z-10">
            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shadow-inner"><Shield className="w-4 h-4" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/50">Security Gate</p>
                <p className="text-sm font-semibold text-white/90">Role-Segregated Access</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shadow-inner"><Package className="w-4 h-4" /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/50">Core Module</p>
                <p className="text-sm font-semibold text-white/90">
                  {portal === 'store' ? 'Store & Issue Records' : portal === 'purchase' ? 'Purchase Orders & Financials' : 'System View Only & Reports'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Access Portal</h2>
            <p className="text-slate-500 text-sm mt-1">Select your team below to log in.</p>
          </div>

          {/* Portal Tabs Selector */}
          <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-2xl mb-8 relative border border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => {
                setPortal('store');
                setError('');
              }}
              className={cn(
                "py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all duration-300",
                portal === 'store'
                  ? "bg-white text-primary shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Warehouse className="w-3.5 h-3.5" />
              Store
            </button>
            <button
              type="button"
              onClick={() => {
                setPortal('purchase');
                setError('');
              }}
              className={cn(
                "py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all duration-300",
                portal === 'purchase'
                  ? "bg-slate-900 text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Purchase
            </button>
            <button
              type="button"
              onClick={() => {
                setPortal('viewer');
                setError('');
              }}
              className={cn(
                "py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all duration-300",
                portal === 'viewer'
                  ? "bg-sky-950 text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              Viewer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Portal Username (Email)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  required
                  className="input-field pl-10 py-3 text-sm focus:border-slate-400"
                  placeholder="username@deepikabuiltech.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  required
                  className="input-field pl-10 py-3 text-sm focus:border-slate-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold leading-relaxed animate-in slide-in-from-top-2 duration-300">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={cn(
                "w-full py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2",
                loading ? "opacity-90 cursor-not-allowed" : "",
                portal === 'store' 
                  ? "bg-primary text-white hover:bg-primary-dark" 
                  : portal === 'purchase' 
                    ? "bg-slate-900 text-white hover:bg-slate-800" 
                    : "bg-sky-950 text-white hover:bg-sky-900"
              )}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Enter {portal === 'store' ? 'Store Portal' : portal === 'purchase' ? 'Purchase Portal' : 'Viewer Portal'}</span>
                  <LogIn className="w-4 h-4" />
                </>
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
