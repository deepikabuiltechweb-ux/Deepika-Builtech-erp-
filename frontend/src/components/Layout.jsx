import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Bell, User, Menu, Search, LogOut } from 'lucide-react';

export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-primary-bg overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              className="lg:hidden p-2 text-text-gray hover:bg-primary-bg rounded-md transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-gray" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="pl-10 pr-4 py-2 bg-primary-bg border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 w-64 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-text-gray hover:bg-primary-bg rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
            </button>
            
            <div className="h-8 w-px bg-border mx-2"></div>

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-text-dark">Admin User</p>
                <p className="text-xs text-text-gray">PEB Construction</p>
              </div>
              <button className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                <User className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
