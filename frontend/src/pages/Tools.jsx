import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Wrench, Plus, History, User, Calendar, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Tools() {
  const { tools, deleteTool, isAdmin } = useApp();
  const [showIssueForm, setShowIssueForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Tool Management</h1>
          <p className="text-text-gray">Track welding machines, drilling tools, and safety gear.</p>
        </div>
        <button onClick={() => setShowIssueForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Issue Tool
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {tools.map(tool => (
            <div key={tool.id} className="card p-6 flex flex-col justify-between group hover:border-primary transition-all">
               <div className="flex justify-between items-start">
                  <div className="p-3 bg-primary-bg rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
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
                        className="p-1 text-error hover:bg-error/10 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
               </div>
               <div className="mt-4">
                  <h3 className="font-bold text-lg text-text-dark">{tool.name}</h3>
                  <p className="text-xs text-text-gray uppercase tracking-widest font-bold mt-1">{tool.id}</p>
               </div>
               <div className="mt-6 grid grid-cols-3 gap-2 border-t pt-4 border-border">
                  <div className="text-center">
                     <p className="text-[10px] text-text-gray uppercase font-bold">Total</p>
                     <p className="font-bold text-text-dark">{tool.totalQty}</p>
                  </div>
                  <div className="text-center border-x border-border">
                     <p className="text-[10px] text-text-gray uppercase font-bold">Available</p>
                     <p className="font-bold text-success">{tool.availableQty}</p>
                  </div>
                  <div className="text-center">
                     <p className="text-[10px] text-text-gray uppercase font-bold">Repair</p>
                     <p className="font-bold text-error">{tool.repairQty}</p>
                  </div>
               </div>
            </div>
         ))}
      </div>

      <div className="card overflow-hidden">
         <div className="p-4 bg-primary-dark text-white font-semibold flex items-center gap-2">
            <History className="w-5 h-5" /> Active Tool Issues
         </div>
         <div className="table-container shadow-none border-none">
            <table className="erp-table">
               <thead>
                  <tr>
                     <th>Tool Name</th>
                     <th>Issued To</th>
                     <th>Project / WO</th>
                     <th>Issue Date</th>
                     <th>Expected Return</th>
                     <th>Status</th>
                     <th>Actions</th>
                  </tr>
               </thead>
                <tbody>
                  {/* Active tool issues will be loaded from backend in future update */}
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-text-gray italic">No active tool issues found.</td>
                  </tr>
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
