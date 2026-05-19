import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Package, Search, Filter, History, TrendingUp, AlertTriangle, Info, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Inventory() {
  const { materials, grns, issues, deleteMaterial, isAdmin } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalInventoryValue = materials.reduce((acc, m) => acc + (m.currentStock * m.latestPrice), 0);
  const lowStockCount = materials.filter(m => m.currentStock <= m.minLevel).length;

  // Stock Movement Logic
  const getMovementHistory = (matId) => {
    const movements = [];
    
    // Add GRNs
    grns.forEach(grn => {
      const item = grn.items.find(i => i.materialId === matId);
      if (item) {
        movements.push({
          date: grn.grnDate,
          type: 'Purchase GRN',
          ref: grn.id,
          qtyIn: item.receivedQty,
          qtyOut: 0,
          rate: item.unitPrice,
          remarks: grn.remarks
        });
      }
    });

    // Add Issues
    issues.forEach(issue => {
      const item = issue.items.find(i => i.materialId === matId);
      if (item) {
        movements.push({
          date: issue.issueDate,
          type: 'Material Issue',
          ref: issue.id,
          qtyIn: 0,
          qtyOut: item.qty,
          rate: item.rate,
          remarks: issue.purpose
        });
      }
    });

    return movements.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Inventory & Stock Value</h1>
          <p className="text-text-gray">Real-time stock monitoring with Latest Rate valuation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="card bg-primary text-white p-6">
            <div className="flex justify-between items-start mb-4">
               <Package className="w-8 h-8 opacity-50" />
               <span className="text-[10px] bg-white/20 px-2 py-1 rounded font-bold uppercase">Live</span>
            </div>
            <p className="text-xs uppercase tracking-wider font-semibold opacity-80">Total Inventory Value</p>
            <p className="text-2xl font-bold mt-1">₹{totalInventoryValue.toLocaleString('en-IN')}</p>
         </div>
         <div className="card p-6 border-l-4 border-l-primary">
            <p className="text-xs text-text-gray uppercase tracking-wider font-semibold">Total Items</p>
            <p className="text-2xl font-bold text-text-dark mt-1">{materials.length}</p>
         </div>
         <div className="card p-6 border-l-4 border-l-error">
            <p className="text-xs text-text-gray uppercase tracking-wider font-semibold">Low Stock Items</p>
            <p className="text-2xl font-bold text-error mt-1">{lowStockCount}</p>
         </div>
         <div className="card p-6 border-l-4 border-l-success">
            <p className="text-xs text-text-gray uppercase tracking-wider font-semibold">Active Categories</p>
            <p className="text-2xl font-bold text-success mt-1">{new Set(materials.map(m => m.category)).size}</p>
         </div>
      </div>

      <div className="card p-4 flex flex-col md:flex-row gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-gray" />
            <input 
               type="text" 
               placeholder="Search inventory..." 
               className="input-field pl-10"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
            />
         </div>
         <button className="btn-primary bg-white text-text-gray border border-border">
            <Filter className="w-4 h-4" /> Filter By Category
         </button>
      </div>

      <div className="table-container">
         <table className="erp-table">
            <thead>
               <tr>
                  <th>Code</th>
                  <th>Material Name</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th className="text-right">Balance Qty</th>
                  <th className="text-right">Min Stock</th>
                  <th className="text-right">Latest Rate</th>
                  <th className="text-right">Stock Value</th>
                  <th>Status</th>
                  <th>Actions</th>
               </tr>
            </thead>
            <tbody>
               {filteredMaterials.map(m => {
                  const status = m.currentStock <= m.minLevel ? 'Critical' : m.currentStock <= m.minLevel * 1.5 ? 'Low' : 'OK';
                  const stockValue = m.currentStock * m.latestPrice;
                  return (
                    <tr key={m.id}>
                       <td className="font-semibold text-primary">{m.id}</td>
                       <td className="font-medium">{m.name}</td>
                       <td>{m.category}</td>
                       <td>{m.unit}</td>
                       <td className="text-right font-bold">{m.currentStock}</td>
                       <td className="text-right text-text-gray">{m.minLevel}</td>
                       <td className="text-right">₹{m.latestPrice.toLocaleString()}</td>
                       <td className="text-right font-bold text-primary">₹{stockValue.toLocaleString()}</td>
                       <td>
                          <span className={cn(
                             "badge",
                             status === 'OK' ? "badge-success" : status === 'Low' ? "badge-warning" : "badge-error"
                          )}>
                             {status}
                          </span>
                       </td>
                        <td>
                           <div className="flex gap-2">
                             <button 
                               onClick={() => setSelectedMaterial(m)}
                               className="p-1 text-primary hover:bg-primary-bg rounded flex items-center gap-1 text-xs font-bold"
                             >
                                <History className="w-4 h-4" /> HISTORY
                             </button>
                             {isAdmin && (
                               <button 
                                 onClick={() => {
                                   if (window.confirm('Are you sure you want to delete this material?')) {
                                     deleteMaterial(m.id);
                                   }
                                 }}
                                 className="p-1 text-error hover:bg-error/10 rounded"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             )}
                           </div>
                        </td>
                    </tr>
                  );
               })}
            </tbody>
         </table>
      </div>

      {/* Stock Movement Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[80vh]">
              <div className="bg-primary-dark p-6 text-white flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-xl font-bold">Stock Movement History</h2>
                    <p className="text-white/70 text-sm">{selectedMaterial.name} ({selectedMaterial.id})</p>
                 </div>
                 <button onClick={() => setSelectedMaterial(null)} className="text-white/70 hover:text-white">
                    <Plus className="w-6 h-6 rotate-45" />
                 </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                 <div className="grid grid-cols-3 gap-6 mb-8">
                    <div className="p-4 bg-primary-bg rounded-lg border border-primary/20">
                       <p className="text-xs text-text-gray uppercase font-bold">Current Stock</p>
                       <p className="text-2xl font-bold text-primary">{selectedMaterial.currentStock} {selectedMaterial.unit}</p>
                    </div>
                    <div className="p-4 bg-primary-bg rounded-lg border border-primary/20">
                       <p className="text-xs text-text-gray uppercase font-bold">Latest Purchase Rate</p>
                       <p className="text-2xl font-bold text-primary">₹{selectedMaterial.latestPrice.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-primary-bg rounded-lg border border-primary/20">
                       <p className="text-xs text-text-gray uppercase font-bold">Current Valuation</p>
                       <p className="text-2xl font-bold text-primary">₹{(selectedMaterial.currentStock * selectedMaterial.latestPrice).toLocaleString()}</p>
                    </div>
                 </div>

                 <div className="table-container shadow-none">
                    <table className="erp-table">
                       <thead>
                          <tr>
                             <th>Date</th>
                             <th>Transaction Type</th>
                             <th>Ref No</th>
                             <th className="text-right">Qty In</th>
                             <th className="text-right">Qty Out</th>
                             <th className="text-right">Balance</th>
                             <th className="text-right">Rate</th>
                          </tr>
                       </thead>
                       <tbody>
                          {getMovementHistory(selectedMaterial.id).map((move, idx, arr) => {
                             // Calculate running balance (simplified for view)
                             return (
                               <tr key={idx}>
                                  <td>{format(new Date(move.date), 'dd-MM-yyyy')}</td>
                                  <td>
                                     <span className={cn(
                                        "text-xs font-bold uppercase",
                                        move.qtyIn > 0 ? "text-success" : "text-error"
                                     )}>
                                        {move.type}
                                     </span>
                                  </td>
                                  <td className="font-medium text-primary">{move.ref}</td>
                                  <td className="text-right text-success font-bold">{move.qtyIn || '-'}</td>
                                  <td className="text-right text-error font-bold">{move.qtyOut || '-'}</td>
                                  <td className="text-right font-bold">-</td> 
                                  <td className="text-right">₹{move.rate.toLocaleString()}</td>
                               </tr>
                             );
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>
              <div className="p-6 bg-primary-bg border-t shrink-0 flex justify-end">
                 <button onClick={() => setSelectedMaterial(null)} className="btn-primary px-8">Close</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
