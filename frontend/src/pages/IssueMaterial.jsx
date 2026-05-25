import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Autocomplete from '../components/ui/Autocomplete';
import { ArrowUpRight, Plus, Trash2, CheckCircle, Package, History, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function IssueMaterial() {
  const { materials, projects, issues, addIssue, deleteIssue, deductStockOnIssue, isAdmin, addProject, purchaseOrders } = useApp();
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    projectId: '',
    workOrderNo: '',
    issuedTo: '',
    purpose: '',
    items: [{ id: Date.now(), materialId: '', name: '', qty: 0, available: 0, unit: '', rate: 0 }]
  });

  const handleProjectSelect = (projId) => {
    const proj = projects.find(p => p.id === projId);
    if (proj) {
      setFormData({ ...formData, projectId: projId });
    }
  };

  const handlePOSelect = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      setFormData({ ...formData, workOrderNo: po.id, projectId: po.projectId });
    }
  };

  const handleItemSelect = (index, material) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      materialId: material.id,
      name: material.name,
      available: material.currentStock,
      unit: material.unit,
      rate: material.latestPrice
    };
    setFormData({ ...formData, items: newItems });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { id: Date.now(), materialId: '', name: '', qty: 0, available: 0, unit: '', rate: 0 }]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate Purchase Order
    if (!purchaseOrders.find(po => po.id === formData.workOrderNo)) {
      toast.error("You must select a valid, existing Purchase Order!");
      return;
    }

    // Check stock availability
    const outOfStock = formData.items.find(item => item.qty > item.available);
    if (outOfStock) {
      toast.error(`Insufficient stock for ${outOfStock.name}!`);
      return;
    }

    const newIssue = {
      ...formData,
      totalCost: formData.items.reduce((acc, i) => acc + (i.qty * i.rate), 0)
    };

    const success = await addIssue(newIssue);
    if (success) {
      await deductStockOnIssue(formData.items);
      setShowForm(false);
      setFormData({
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        projectId: '',
        workOrderNo: '',
        issuedTo: '',
        purpose: '',
        items: [{ id: Date.now(), materialId: '', name: '', qty: 0, available: 0, unit: '', rate: 0 }]
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Issue Material</h1>
          <p className="text-text-gray">Allocate materials from store to specific project sites.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Material Issue
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-top-4 duration-300">
           <div className="card grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                 <label className="block text-sm font-medium text-text-gray mb-1">Issue Date</label>
                 <input type="date" className="input-field" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-text-gray mb-1">Project</label>
                 <Autocomplete
                    options={projects}
                    onSelect={(proj) => handleProjectSelect(proj.id)}
                    placeholder="Search Project..."
                    value={formData.projectId}
                    onAddNew={async (name) => {
                      const newProj = await addProject({ name, client: 'TBD', location: 'TBD', budget: 0, status: 'Active' });
                      if (newProj) handleProjectSelect(newProj.id);
                    }}
                 />
              </div>
              <div>
                 <label className="block text-sm font-medium text-text-gray mb-1">Issued To</label>
                 <input type="text" className="input-field" placeholder="Employee Name" value={formData.issuedTo} onChange={e => setFormData({...formData, issuedTo: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-text-gray mb-1">Purchase Order</label>
                 <Autocomplete
                    options={purchaseOrders.map(po => ({ ...po, name: po.id }))}
                    onSelect={(po) => handlePOSelect(po.id)}
                    placeholder="Select existing PO..."
                    value={formData.workOrderNo}
                 />
              </div>
           </div>

           <div className="card overflow-hidden">
              <div className="p-4 bg-primary-dark text-white font-semibold flex items-center gap-2">
                 <Package className="w-5 h-5" /> Items to Issue
              </div>
              <table className="erp-table">
                 <thead>
                    <tr>
                       <th className="w-1/3">Item Name (Autocomplete)</th>
                       <th className="text-right">Available Stock</th>
                       <th className="text-right">Issue Qty</th>
                       <th>Unit</th>
                       <th className="text-right">Cost (LPR)</th>
                       <th className="text-right">Total Cost</th>
                       <th className="w-12"></th>
                    </tr>
                 </thead>
                 <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={item.id}>
                         <td>
                            <Autocomplete 
                               options={materials}
                               onSelect={(mat) => handleItemSelect(index, mat)}
                               placeholder="Search stock..."
                               value={item.materialId}
                            />
                         </td>
                         <td className="text-right font-medium text-text-gray">{item.available} {item.unit}</td>
                         <td className="p-2 w-32">
                            <input 
                               type="number" 
                               className={cn(
                                 "input-field text-right",
                                 item.qty > item.available ? "border-error focus:ring-error/20" : ""
                               )}
                               value={item.qty}
                               onChange={(e) => {
                                 const newItems = [...formData.items];
                                 newItems[index].qty = Number(e.target.value);
                                 setFormData({...formData, items: newItems});
                               }}
                            />
                         </td>
                         <td><span className="text-xs font-semibold text-text-gray uppercase">{item.unit}</span></td>
                         <td className="text-right">₹{item.rate.toLocaleString()}</td>
                         <td className="text-right font-bold text-primary">₹{(item.qty * item.rate).toLocaleString()}</td>
                         <td>
                            <button 
                               type="button" 
                               onClick={() => setFormData({...formData, items: formData.items.filter(i => i.id !== item.id)})}
                               className="p-1 text-error hover:bg-error/10 rounded"
                            >
                               <Trash2 className="w-4 h-4" />
                            </button>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
              <div className="p-4">
                 <button type="button" onClick={handleAddItem} className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add Item
                 </button>
              </div>
           </div>

           <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-border shadow-sm">
              <div className="flex-1 max-w-md">
                 <label className="block text-sm font-medium text-text-gray mb-1">Remarks</label>
                 <input type="text" className="input-field" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} />
              </div>
              <div className="text-right">
                 <p className="text-sm text-text-gray">Total Consumption Value</p>
                 <p className="text-3xl font-bold text-primary">₹{formData.items.reduce((acc, i) => acc + (i.qty * i.rate), 0).toLocaleString()}</p>
                 <div className="flex gap-3 mt-4">
                    <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border border-border rounded-md">Cancel</button>
                    <button type="submit" className="btn-primary px-8">Confirm Issue</button>
                 </div>
              </div>
           </div>
        </form>
      ) : (
        <div className="table-container">
           <table className="erp-table">
              <thead>
                 <tr>
                    <th>Issue No</th>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Issued To</th>
                    <th>Items</th>
                    <th className="text-right">Total Cost</th>
                    <th>Actions</th>
                 </tr>
              </thead>
              <tbody>
                 {issues.length === 0 ? (
                   <tr><td colSpan="7" className="p-8 text-center text-text-gray italic">No issues recorded yet.</td></tr>
                 ) : (
                   issues.map(issue => (
                     <tr key={issue.id}>
                        <td className="font-semibold text-primary">{issue.id}</td>
                        <td>{format(new Date(issue.issueDate), 'dd-MM-yyyy')}</td>
                        <td className="font-medium">{projects.find(p => p.id === issue.projectId)?.name}</td>
                        <td>{issue.issuedTo}</td>
                        <td>{issue.items.length} Items</td>
                        <td className="text-right font-bold">₹{issue.totalCost.toLocaleString()}</td>
                         <td>
                            <div className="flex gap-2">
                               <button onClick={() => toast("View feature coming soon", { icon: '👁️' })} className="p-1 text-primary hover:bg-primary-bg rounded"><Eye className="w-4 h-4" /></button>
                               {isAdmin && (
                                 <button 
                                   onClick={() => {
                                     if (window.confirm('Are you sure you want to delete this material issue record?')) {
                                       deleteIssue(issue.id);
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
      )}
    </div>
  );
}
