import React from 'react';
import { 
  TrendingUp, 
  Package, 
  Search, 
  ShoppingCart, 
  Briefcase, 
  AlertTriangle,
  Wrench,
  Users
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { useApp } from '../context/AppContext';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const COLORS = ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

export default function Dashboard() {
  const { 
    materials, 
    enquiries, 
    purchaseOrders, 
    projects, 
    tools, 
    vendors,
    isStoreTeam, 
    isPurchaseTeam, 
    isAdmin 
  } = useApp();

  const totalInventoryValue = materials.reduce((acc, m) => acc + (m.currentStock * m.latestPrice), 0);
  const lowStockCount = materials.filter(m => m.currentStock <= m.minLevel).length;
  const pendingEnquiries = enquiries.filter(e => e.status === 'Open').length;
  const pendingPOs = purchaseOrders.filter(p => p.status === 'Sent' || p.status === 'Partial').length;

  const currentMonth = new Date().getMonth();
  const currentMonthPurchases = purchaseOrders
    .filter(p => p.date && new Date(p.date).getMonth() === currentMonth)
    .reduce((acc, p) => acc + p.items.reduce((sum, i) => sum + i.total, 0), 0);

  // Helper flags for pure roles (non-admin)
  const isPureStore = isStoreTeam && !isPurchaseTeam;

  // Compile role-appropriate KPIs
  const kpis = [];

  if (!isPureStore) {
    kpis.push({ 
      label: 'Total Inventory Value', 
      value: `₹${totalInventoryValue.toLocaleString('en-IN')}`, 
      icon: Package, 
      color: 'bg-primary' 
    });
  }

  kpis.push({ 
    label: 'Pending Enquiries', 
    value: pendingEnquiries, 
    icon: Search, 
    color: 'bg-blue-600' 
  });

  if (!isPureStore) {
    kpis.push({ 
      label: 'Pending POs', 
      value: pendingPOs, 
      icon: ShoppingCart, 
      color: 'bg-blue-700' 
    });
  }

  kpis.push({ 
    label: 'Active Projects', 
    value: projects.length, 
    icon: Briefcase, 
    color: 'bg-blue-800' 
  });

  kpis.push({ 
    label: 'Low Stock Alerts', 
    value: lowStockCount, 
    icon: AlertTriangle, 
    color: 'bg-error' 
  });

  if (!isPureStore) {
    kpis.push({ 
      label: 'This Month Purchase', 
      value: `₹${currentMonthPurchases.toLocaleString('en-IN')}`, 
      icon: TrendingUp, 
      color: 'bg-success' 
    });
  }

  // Store-specific non-monetary KPIs
  if (isStoreTeam || isAdmin) {
    kpis.push({ 
      label: 'Tools & Equipment', 
      value: tools?.length || 0, 
      icon: Wrench, 
      color: 'bg-indigo-600' 
    });
  }

  // Purchase-specific non-monetary KPIs
  if (isPurchaseTeam || isAdmin) {
    kpis.push({ 
      label: 'Registered Vendors', 
      value: vendors?.length || 0, 
      icon: Users, 
      color: 'bg-teal-600' 
    });
  }

  // Trend data: dynamically calculate from actual POs or provide fallback values
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const purchaseTrendData = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - idx));
    const monthIndex = d.getMonth();
    const monthName = months[monthIndex];
    
    // Sum PO values for this month
    const monthlySum = purchaseOrders
      .filter(p => p.date && new Date(p.date).getMonth() === monthIndex && new Date(p.date).getFullYear() === d.getFullYear())
      .reduce((acc, p) => acc + p.items.reduce((sum, i) => sum + (i.total || 0), 0), 0) || 0;
      
    return {
      name: monthName,
      value: monthlySum
    };
  });

  // Top Materials by Value
  const topMaterialsData = [...materials]
    .sort((a, b) => (b.currentStock * b.latestPrice) - (a.currentStock * a.latestPrice))
    .slice(0, 5)
    .map(m => ({ name: m.name, value: m.currentStock * m.latestPrice }));

  // Top Materials by Quantity (Store Team specific)
  const topMaterialsQtyData = [...materials]
    .sort((a, b) => b.currentStock - a.currentStock)
    .slice(0, 5)
    .map(m => ({ name: m.name, value: m.currentStock, unit: m.unit }));

  // Stock by Category
  const categoryData = Object.entries(
    materials.reduce((acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Enterprise Dashboard</h1>
          <p className="text-text-gray">
            {isPureStore ? 'Store Operations Portal' : isPurchaseTeam && !isAdmin ? 'Purchase Management Portal' : 'Welcome back, here\'s what\'s happening today.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn-primary bg-white text-primary border border-primary hover:bg-primary-bg">
            Download Report
          </button>
          {(isAdmin || isStoreTeam) && (
            <button onClick={() => window.location.href='/enquiry'} className="btn-primary">
              + New Enquiry
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className={cn(
        "grid grid-cols-1 sm:grid-cols-2 gap-6",
        isPureStore ? "lg:grid-cols-4" : "lg:grid-cols-4 xl:grid-cols-4"
      )}>
        {kpis.map((kpi, idx) => (
          <div key={idx} className="card p-4 flex flex-col justify-between hover:shadow-md transition-all border-l-4 border-l-primary">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg text-white", kpi.color)}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-xs text-text-gray uppercase tracking-wider font-semibold">{kpi.label}</p>
              <p className="text-xl font-bold text-text-dark mt-1">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {!isPureStore ? (
          <div className="card">
            <h3 className="text-lg font-semibold mb-6">Monthly Purchase Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={purchaseTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Purchase Value']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#1E40AF" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#1E40AF', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="card">
            <h3 className="text-lg font-semibold mb-6">Top Stock Quantities</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={topMaterialsQtyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{fill: '#64748B', fontSize: 12}} />
                  <Tooltip 
                     cursor={{fill: '#EFF6FF'}}
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                     formatter={(value, name, props) => [`${value} ${props.payload.unit || ''}`, 'Available Stock']}
                  />
                  <Bar dataKey="value" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="card">
          <h3 className="text-lg font-semibold mb-6">
            {isPureStore ? "Stock Category Distribution" : "Top 5 Materials by Value"}
          </h3>
          <div className="h-[300px]">
            {isPureStore ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={topMaterialsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{fill: '#64748B', fontSize: 12}} />
                  <Tooltip 
                     cursor={{fill: '#EFF6FF'}}
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                     formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Valuation']}
                  />
                  <Bar dataKey="value" fill="#1E40AF" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Category & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {!isPureStore ? (
          <>
            <div className="card">
              <h3 className="text-lg font-semibold mb-6">Stock by Category</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card lg:col-span-2">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-error" />
                Critical Stock Alerts
              </h3>
              <div className="table-container">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Category</th>
                      <th>Current Stock</th>
                      <th>Min Level</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.filter(m => m.currentStock <= m.minLevel).length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-text-gray italic">No critical stock alerts found. All materials are above minimum level!</td>
                      </tr>
                    ) : (
                      materials.filter(m => m.currentStock <= m.minLevel).slice(0, 5).map(m => (
                        <tr key={m.id}>
                          <td className="font-medium">{m.name}</td>
                          <td>{m.category}</td>
                          <td className="text-error font-bold">{m.currentStock} {m.unit}</td>
                          <td>{m.minLevel} {m.unit}</td>
                          <td>
                            <button onClick={() => window.location.href='/enquiry'} className="text-primary hover:underline text-sm font-semibold">Create Enquiry</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="card lg:col-span-3">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-error" />
              Critical Stock Alerts
            </h3>
            <div className="table-container">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th>Min Level</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.filter(m => m.currentStock <= m.minLevel).slice(0, 5).map(m => (
                    <tr key={m.id}>
                      <td className="font-medium">{m.name}</td>
                      <td>{m.category}</td>
                      <td className="text-error font-bold">{m.currentStock} {m.unit}</td>
                      <td>{m.minLevel} {m.unit}</td>
                      <td>
                        <button onClick={() => window.location.href='/enquiry'} className="text-primary hover:underline text-sm font-semibold">Create Enquiry</button>
                      </td>
                    </tr>
                  ))}
                  {materials.filter(m => m.currentStock <= m.minLevel).length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-text-gray italic">No critical stock alerts found. All materials are above minimum level!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
