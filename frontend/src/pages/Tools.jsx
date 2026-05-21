import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wrench, Plus, History, User, Calendar, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Tools() {
  const { tools, setTools, deleteTool, toolIssues, setToolIssues, projects, isAdmin } = useApp();
  const [showIssueForm, setShowIssueForm] = useState(false);

  const [formData, setFormData] = useState({
    toolId: '',
    qty: 1,
    issuedTo: '',
    projectId: '',
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    expectedReturnDate: '',
  });

  const handleSubmitIssue = (e) => {
    e.preventDefault();
    const tool = tools.find(t => t.id === formData.toolId);
    if (!tool) {
      toast.error("Please select a valid tool.");
      return;
    }
    if (formData.qty <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }
    if (formData.qty > tool.availableQty) {
      toast.error(`Only ${tool.availableQty} units of ${tool.name} are available.`);
      return;
    }
    if (!formData.issuedTo.trim()) {
      toast.error("Please enter the name of the employee receiving the tool.");
      return;
    }
    if (!formData.projectId) {
      toast.error("Please select a project.");
      return;
    }
    if (!formData.expectedReturnDate) {
      toast.error("Please set an expected return date.");
      return;
    }

    // Create the new issue
    const newIssue = {
      id: `TLI-${String(toolIssues.length + 1).padStart(3, '0')}`,
      toolId: formData.toolId,
      toolName: tool.name,
      qty: parseInt(formData.qty),
      issuedTo: formData.issuedTo,
      projectId: formData.projectId,
      issueDate: formData.issueDate,
      expectedReturnDate: formData.expectedReturnDate,
      status: 'Issued'
    };

    // Update tool stock (decrement availableQty)
    const updatedTools = tools.map(t => 
      t.id === formData.toolId ? { ...t, availableQty: t.availableQty - parseInt(formData.qty) } : t
    );
    setTools(updatedTools);
    setToolIssues([newIssue, ...toolIssues]);

    toast.success(`${tool.name} issued successfully!`);
    setShowIssueForm(false);
    
    // Reset form
    setFormData({
      toolId: '',
      qty: 1,
      issuedTo: '',
      projectId: '',
      issueDate: format(new Date(), 'yyyy-MM-dd'),
      expectedReturnDate: '',
    });
  };

  const handleReturnTool = (issueId) => {
    const issue = toolIssues.find(i => i.id === issueId);
    if (!issue) return;

    // Update status to 'Returned'
    const updatedIssues = toolIssues.map(i => 
      i.id === issueId ? { ...i, status: 'Returned' } : i
    );
    setToolIssues(updatedIssues);

    // Update tool stock (increment availableQty)
    const updatedTools = tools.map(t => 
      t.id === issue.toolId ? { ...t, availableQty: t.availableQty + issue.qty } : t
    );
    setTools(updatedTools);

    toast.success("Tool marked as Returned. Stock updated!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Tool & Equipment Management</h1>
          <p className="text-text-gray">Track welding machines, drilling tools, safety harnesses, and precision instruments.</p>
        </div>
        <button onClick={() => setShowIssueForm(true)} className="btn-primary flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/10">
          <Plus className="w-4 h-4" /> Issue Tool
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {tools.map(tool => (
            <div key={tool.id} className="card p-6 flex flex-col justify-between group hover:border-primary transition-all duration-300">
               <div className="flex justify-between items-start">
                  <div className="p-3 bg-primary-bg rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                     <Wrench className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <span className="badge badge-primary">{tool.category}</span>
                     {isAdmin && (
                       <button 
                         onClick={() => {
                           if (window.confirm('Are you sure you want to delete this tool?')) {
                             deleteTool(tool.id);
                           }
                         }}
                         className="p-1.5 text-error hover:bg-error/10 rounded-md transition-colors"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     )}
                  </div>
               </div>
               <div className="mt-4">
                  <h3 className="font-bold text-lg text-text-dark group-hover:text-primary transition-colors">{tool.name}</h3>
                  <p className="text-[10px] text-text-gray uppercase tracking-widest font-bold mt-1">{tool.id}</p>
               </div>
               <div className="mt-6 grid grid-cols-3 gap-2 border-t pt-4 border-border">
                  <div className="text-center">
                     <p className="text-[10px] text-text-gray uppercase font-bold">Total</p>
                     <p className="font-bold text-text-dark mt-0.5">{tool.totalQty}</p>
                  </div>
                  <div className="text-center border-x border-border">
                     <p className="text-[10px] text-text-gray uppercase font-bold">Available</p>
                     <p className="font-bold text-success mt-0.5">{tool.availableQty}</p>
                  </div>
                  <div className="text-center">
                     <p className="text-[10px] text-text-gray uppercase font-bold">Repair</p>
                     <p className="font-bold text-error mt-0.5">{tool.repairQty}</p>
                  </div>
               </div>
            </div>
         ))}
      </div>

      <div className="card overflow-hidden border border-slate-100 shadow-sm">
         <div className="p-4 bg-primary-dark text-white font-semibold flex items-center gap-2">
            <History className="w-5 h-5" /> Active Tool Issues
         </div>
         <div className="table-container shadow-none border-none">
            <table className="erp-table">
               <thead>
                  <tr>
                     <th>Tool Name</th>
                     <th>Issued To</th>
                     <th>Project / Site</th>
                     <th>Issue Date</th>
                     <th>Expected Return</th>
                     <th>Status</th>
                     <th>Actions</th>
                  </tr>
               </thead>
                <tbody>
                  {toolIssues.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-text-gray italic">No active tool issues found.</td>
                    </tr>
                  ) : (
                    toolIssues.map(issue => {
                      const tool = tools.find(t => t.id === issue.toolId);
                      const project = projects.find(p => p.id === issue.projectId);
                      return (
                        <tr key={issue.id} className="hover:bg-slate-50 transition-colors">
                          <td className="font-semibold text-text-dark">
                            <div>{tool?.name || issue.toolName}</div>
                            <div className="text-[10px] text-text-gray uppercase tracking-widest font-bold mt-0.5">{issue.toolId}</div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded bg-slate-100 text-slate-600">
                                <User className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-medium text-sm text-text-dark">{issue.issuedTo}</span>
                            </div>
                          </td>
                          <td>
                            <span className="font-semibold text-xs text-text-dark bg-slate-100 px-2.5 py-1 rounded">
                              {project?.name || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5 text-xs text-text-gray font-medium">
                              <Calendar className="w-3.5 h-3.5" />
                              {issue.issueDate ? format(new Date(issue.issueDate), 'dd-MM-yyyy') : 'N/A'}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5 text-xs text-text-gray font-medium">
                              <Calendar className="w-3.5 h-3.5" />
                              {issue.expectedReturnDate ? format(new Date(issue.expectedReturnDate), 'dd-MM-yyyy') : 'N/A'}
                            </div>
                          </td>
                          <td>
                            <span className={cn(
                              "badge",
                              issue.status === 'Returned' ? "badge-success" : "badge-warning animate-pulse"
                            )}>
                              {issue.status} (Qty: {issue.qty})
                            </span>
                          </td>
                          <td>
                            {issue.status === 'Issued' && (
                              <button 
                                onClick={() => handleReturnTool(issue.id)}
                                className="flex items-center gap-1 text-xs font-bold text-success px-2.5 py-1.5 bg-success/10 rounded-lg hover:bg-success hover:text-white transition-all cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Return
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
            </table>
         </div>
      </div>

      {/* Issue Tool Glassmorphic Modal */}
      {showIssueForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="bg-gradient-to-r from-primary-dark to-primary p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Issue Tool & Equipment</h2>
                  <p className="text-xs text-white/70 mt-0.5">Deduct stock and register active issue log</p>
                </div>
              </div>
              <button 
                onClick={() => setShowIssueForm(false)} 
                className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitIssue} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-gray uppercase tracking-wider mb-1">Select Tool</label>
                  <select 
                    required 
                    className="input-field text-sm"
                    value={formData.toolId}
                    onChange={(e) => setFormData({ ...formData, toolId: e.target.value })}
                  >
                    <option value="">-- Choose Tool --</option>
                    {tools.map(t => (
                      <option key={t.id} value={t.id} disabled={t.availableQty <= 0}>
                        {t.name} (Code: {t.id} | Avail: {t.availableQty})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-gray uppercase tracking-wider mb-1">Quantity to Issue</label>
                    <input 
                      type="number" 
                      min="1"
                      required
                      className="input-field text-sm"
                      value={formData.qty}
                      onChange={(e) => setFormData({ ...formData, qty: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-gray uppercase tracking-wider mb-1">Issued To (Employee)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Rajesh Kumar"
                      className="input-field text-sm"
                      value={formData.issuedTo}
                      onChange={(e) => setFormData({ ...formData, issuedTo: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-gray uppercase tracking-wider mb-1">Assign to Project</label>
                  <select 
                    required 
                    className="input-field text-sm"
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  >
                    <option value="">-- Choose Project --</option>
                    {projects.map(p => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-gray uppercase tracking-wider mb-1">Issue Date</label>
                    <input 
                      type="date" 
                      required
                      className="input-field text-sm"
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-gray uppercase tracking-wider mb-1">Expected Return Date</label>
                    <input 
                      type="date" 
                      required
                      className="input-field text-sm"
                      value={formData.expectedReturnDate}
                      onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowIssueForm(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-bold hover:bg-slate-50 text-sm transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark text-sm shadow-lg shadow-primary/20 transition-all cursor-pointer"
                >
                  Issue Tool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
