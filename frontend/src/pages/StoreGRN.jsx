import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Autocomplete from '../components/ui/Autocomplete';
import { Warehouse, Plus, Eye, CheckCircle, Package, Truck, UserCheck, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function StoreGRN() {
  const { grns, purchaseOrders, setGrns, deleteGRN, updateStockOnGRN, vendors, setPurchaseOrders, isAdmin } = useApp();
  const [showEntry, setShowEntry] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState('');
  
  const [formData, setFormData] = useState({
    grnDate: format(new Date(), 'yyyy-MM-dd'),
    poRef: '',
    vehicleNo: '',
    driverName: '',
    dcNo: '',
    receivedBy: 'Store Manager',
    items: [],
    remarks: ''
  });

  const handlePOSelect = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      setFormData({
        ...formData,
        poRef: poId,
        items: po.items.map(item => ({
          materialId: item.materialId,
          name: item.itemName,
          poQty: item.qty,
          receivedQty: item.qty,
          rejectedQty: 0,
          damageRemarks: '',
          qualityOk: true,
          unitPrice: item.rate
        }))
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newGRN = {
      id: `GRN-2024-${String(grns.length + 1).padStart(3, '0')}`,
      ...formData,
      vendorName: vendors.find(v => v.id === purchaseOrders.find(p => p.id === formData.poRef)?.vendorId)?.name || 'Unknown Vendor'
    };

    setGrns([...grns, newGRN]);
    
    // Update stock using business logic in context
    updateStockOnGRN(formData.items);

    // Update PO status
    setPurchaseOrders(prev => prev.map(p => 
      p.id === formData.poRef ? { ...p, status: 'Complete' } : p
    ));

    toast.success("GRN saved and Inventory updated!");
    setShowEntry(false);
    setFormData({
      grnDate: format(new Date(), 'yyyy-MM-dd'),
      poRef: '',
      vehicleNo: '',
      driverName: '',
      dcNo: '',
      receivedBy: 'Store Manager',
      items: [],
      remarks: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Store / GRN Management</h1>
          <p className="text-text-gray">Receive materials from vendors and update stock inventory.</p>
        </div>
        {!showEntry && (
          <button onClick={() => setShowEntry(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New GRN Entry
          </button>
        )}
      </div>

      {showEntry ? (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-top-4 duration-300">
           <div className="card grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">PO Reference</label>
                <Autocomplete
                  options={purchaseOrders
                    .filter(p => p.status !== 'Complete')
                    .map(p => ({ ...p, name: `${p.id} - ${vendors.find(v => v.id === p.vendorId)?.name || 'Unknown'}` }))}
                  onSelect={(po) => handlePOSelect(po.id)}
                  placeholder="Search Pending PO..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">GRN Date</label>
                <input type="date" className="input-field" value={formData.grnDate} onChange={e => setFormData({...formData, grnDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">Vehicle No</label>
                <input type="text" placeholder="KA-01-AB-1234" className="input-field" value={formData.vehicleNo} onChange={e => setFormData({...formData, vehicleNo: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">DC / Invoice No</label>
                <input type="text" className="input-field" value={formData.dcNo} onChange={e => setFormData({...formData, dcNo: e.target.value})} />
              </div>
           </div>

           {formData.items.length > 0 && (
             <div className="card overflow-hidden">
                <div className="p-4 bg-primary-dark text-white font-semibold flex items-center gap-2">
                   <Package className="w-5 h-5" /> Material Verification
                </div>
                <table className="erp-table">
                   <thead>
                      <tr>
                         <th>Item</th>
                         <th className="text-right">PO Qty</th>
                         <th className="text-right">Received Qty</th>
                         <th className="text-right">Rejected Qty</th>
                         <th>Damage Remarks</th>
                         <th className="text-center">Quality OK</th>
                      </tr>
                   </thead>
                   <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                           <td className="font-medium">{item.name}</td>
                           <td className="text-right">{item.poQty}</td>
                           <td className="p-2 w-32">
                              <input 
                                type="number" 
                                className="input-field text-right" 
                                value={item.receivedQty}
                                onChange={(e) => {
                                  const newItems = [...formData.items];
                                  newItems[index].receivedQty = Number(e.target.value);
                                  setFormData({...formData, items: newItems});
                                }}
                              />
                           </td>
                           <td className="p-2 w-32">
                              <input 
                                type="number" 
                                className="input-field text-right" 
                                value={item.rejectedQty}
                                onChange={(e) => {
                                  const newItems = [...formData.items];
                                  newItems[index].rejectedQty = Number(e.target.value);
                                  setFormData({...formData, items: newItems});
                                }}
                              />
                           </td>
                           <td className="p-2">
                              <input 
                                type="text" 
                                className="input-field" 
                                placeholder="Any damages?"
                                value={item.damageRemarks}
                                onChange={(e) => {
                                  const newItems = [...formData.items];
                                  newItems[index].damageRemarks = e.target.value;
                                  setFormData({...formData, items: newItems});
                                }}
                              />
                           </td>
                           <td className="text-center">
                              <input 
                                type="checkbox" 
                                className="w-5 h-5"
                                checked={item.qualityOk}
                                onChange={(e) => {
                                  const newItems = [...formData.items];
                                  newItems[index].qualityOk = e.target.checked;
                                  setFormData({...formData, items: newItems});
                                }}
                              />
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           )}

           <div className="card grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-sm font-medium text-text-gray mb-1">Overall Remarks</label>
                 <textarea 
                    className="input-field h-20"
                    value={formData.remarks}
                    onChange={e => setFormData({...formData, remarks: e.target.value})}
                 ></textarea>
              </div>
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-text-gray mb-1">Received By</label>
                    <input type="text" className="input-field" value={formData.receivedBy} onChange={e => setFormData({...formData, receivedBy: e.target.value})} />
                 </div>
                 <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowEntry(false)} className="px-6 py-2 border border-border rounded-md">Cancel</button>
                    <button type="submit" className="btn-primary px-8">Save GRN & Update Inventory</button>
                 </div>
              </div>
           </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 table-container">
              <table className="erp-table">
                 <thead>
                    <tr>
                       <th>GRN No</th>
                       <th>Date</th>
                       <th>PO Ref</th>
                       <th>Vendor</th>
                       <th>Items</th>
                       <th>Actions</th>
                    </tr>
                 </thead>
                 <tbody>
                    {grns.length === 0 ? (
                      <tr><td colSpan="6" className="p-8 text-center text-text-gray italic">No receipts yet.</td></tr>
                    ) : (
                      grns.map(grn => (
                        <tr key={grn.id}>
                           <td className="font-semibold text-primary">{grn.id}</td>
                           <td>{format(new Date(grn.grnDate), 'dd-MM-yyyy')}</td>
                           <td className="text-text-gray">{grn.poRef}</td>
                           <td className="font-medium">{grn.vendorName}</td>
                           <td>{grn.items.length} Items</td>
                           <td>
                              <div className="flex gap-2">
                                 <button className="p-1 text-primary hover:bg-primary-bg rounded"><Eye className="w-4 h-4" /></button>
                                 {isAdmin && (
                                    <button 
                                       onClick={() => {
                                          if (window.confirm('Are you sure you want to delete this GRN?')) {
                                             deleteGRN(grn.id);
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
                      ))
                    )}
                 </tbody>
              </table>
           </div>
           
           <div className="space-y-6">
              <div className="card bg-primary-dark text-white">
                 <h3 className="font-bold mb-4 flex items-center gap-2"><Truck className="w-5 h-5" /> Pending Deliveries</h3>
                 <div className="space-y-3">
                    {purchaseOrders.filter(p => p.status === 'Sent' || p.status === 'Partial').map(p => (
                       <div key={p.id} className="p-3 bg-white/10 rounded-lg border border-white/10">
                          <p className="font-bold">{p.id}</p>
                          <p className="text-xs text-white/70">{vendors.find(v => v.id === p.vendorId)?.name}</p>
                          <div className="mt-2 flex justify-between items-center">
                             <span className="text-[10px] uppercase tracking-wider font-bold text-warning">{p.status}</span>
                             <button onClick={() => { setShowEntry(true); handlePOSelect(p.id); }} className="text-[10px] bg-white text-primary px-2 py-1 rounded font-bold hover:bg-primary-bg">RECEIVE</button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
              <div className="card">
                 <h3 className="font-bold mb-4 flex items-center gap-2 text-text-dark"><UserCheck className="w-5 h-5" /> Today's Statistics</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-primary-bg rounded-lg">
                       <p className="text-xs text-text-gray uppercase">Received</p>
                       <p className="text-xl font-bold text-primary">{grns.filter(g => format(new Date(g.grnDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}</p>
                    </div>
                    <div className="p-3 bg-primary-bg rounded-lg">
                       <p className="text-xs text-text-gray uppercase">Pending</p>
                       <p className="text-xl font-bold text-warning">{purchaseOrders.filter(p => p.status !== 'Complete').length}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
