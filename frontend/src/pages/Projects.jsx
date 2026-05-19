import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Briefcase, Plus, TrendingUp, TrendingDown, DollarSign, PieChart, Info, FileText, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Projects() {
  const { projects, issues, purchaseOrders, canEdit, isAdmin, addProject, updateProject, deleteProject } = useApp();
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    location: '',
    budget: 0,
    status: 'Active'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      const result = await updateProject(editingId, formData);
      if (result) {
        setIsModalOpen(false);
        resetForm();
      }
    } else {
      const result = await addProject(formData);
      if (result) {
        setIsModalOpen(false);
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', client: '', location: '', budget: 0, status: 'Active' });
  };

  const handleEdit = (proj) => {
    setEditingId(proj.id);
    setFormData({
      name: proj.name,
      client: proj.client,
      location: proj.location,
      budget: proj.budget,
      status: proj.status
    });
    setIsModalOpen(true);
  };

  const getProjectCost = (projId) => {
    const materialCost = issues
      .filter(i => i.projectId === projId)
      .reduce((acc, i) => acc + i.totalCost, 0);
    
    return { materialCost, laborCost: materialCost * 0.4, otherCost: materialCost * 0.1 };
  };

  if (selectedProjectId) {
    const proj = projects.find(p => p.id === selectedProjectId);
    const costs = getProjectCost(proj.id);
    const totalCost = costs.materialCost + costs.laborCost + costs.otherCost;
    const variance = proj.budget - totalCost;
    const profit = variance > 0;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
         <div className="flex items-center gap-4">
            <button onClick={() => setSelectedProjectId(null)} className="text-text-gray hover:text-primary">← Back</button>
            <h2 className="text-2xl font-bold">Project Cost Dashboard: {proj.name}</h2>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card p-6 border-l-4 border-l-primary">
               <p className="text-xs text-text-gray uppercase font-bold">Contract Value</p>
               <p className="text-2xl font-bold text-text-dark">₹{proj.budget.toLocaleString()}</p>
            </div>
            <div className="card p-6 border-l-4 border-l-blue-600">
               <p className="text-xs text-text-gray uppercase font-bold">Actual Cost To Date</p>
               <p className="text-2xl font-bold text-text-dark">₹{totalCost.toLocaleString()}</p>
            </div>
            <div className={cn("card p-6 border-l-4", profit ? "border-l-success" : "border-l-error")}>
               <p className="text-xs text-text-gray uppercase font-bold">Estimated P/L</p>
               <p className={cn("text-2xl font-bold", profit ? "text-success" : "text-error")}>
                  {profit ? <TrendingUp className="inline w-5 h-5 mr-1" /> : <TrendingDown className="inline w-5 h-5 mr-1" />}
                  ₹{Math.abs(variance).toLocaleString()}
               </p>
            </div>
            <div className="card p-6 border-l-4 border-l-warning">
               <p className="text-xs text-text-gray uppercase font-bold">Margin %</p>
               <p className="text-2xl font-bold text-text-dark">{((variance / proj.budget) * 100).toFixed(1)}%</p>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 card">
               <h3 className="text-lg font-semibold mb-6 flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" /> Cost Breakdown</h3>
               <table className="erp-table">
                  <thead>
                     <tr>
                        <th>Category</th>
                        <th className="text-right">Budgeted</th>
                        <th className="text-right">Actual</th>
                        <th className="text-right">Variance</th>
                        <th>Status</th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr>
                        <td className="font-medium">Materials</td>
                        <td className="text-right">₹{(proj.budget * 0.5).toLocaleString()}</td>
                        <td className="text-right font-bold">₹{costs.materialCost.toLocaleString()}</td>
                        <td className="text-right">₹{(proj.budget * 0.5 - costs.materialCost).toLocaleString()}</td>
                        <td><span className="badge badge-success">On Track</span></td>
                     </tr>
                     <tr>
                        <td className="font-medium">Labour & Site Exp</td>
                        <td className="text-right">₹{(proj.budget * 0.3).toLocaleString()}</td>
                        <td className="text-right font-bold">₹{costs.laborCost.toLocaleString()}</td>
                        <td className="text-right">₹{(proj.budget * 0.3 - costs.laborCost).toLocaleString()}</td>
                        <td><span className="badge badge-success">On Track</span></td>
                     </tr>
                     <tr>
                        <td className="font-medium">Tools & Machinery</td>
                        <td className="text-right">₹{(proj.budget * 0.1).toLocaleString()}</td>
                        <td className="text-right font-bold">₹{costs.otherCost.toLocaleString()}</td>
                        <td className="text-right">₹{(proj.budget * 0.1 - costs.otherCost).toLocaleString()}</td>
                        <td><span className="badge badge-warning">Caution</span></td>
                     </tr>
                  </tbody>
                  <tfoot className="bg-primary-bg font-bold">
                     <tr>
                        <td className="p-3">TOTAL</td>
                        <td className="p-3 text-right">₹{proj.budget.toLocaleString()}</td>
                        <td className="p-3 text-right text-primary">₹{totalCost.toLocaleString()}</td>
                        <td className="p-3 text-right">₹{variance.toLocaleString()}</td>
                        <td></td>
                     </tr>
                  </tfoot>
               </table>
            </div>

            <div className="card">
               <h3 className="text-lg font-semibold mb-6 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Recent Site Issues</h3>
               <div className="space-y-4">
                  {issues.filter(i => i.projectId === proj.id).slice(0, 5).map(issue => (
                     <div key={issue.id} className="p-3 border border-border rounded-lg hover:bg-primary-bg transition-colors cursor-pointer">
                        <div className="flex justify-between items-start">
                           <p className="text-sm font-bold text-primary">{issue.id}</p>
                           <span className="text-[10px] text-text-gray">{format(new Date(issue.issueDate), 'dd MMM')}</span>
                        </div>
                        <p className="text-xs text-text-gray mt-1 truncate">{issue.purpose}</p>
                        <p className="text-sm font-bold mt-2">₹{issue.totalCost.toLocaleString()}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Projects / Work Orders</h1>
          <p className="text-text-gray">Monitor project progress, budgets, and actual costing.</p>
        </div>
        {canEdit && (
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Work Order
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
         {projects.map(proj => {
            const { materialCost, laborCost, otherCost } = getProjectCost(proj.id);
            const actual = materialCost + laborCost + otherCost;
            const progress = (actual / proj.budget) * 100;
            return (
              <div key={proj.id} className="card hover:shadow-lg transition-all border-t-4 border-t-primary cursor-pointer" onClick={() => setSelectedProjectId(proj.id)}>
                 <div className="flex justify-between items-start mb-4">
                    <span className={cn(
                       "badge",
                       proj.status === 'Active' ? "badge-success" : "badge-warning"
                    )}>{proj.status}</span>
                    <div className="flex items-center gap-2">
                       {isAdmin && (
                          <div className="flex gap-2">
                             <button 
                                onClick={(e) => {
                                   e.stopPropagation();
                                   handleEdit(proj);
                                }}
                                className="p-1 text-primary hover:bg-primary-bg rounded"
                             >
                                <Edit2 className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={(e) => {
                                   e.stopPropagation();
                                   if (window.confirm('Are you sure you want to delete this project?')) {
                                      console.log("Deleting project with ID:", proj._id || proj.id);
                                      deleteProject(proj._id || proj.id);
                                   }
                                }}
                                className="p-1 text-error hover:bg-error/10 rounded"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                       )}
                       <p className="text-xs font-bold text-text-gray">{proj.id}</p>
                    </div>
                 </div>
                 <h3 className="text-xl font-bold text-text-dark mb-1">{proj.name}</h3>
                 <p className="text-sm text-text-gray mb-6">{proj.client}</p>
                 
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                       <span className="text-text-gray">Budget Utilization</span>
                       <span className="text-primary">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-primary-bg rounded-full overflow-hidden">
                       <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                    </div>
                 </div>

                 <div className="mt-8 pt-6 border-t border-border flex justify-between items-end">
                    <div>
                       <p className="text-[10px] text-text-gray uppercase font-bold">Total Cost</p>
                       <p className="text-lg font-bold text-text-dark">₹{actual.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-text-gray uppercase font-bold">Budget</p>
                       <p className="text-sm font-semibold text-text-gray">₹{proj.budget.toLocaleString()}</p>
                    </div>
                 </div>
              </div>
            );
         })}
      </div>

      {/* Add Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-primary-dark p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Work Order' : 'New Work Order'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="text-white/70 hover:text-white">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-gray mb-1">Project Name</label>
                  <input 
                    type="text" 
                    required 
                    className="input-field" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-gray mb-1">Client Name</label>
                  <input 
                    type="text" 
                    required
                    className="input-field" 
                    value={formData.client}
                    onChange={(e) => setFormData({...formData, client: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-gray mb-1">Location</label>
                  <input 
                    type="text" 
                    required
                    className="input-field" 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-gray mb-1">Budget (Contract Value)</label>
                  <input 
                    type="number" 
                    required
                    className="input-field text-right" 
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-md border border-border text-text-gray hover:bg-primary-bg"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-8">
                  {editingId ? 'Update Project' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
