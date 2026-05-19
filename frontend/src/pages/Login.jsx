import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Warehouse, LogIn, Mail, Lock, Shield, Package } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Login() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (!success) {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-primary-bg flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-500">
        {/* Branding Side */}
        <div className="md:w-1/2 bg-primary-dark p-12 text-white flex flex-col justify-between">
          <div>
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8">
              <Warehouse className="text-primary-dark w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold mb-4">PEB ERP</h1>
            <p className="text-white/70 leading-relaxed">
              Streamlining Warehouse Construction Management with Precision and Efficiency.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Shield className="w-4 h-4" /></div>
              <p className="text-sm font-medium">Enterprise Grade Security</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Package className="w-4 h-4" /></div>
              <p className="text-sm font-medium">Real-time Inventory Tracking</p>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="md:w-1/2 p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-text-dark">Welcome Back</h2>
            <p className="text-text-gray mt-2">Please login to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-bold text-text-gray uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-gray" />
                <input 
                  type="email" 
                  required
                  className="input-field pl-11"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-text-gray uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-gray" />
                <input 
                  type="password" 
                  required
                  className="input-field pl-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm font-medium animate-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full py-4 text-lg"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>Sign In <LogIn className="w-5 h-5" /></>
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
