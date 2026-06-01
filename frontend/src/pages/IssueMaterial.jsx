import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Autocomplete from '../components/ui/Autocomplete';
import { ArrowUpRight, Plus, Trash2, CheckCircle, Package, History, Eye, X, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function IssueMaterial() {
  const { materials, projects, issues, addIssue, deleteIssue, deductStockOnIssue, isAdmin, addProject, purchaseOrders } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  // ─── PDF Generator ────────────────────────────────────────────────────────
  const generatePDF = (issue) => {
    const doc = new jsPDF();
    const projName = projects.find(p => p.id === issue.projectId)?.name || 'Unknown Project';

    // Header banner
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, 210, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DEEPIKA BUILTECH PRIVATE LIMITED', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('No. 12, Main Road, Industrial Suburb, Bangalore - 560010', 105, 27, { align: 'center' });
    doc.text('GSTIN: 29ABCDE1234F1Z5  |  Tel: +91 80 1234 5678', 105, 34, { align: 'center' });

    // Issue Slip Title strip
    doc.setFillColor(239, 246, 255);
    doc.rect(0, 42, 210, 12, 'F');
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MATERIAL ISSUE SLIP', 14, 51);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Issue No: ${issue.id}`, 140, 48);
    doc.text(`Date: ${format(new Date(issue.issueDate), 'dd-MM-yyyy')}`, 140, 54);

    // Meta Boxes
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(14, 60, 85, 38);
    doc.rect(111, 60, 85, 38);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('PROJECT ALLOCATION', 17, 67);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(projName, 17, 74);
    doc.text(`Work Order / PO: ${issue.workOrderNo || '—'}`, 17, 80);
    doc.text(`Remarks / Purpose: ${issue.purpose || '—'}`, 17, 86);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('DISPATCH DETAILS', 114, 67);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(`Issued To: ${issue.issuedTo || '—'}`, 114, 74);
    doc.text(`Status: Dispatched`, 114, 80);

    // Items Table
    const tableData = issue.items.map((item, idx) => [
      idx + 1,
      item.name,
      item.qty,
      item.unit || 'Nos',
      `Rs. ${Number(item.rate).toLocaleString()}`,
      `Rs. ${Number(item.qty * item.rate).toLocaleString()}`
    ]);

    const tableConfig = {
      startY: 104,
      head: [['#', 'Material Description', 'Quantity', 'Unit', 'LPR Rate', 'Total Cost']],
      body: tableData,
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 8 },
        2: { halign: 'right', cellWidth: 24 },
        4: { halign: 'right', cellWidth: 32 },
        5: { halign: 'right', cellWidth: 32 }
      },
      alternateRowStyles: { fillColor: [245, 247, 255] },
    };

    if (typeof doc.autoTable === 'function') {
      doc.autoTable(tableConfig);
    } else {
      const autoTableFunc = typeof autoTable === 'function' ? autoTable : autoTable?.default;
      if (typeof autoTableFunc === 'function') {
        autoTableFunc(doc, tableConfig);
      } else {
        throw new Error("autoTable plugin is not loaded correctly.");
      }
    }

    const finalY = (doc.lastAutoTable?.finalY || doc.previousAutoTable?.finalY || 150) + 5;

    // Grand Total Box
    doc.setFillColor(245, 247, 255);
    doc.rect(120, finalY, 76, 12, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('Grand Total:', 125, finalY + 8);
    doc.text(`Rs. ${Number(issue.totalCost).toLocaleString()}`, 193, finalY + 8, { align: 'right' });

    // Signature lines
    const sigY = finalY + 28;
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.line(14, sigY, 70, sigY);
    doc.line(140, sigY, 196, sigY);
    doc.text('Issued By (Store Keeper)', 14, sigY + 5);
    doc.text('Received By (Site Rep)', 140, sigY + 5);

    doc.save(`${issue.id}.pdf`);
    toast.success('Material Issue PDF downloaded!');
  };
  
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
                               <button onClick={() => setSelectedIssue(issue)} className="p-1 text-primary hover:bg-primary-bg rounded" title="View Issue Details"><Eye className="w-4 h-4" /></button>
                               <button onClick={() => generatePDF(issue)} className="p-1 text-success hover:bg-success/10 rounded" title="Download Issue PDF"><Download className="w-4 h-4" /></button>
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

      {/* ─── Issue Detail Modal ───────────────────────────────────────── */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-xl font-bold text-text-dark">Material Issue — {selectedIssue.id}</h2>
                <p className="text-sm text-text-gray">{format(new Date(selectedIssue.issueDate), 'dd-MM-yyyy')}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => generatePDF(selectedIssue)}
                  className="btn-primary flex items-center gap-2 bg-white text-primary border border-primary hover:bg-primary-bg py-1.5 px-3 rounded-lg text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button onClick={() => setSelectedIssue(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-text-gray" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* Meta Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Project', value: projects.find(p => p.id === selectedIssue.projectId)?.name || '—' },
                  { label: 'Work Order / PO', value: selectedIssue.workOrderNo || '—' },
                  { label: 'Issued To', value: selectedIssue.issuedTo || '—' },
                  { label: 'Purpose / Remarks', value: selectedIssue.purpose || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-primary-bg p-3 rounded-lg">
                    <p className="text-xs text-text-gray uppercase tracking-wide">{label}</p>
                    <p className="font-semibold text-text-dark mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {/* Items Table */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-primary/10 text-primary">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Material</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-left">Unit</th>
                      <th className="px-4 py-2 text-right">Rate (LPR)</th>
                      <th className="px-4 py-2 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedIssue.items.map((item, idx) => (
                      <tr key={idx} className="border-t border-border hover:bg-gray-50">
                        <td className="px-4 py-2 text-text-gray">{idx + 1}</td>
                        <td className="px-4 py-2 font-medium">{item.name}</td>
                        <td className="px-4 py-2 text-right font-bold text-primary">{item.qty}</td>
                        <td className="px-4 py-2 text-text-gray">{item.unit}</td>
                        <td className="px-4 py-2 text-right">₹{Number(item.rate).toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-bold text-primary">₹{(item.qty * item.rate).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-primary-bg">
                    <tr>
                      <td colSpan="5" className="px-4 py-3 text-right font-bold text-text-dark">Grand Total:</td>
                      <td className="px-4 py-3 text-right font-bold text-primary text-lg">₹{Number(selectedIssue.totalCost).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
