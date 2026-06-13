import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wrench, Plus, History, User, Calendar, CheckCircle2, AlertCircle, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Tools() {
  const { tools, setTools, addTool, updateTool, deleteTool, toolIssues, addToolIssue, updateToolIssue, deleteToolIssue, projects, isAdmin, isStoreTeam } = useApp();
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showAddToolModal, setShowAddToolModal] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [toolFormData, setToolFormData] = useState({
    name: '',
    category: 'Machinery',
    totalQty: 1,
    repairQty: 0
  });

  const handleOpenAddModal = () => {
    setEditingTool(null);
    setToolFormData({
      name: '',
      category: 'Machinery',
      totalQty: 1,
      repairQty: 0
    });
    setShowAddToolModal(true);
  };

  const handleOpenEditModal = (tool) => {
    setEditingTool(tool);
    setToolFormData({
      name: tool.name,
      category: tool.category,
      totalQty: tool.totalQty,
      repairQty: tool.repairQty
    });
    setShowAddToolModal(true);
  };

  const handleSubmitTool = (e) => {
    e.preventDefault();
    const totalQty = parseInt(toolFormData.totalQty) || 0;
    const repairQty = parseInt(toolFormData.repairQty) || 0;

    if (!toolFormData.name.trim()) {
      toast.error("Please enter a tool name.");
      return;
    }
    if (totalQty <= 0) {
      toast.error("Total quantity must be greater than zero.");
      return;
    }
    if (repairQty < 0) {
      toast.error("Repair quantity cannot be negative.");
      return;
    }
    if (repairQty > totalQty) {
      toast.error("Repair quantity cannot exceed total quantity.");
      return;
    }

    if (editingTool) {
      const issuedQty = editingTool.totalQty - editingTool.availableQty - editingTool.repairQty;
      const newAvailable = totalQty - repairQty - issuedQty;
      if (newAvailable < 0) {
        toast.error(`Cannot reduce stock. ${issuedQty} units are currently issued, so available quantity would become negative.`);
        return;
      }
      
      updateTool(editingTool.id, {
        name: toolFormData.name,
        category: toolFormData.category,
        totalQty: totalQty,
        repairQty: repairQty
      });
    } else {
      addTool({
        name: toolFormData.name,
        category: toolFormData.category,
        totalQty: totalQty,
        repairQty: repairQty
      });
    }

    setShowAddToolModal(false);
  };

  const [formData, setFormData] = useState({
    toolId: '',
    qty: 1,
    issuedTo: '',
    projectId: '',
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    expectedReturnDate: '',
  });

  const handleSubmitIssue = async (e) => {
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
    if (!formData.projectId || !formData.projectId.trim()) {
      toast.error("Please enter or select a project.");
      return;
    }
    if (!formData.expectedReturnDate) {
      toast.error("Please set an expected return date.");
      return;
    }

    // Create the new issue
    const newIssue = {
      toolId: formData.toolId,
      toolName: tool.name,
      qty: parseInt(formData.qty),
      issuedTo: formData.issuedTo,
      projectId: formData.projectId,
      issueDate: formData.issueDate,
      expectedReturnDate: formData.expectedReturnDate
    };

    const success = await addToolIssue(newIssue);
    if (success) {
      // Update tool stock (decrement availableQty)
      await updateTool(formData.toolId, {
        availableQty: tool.availableQty - parseInt(formData.qty)
      });

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
    }
  };

  const handleReturnTool = async (issueId) => {
    const issue = toolIssues.find(i => i.id === issueId || i._id === issueId);
    if (!issue) return;
    const tool = tools.find(t => t.id === issue.toolId);
    if (!tool) return;

    // Update status to 'Returned'
    const dbId = issue._id || issue.id;
    const success = await updateToolIssue(dbId, { status: 'Returned' });
    if (success) {
      // Update tool stock (increment availableQty)
      await updateTool(tool.id, {
        availableQty: tool.availableQty + issue.qty
      });
      toast.success("Tool marked as Returned. Stock updated!");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Tool & Equipment Management</h1>
          <p className="text-text-gray">Track welding machines, drilling tools, safety harnesses, and precision instruments.</p>
        </div>
        <div className="flex gap-3">
          {isStoreTeam && (
            <button onClick={handleOpenAddModal} className="px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-white rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer">
              <Plus className="w-4 h-4" /> Register Tool
            </button>
          )}
          <button 
            onClick={() => setShowIssueForm(true)} 
            className="btn-primary flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/10"
            disabled={tools.length === 0}
          >
            <Plus className="w-4 h-4" /> Issue Tool
          </button>
        </div>
      </div>

      {tools.length === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-slate-200 bg-white/50 backdrop-blur-md rounded-2xl">
          <div className="p-4 bg-primary/10 rounded-full text-primary mb-4 animate-pulse">
            <Wrench className="w-12 h-12" />
          </div>
          <h3 className="font-bold text-lg text-text-dark">No Tools Registered</h3>
          <p className="text-text-gray max-w-sm mt-1 text-sm">Register new welding machines, drill machines, grinders, safety gear, or instruments to start tracking them.</p>
          {isStoreTeam && (
            <button onClick={handleOpenAddModal} className="btn-primary flex items-center gap-2 mt-5 cursor-pointer shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" /> Register First Tool
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {tools.map(tool => (
              <div key={tool.id} className="card p-6 flex flex-col justify-between group hover:border-primary transition-all duration-300">
                 <div className="flex justify-between items-start">
                    <div className="p-3 bg-primary-bg rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                       <Wrench className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className="badge badge-primary">{tool.category}</span>
                       <div className="flex gap-1">
                         {isStoreTeam && (
                           <button 
                             onClick={() => handleOpenEditModal(tool)}
                             className="p-1 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors cursor-pointer"
                             title="Edit Tool"
                           >
                             <Pencil className="w-3.5 h-3.5" />
                           </button>
                         )}
                         {isAdmin && (
                           <button 
                             onClick={() => {
                               if (window.confirm('Are you sure you want to delete this tool?')) {
                                 deleteTool(tool.id);
                               }
                             }}
                             className="p-1 text-error hover:bg-error/10 rounded-md transition-colors cursor-pointer"
                             title="Delete Tool"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                         )}
                       </div>
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
      )}

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
                      const project = projects.find(p => p.id === issue.projectId || p._id === issue.projectId || p.name === issue.projectId);
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
                              {project ? project.name : (issue.projectId || 'N/A')}
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
                      value={formData.qty === 0 || formData.qty === '0' ? '' : formData.qty}
                      onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
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
                  <input 
                    type="text" 
                    list="projects-datalist"
                    required 
                    placeholder="Type or select a project..."
                    className="input-field text-sm"
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  />
                  <datalist id="projects-datalist">
                    {projects.map(p => (
                      <option key={p.id || p._id} value={p.name} />
                    ))}
                  </datalist>
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

      {/* Register/Edit Tool Glassmorphic Modal */}
      {showAddToolModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="bg-gradient-to-r from-primary-dark to-primary p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{editingTool ? 'Edit Tool Details' : 'Register New Tool/Equipment'}</h2>
                  <p className="text-xs text-white/70 mt-0.5">{editingTool ? 'Update total stock and maintenance records' : 'Initialize a new tool in the local registry'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddToolModal(false)} 
                className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitTool} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-gray uppercase tracking-wider mb-1">Tool / Equipment Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Magnetic Core Drill Machine"
                    className="input-field text-sm"
                    value={toolFormData.name}
                    onChange={(e) => setToolFormData({ ...toolFormData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-gray uppercase tracking-wider mb-1">Category</label>
                  <select 
                    required 
                    className="input-field text-sm"
                    value={toolFormData.category}
                    onChange={(e) => setToolFormData({ ...toolFormData, category: e.target.value })}
                  >
                    <option value="Machinery">Machinery</option>
                    <option value="Power Tools">Power Tools</option>
                    <option value="Hand Tools">Hand Tools</option>
                    <option value="Safety Gear">Safety Gear</option>
                    <option value="Instruments">Instruments</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-gray uppercase tracking-wider mb-1">Total Quantity</label>
                    <input 
                      type="number" 
                      min="1"
                      required
                      className="input-field text-sm"
                      value={toolFormData.totalQty === 0 || toolFormData.totalQty === '0' ? '' : toolFormData.totalQty}
                      onChange={(e) => setToolFormData({ ...toolFormData, totalQty: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-gray uppercase tracking-wider mb-1">Quantity in Repair / Maintenance</label>
                    <input 
                      type="number" 
                      min="0"
                      required
                      className="input-field text-sm"
                      value={toolFormData.repairQty === 0 || toolFormData.repairQty === '0' ? '' : toolFormData.repairQty}
                      onChange={(e) => setToolFormData({ ...toolFormData, repairQty: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddToolModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-500 font-bold hover:bg-slate-50 text-sm transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark text-sm shadow-lg shadow-primary/20 transition-all cursor-pointer"
                >
                  {editingTool ? 'Save Changes' : 'Register Tool'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
