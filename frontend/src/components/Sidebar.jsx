import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  FileText, 
  ShoppingCart, 
  Warehouse, 
  ArrowUpRight, 
  Package, 
  Wrench, 
  Briefcase, 
  Users, 
  Database, 
  BarChart3,
  LogOut,
  X,
  ShieldCheck,
  Store,
  DownloadCloud,
  Eye,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useApp } from '../context/AppContext';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Sidebar({ isOpen, toggleSidebar }) {
  const { user, logout, materials, projects, vendors, enquiries, quotations, purchaseOrders, grns, issues, tools } = useApp();

  const handleFullBackup = () => {
    try {
      const workbook = XLSX.utils.book_new();

      const sheets = [
        { name: 'Materials', data: materials },
        { name: 'Projects', data: projects },
        { name: 'Vendors', data: vendors },
        { name: 'Enquiries', data: enquiries },
        { name: 'Quotations', data: quotations },
        { name: 'PurchaseOrders', data: purchaseOrders },
        { name: 'GRNs', data: grns },
        { name: 'Issues', data: issues },
        { name: 'Tools', data: tools },
      ];

      sheets.forEach(sheet => {
        if (sheet.data && sheet.data.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(sheet.data);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
        } else {
          const worksheet = XLSX.utils.json_to_sheet([{ Message: 'No data available' }]);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
        }
      });

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `ERP_Full_Backup_${dateStr}.xlsx`);
    } catch (error) {
      console.error("Backup failed", error);
    }
  };

  const allNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'staff', 'viewer', 'store_team', 'purchase_team'] },
    { 
      path: '/enquiry', 
      label: 'Enquiry', 
      icon: Search, 
      roles: ['admin', 'staff', 'purchase_team', 'store_team'] 
    },
    { path: '/quotations', label: 'Quotations', icon: FileText, roles: ['admin', 'staff', 'purchase_team'] },
    { path: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, roles: ['admin', 'staff', 'purchase_team'] },
    { path: '/emergency-dc', label: 'Delivery Challan', icon: ShoppingCart, roles: ['admin', 'purchase_team'] },
    { path: '/store', label: 'Store / GRN', icon: Warehouse, roles: ['admin', 'staff', 'store_team'] },
    { path: '/issue', label: 'Issue Material', icon: ArrowUpRight, roles: ['admin', 'staff', 'store_team'] },
    { path: '/inventory', label: 'Inventory', icon: Package, roles: ['admin', 'staff', 'viewer', 'store_team', 'purchase_team'] },
    { path: '/tools', label: 'Tools', icon: Wrench, roles: ['admin', 'staff', 'store_team'] },
    { path: '/projects', label: 'Projects / WO', icon: Briefcase, roles: ['admin', 'staff', 'purchase_team'] },
    { path: '/vendors', label: 'Vendors', icon: Users, roles: ['admin', 'staff', 'purchase_team'] },
    { path: '/material-master', label: 'Material Master', icon: Database, roles: ['admin', 'staff', 'purchase_team'] },
    { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'staff', 'viewer', 'store_team', 'purchase_team'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(user?.role));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-primary-dark text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Warehouse className="text-primary-dark w-6 h-6" />
              </div>
              <span className="font-bold text-xl tracking-tight">Deepika Builtech ERP</span>
            </div>
            <button onClick={toggleSidebar} className="lg:hidden text-white/70 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="px-6 mb-4">
             <NavLink 
                to="/profile" 
                className="p-3 bg-white/10 rounded-xl flex items-center gap-3 hover:bg-white/20 transition-all cursor-pointer select-none block"
             >
                <div className={cn(
                   "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                   user?.role === 'admin' ? "bg-success" : user?.role === 'viewer' ? "bg-sky-500" : "bg-warning"
                )}>
                   {user?.role === 'admin' ? (
                     <ShieldCheck className="w-5 h-5 text-white" />
                   ) : user?.role === 'viewer' ? (
                     <Eye className="w-5 h-5 text-white" />
                   ) : (
                     <Store className="w-5 h-5 text-white" />
                   )}
                </div>
                <div className="min-w-0 flex-1">
                   <p className="text-xs font-bold uppercase tracking-widest opacity-50 truncate">
                     {user?.role === 'store_team' 
                       ? 'Store' 
                       : user?.role === 'purchase_team' 
                       ? 'Purchase' 
                       : user?.role === 'admin' 
                       ? 'Admin' 
                       : user?.role === 'viewer' 
                       ? 'Viewer' 
                       : user?.role || 'Guest'} Portal
                   </p>
                   <p className="text-sm font-semibold truncate">{user?.name}</p>
                </div>
             </NavLink>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1 custom-scrollbar">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-white shadow-lg" 
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  "group-hover:scale-110 transition-transform"
                )} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 space-y-2">
            {user?.role === 'admin' && (
              <button 
                onClick={handleFullBackup}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-success hover:bg-success/10 transition-colors"
              >
                <DownloadCloud className="w-5 h-5" />
                <span className="font-bold uppercase tracking-wider text-xs">Excel Backup</span>
              </button>
            )}
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-error hover:bg-error/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-xs">Logout Session</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
