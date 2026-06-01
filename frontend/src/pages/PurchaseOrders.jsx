import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShoppingCart, Eye, Printer, Mail, CheckCircle, FileText,
  Download, Trash2, Plus, X, PlusCircle, MinusCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const UNITS = ['Nos', 'Kg', 'MT', 'Bag', 'Box', 'Pcs', 'Ltr', 'Mtr', 'Sqmt', 'Set', 'Pair'];
const GST_RATES = [0, 5, 12, 18, 28];

const emptyItem = () => ({
  itemCode: '',
  itemName: '',
  qty: 1,
  unit: 'Nos',
  rate: 0,
  gst: 18,
  gstAmt: 0,
  total: 0,
});

export default function PurchaseOrders() {
  const {
    purchaseOrders, addPurchaseOrder, deletePurchaseOrder,
    vendors, projects, isAdmin, isPurchaseTeam, updateVendor
  } = useApp();

  const [selectedPO, setSelectedPO] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // --- Form State ---
  const [form, setForm] = useState({
    vendorId: '',
    projectId: '',
    workOrderNo: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    deliveryDate: '',
    status: 'Sent',
    items: [emptyItem()],
  });
  const [submitting, setSubmitting] = useState(false);

  // ─── PDF Generator ────────────────────────────────────────────────────────
  const generatePDF = (po) => {
    const vendor = vendors.find(v => v.id === po.vendorId);
    const project = projects.find(p => p.id === po.projectId);
    const doc = new jsPDF();

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

    // PO Title strip
    doc.setFillColor(239, 246, 255);
    doc.rect(0, 42, 210, 12, 'F');
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE ORDER', 14, 51);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`PO No: ${po.id}`, 140, 48);
    doc.text(`Date: ${format(new Date(po.date), 'dd-MM-yyyy')}`, 140, 54);

    // Vendor & Project Boxes
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(14, 60, 85, 38);
    doc.rect(111, 60, 85, 38);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('VENDOR', 17, 67);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(vendor?.name || 'N/A', 17, 74);
    doc.text(`Contact: ${vendor?.contact || ''}`, 17, 80);
    doc.text(`Email: ${vendor?.email || ''}`, 17, 86);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('SHIP TO / PROJECT', 114, 67);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(project?.name || 'N/A', 114, 74);
    doc.text(`Work Order: ${po.workOrderNo || ''}`, 114, 80);
    if (po.deliveryDate) {
      doc.text(`Delivery By: ${format(new Date(po.deliveryDate), 'dd-MM-yyyy')}`, 114, 86);
    }

    // Items Table
    const tableData = po.items.map((item, idx) => [
      idx + 1,
      item.itemCode,
      item.itemName,
      item.qty,
      item.unit,
      `₹${Number(item.rate).toLocaleString()}`,
      `${item.gst}%`,
      `₹${Number(item.gstAmt).toLocaleString()}`,
      `₹${Number(item.total).toLocaleString()}`,
    ]);

    const tableConfig = {
      startY: 104,
      head: [['#', 'Code', 'Item Description', 'Qty', 'Unit', 'Rate', 'GST%', 'GST Amt', 'Total']],
      body: tableData,
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 18 },
        2: { cellWidth: 45 },
        5: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
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
    const subtotal = po.items.reduce((acc, i) => acc + (Number(i.rate) * Number(i.qty)), 0);
    const gstTotal = po.items.reduce((acc, i) => acc + Number(i.gstAmt), 0);
    const grandTotal = subtotal + gstTotal;

    // Totals
    doc.setFillColor(245, 247, 255);
    doc.rect(120, finalY, 76, 30, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Subtotal:', 125, finalY + 8);
    doc.text(`₹${subtotal.toLocaleString()}`, 193, finalY + 8, { align: 'right' });
    doc.text('GST Total:', 125, finalY + 15);
    doc.text(`₹${gstTotal.toLocaleString()}`, 193, finalY + 15, { align: 'right' });
    doc.setDrawColor(30, 64, 175);
    doc.line(125, finalY + 18, 193, finalY + 18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text('Grand Total:', 125, finalY + 26);
    doc.text(`₹${grandTotal.toLocaleString()}`, 193, finalY + 26, { align: 'right' });

    // Terms
    const termsY = finalY + 38;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Terms & Conditions:', 14, termsY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('1. Delivery must be made within the specified time frame.', 14, termsY + 6);
    doc.text('2. Materials must be of specified brand and quality standards.', 14, termsY + 12);
    doc.text('3. Payment within 30 days of GRN receipt and invoice submission.', 14, termsY + 18);
    doc.text('4. Any damage during transit is the vendor\'s responsibility.', 14, termsY + 24);

    // Signature lines
    const sigY = termsY + 38;
    doc.setTextColor(30, 30, 30);
    doc.line(14, sigY, 70, sigY);
    doc.line(140, sigY, 196, sigY);
    doc.setFontSize(9);
    doc.text('Authorised Signatory', 14, sigY + 5);
    doc.text('Vendor Acknowledgement', 140, sigY + 5);

    doc.save(`${po.id}.pdf`);
    toast.success('PDF downloaded!');
  };

  // ─── Item Handlers ────────────────────────────────────────────────────────
  const calcItem = (item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const gst = parseFloat(item.gst) || 0;
    const base = qty * rate;
    const gstAmt = parseFloat(((base * gst) / 100).toFixed(2));
    const total = parseFloat((base + gstAmt).toFixed(2));
    return { ...item, gstAmt, total };
  };

  const handleItemChange = (idx, field, value) => {
    const updated = form.items.map((item, i) => {
      if (i !== idx) return item;
      const changed = { ...item, [field]: value };
      return calcItem(changed);
    });
    setForm(f => ({ ...f, items: updated }));
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const resetForm = () => {
    setForm({
      vendorId: '',
      projectId: '',
      workOrderNo: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      deliveryDate: '',
      status: 'Sent',
      items: [emptyItem()],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendorId) return toast.error('Please select a vendor.');
    if (!form.projectId) return toast.error('Please select a project.');
    if (form.items.some(it => !it.itemName.trim())) return toast.error('All items must have a name.');
    setSubmitting(true);
    const result = await addPurchaseOrder({ ...form, date: new Date(form.date).toISOString() });
    setSubmitting(false);
    if (result) {
      setShowForm(false);
      resetForm();
    }
  };

  // ─── Derived totals for form preview ─────────────────────────────────────
  const formSubtotal = form.items.reduce((a, i) => a + (parseFloat(i.rate) || 0) * (parseFloat(i.qty) || 0), 0);
  const formGST = form.items.reduce((a, i) => a + (i.gstAmt || 0), 0);
  const formGrand = formSubtotal + formGST;

  // ─── Detail View ──────────────────────────────────────────────────────────
  // ─── Email Vendor ─────────────────────────────────────────────────────────
  const emailVendor = async (po) => {
    const vendor = vendors.find(v => v.id === po.vendorId);
    let email = vendor?.email;
    
    if (!email || email === 'N/A' || !email.trim()) {
      const inputEmail = window.prompt(`No email address found for vendor "${vendor?.name || 'Unknown'}".\nPlease enter a valid email address:`);
      if (inputEmail === null) return; // User cancelled prompt
      
      const cleanEmail = inputEmail.trim();
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        toast.error("Please enter a valid email address.");
        return;
      }
      
      email = cleanEmail;
      
      // Persist the entered email back to the database and state
      if (vendor) {
        try {
          await updateVendor(vendor._id || vendor.id, { ...vendor, email: cleanEmail });
        } catch (e) {
          console.error("Failed to persist vendor email:", e);
        }
      }
    }

    const subject = encodeURIComponent(`Purchase Order ${po.id} – Deepika Builtech Pvt. Ltd.`);
    const body = encodeURIComponent(
      `Dear ${vendor?.name || 'Vendor'},\n\nPlease find enclosed Purchase Order ${po.id} dated ${format(new Date(po.date), 'dd-MM-yyyy')}.\n\nKindly acknowledge receipt and confirm delivery schedule.\n\nRegards,\nDeepika Builtech Private Limited`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  if (selectedPO) {
    const vendor = vendors.find(v => v.id === selectedPO.vendorId);
    const project = projects.find(p => p.id === selectedPO.projectId);
    const subtotal = selectedPO.items.reduce((acc, i) => acc + (Number(i.rate) * Number(i.qty)), 0);
    const gstTotal = selectedPO.items.reduce((acc, i) => acc + Number(i.gstAmt), 0);
    const grandTotal = subtotal + gstTotal;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedPO(null)} className="text-text-gray hover:text-primary font-medium transition-colors">
              ← Back
            </button>
            <h2 className="text-2xl font-bold">Purchase Order: {selectedPO.id}</h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => generatePDF(selectedPO)}
              className="btn-primary flex items-center gap-2 bg-white text-primary border border-primary hover:bg-primary-bg"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button
              onClick={() => emailVendor(selectedPO)}
              className="btn-primary flex items-center gap-2"
            >
              <Mail className="w-4 h-4" /> Email Vendor
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card space-y-3">
            <h3 className="font-bold text-primary border-b pb-2 uppercase tracking-wide text-sm">Vendor Details</h3>
            <p className="text-lg font-bold">{vendor?.name}</p>
            <p className="text-sm text-text-gray">Contact: {vendor?.contact}</p>
            <p className="text-sm text-text-gray">Email: {vendor?.email}</p>
          </div>
          <div className="card space-y-3">
            <h3 className="font-bold text-primary border-b pb-2 uppercase tracking-wide text-sm">Project & Shipping</h3>
            <p className="text-lg font-bold">{project?.name}</p>
            <p className="text-sm text-text-gray">Work Order No: {selectedPO.workOrderNo}</p>
            {selectedPO.deliveryDate && (
              <p className="text-sm text-text-gray">
                Expected Delivery: {format(new Date(selectedPO.deliveryDate), 'dd-MM-yyyy')}
              </p>
            )}
          </div>
        </div>

        <div className="table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Code</th>
                <th>Item Description</th>
                <th className="text-right">Qty</th>
                <th>Unit</th>
                <th className="text-right">Rate</th>
                <th className="text-right">GST%</th>
                <th className="text-right">GST Amt</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedPO.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{item.itemCode}</td>
                  <td className="font-medium">{item.itemName}</td>
                  <td className="text-right font-bold">{item.qty}</td>
                  <td>{item.unit}</td>
                  <td className="text-right">₹{Number(item.rate).toLocaleString()}</td>
                  <td className="text-right">{item.gst}%</td>
                  <td className="text-right">₹{Number(item.gstAmt).toLocaleString()}</td>
                  <td className="text-right font-bold text-primary">₹{Number(item.total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-3 bg-white p-6 rounded-lg border border-border shadow-sm">
            <div className="flex justify-between text-sm">
              <span className="text-text-gray">Subtotal:</span>
              <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-gray">GST Total:</span>
              <span className="font-semibold">₹{gstTotal.toLocaleString()}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between text-lg font-bold text-primary">
              <span>Grand Total:</span>
              <span>₹{grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold mb-4">Terms & Conditions</h3>
          <p className="text-sm text-text-gray leading-relaxed">
            1. Delivery must be made within the specified time frame.<br />
            2. Materials must be of specified brand and quality standards.<br />
            3. Payment will be made within 30 days of GRN receipt and invoice submission.<br />
            4. Any damage during transit is the vendor's responsibility.
          </p>
        </div>
      </div>
    );
  }

  // ─── List View ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Purchase Orders</h1>
          <p className="text-text-gray">Manage and track your official material orders.</p>
        </div>
        {(isAdmin || isPurchaseTeam) && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Purchase Order
          </button>
        )}
      </div>

      {/* PO Table */}
      <div className="table-container">
        <table className="erp-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Date</th>
              <th>Vendor</th>
              <th>Project</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-text-gray italic">
                  No Purchase Orders found. Click "New Purchase Order" to create one.
                </td>
              </tr>
            ) : (
              purchaseOrders.map(po => {
                const total = po.items.reduce((acc, i) => acc + Number(i.total), 0);
                return (
                  <tr key={po.id}>
                    <td className="font-semibold text-primary">{po.id}</td>
                    <td>{format(new Date(po.date), 'dd-MM-yyyy')}</td>
                    <td className="font-medium">{vendors.find(v => v.id === po.vendorId)?.name}</td>
                    <td>{projects.find(p => p.id === po.projectId)?.name}</td>
                    <td className="text-right font-bold">₹{total.toLocaleString()}</td>
                    <td>
                      <span className={cn(
                        'badge',
                        po.status === 'Sent' ? 'badge-primary'
                          : po.status === 'Partial' ? 'badge-warning'
                          : 'badge-success'
                      )}>
                        {po.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          title="View Details"
                          onClick={() => setSelectedPO(po)}
                          className="p-1 text-primary hover:bg-primary-bg rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          title="Download PDF"
                          onClick={() => generatePDF(po)}
                          className="p-1 text-text-gray hover:bg-primary-bg rounded"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          title="Email Vendor"
                          onClick={() => emailVendor(po)}
                          className="p-1 text-success hover:bg-success/10 rounded"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            title="Delete PO"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this purchase order?')) {
                                deletePurchaseOrder(po.id);
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
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Create PO Modal ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-6 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-bg rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-dark">New Purchase Order</h2>
                  <p className="text-sm text-text-gray">Fill in the details to create a manual PO</p>
                </div>
              </div>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-gray" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-dark">Vendor *</label>
                  <select
                    className="input-field w-full"
                    value={form.vendorId}
                    onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-dark">Project *</label>
                  <select
                    className="input-field w-full"
                    value={form.projectId}
                    onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                    required
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-dark">Work Order No.</label>
                  <input
                    className="input-field w-full"
                    type="text"
                    placeholder="e.g. WO-2024-001"
                    value={form.workOrderNo}
                    onChange={e => setForm(f => ({ ...f, workOrderNo: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-dark">PO Date *</label>
                  <input
                    className="input-field w-full"
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-dark">Expected Delivery Date</label>
                  <input
                    className="input-field w-full"
                    type="date"
                    value={form.deliveryDate}
                    onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-dark">Status</label>
                  <select
                    className="input-field w-full"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Partial">Partial</option>
                    <option value="Received">Received</option>
                  </select>
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-text-dark">Line Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                  >
                    <PlusCircle className="w-4 h-4" /> Add Item
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-primary/10 text-primary">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold w-8">#</th>
                        <th className="px-3 py-2 text-left font-semibold">Item Code</th>
                        <th className="px-3 py-2 text-left font-semibold">Item Name *</th>
                        <th className="px-3 py-2 text-right font-semibold w-20">Qty</th>
                        <th className="px-3 py-2 text-left font-semibold w-24">Unit</th>
                        <th className="px-3 py-2 text-right font-semibold w-28">Rate (₹)</th>
                        <th className="px-3 py-2 text-right font-semibold w-20">GST %</th>
                        <th className="px-3 py-2 text-right font-semibold w-28">GST Amt</th>
                        <th className="px-3 py-2 text-right font-semibold w-28">Total</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, idx) => (
                        <tr key={idx} className="border-t border-border hover:bg-gray-50">
                          <td className="px-3 py-2 text-text-gray">{idx + 1}</td>
                          <td className="px-2 py-1">
                            <input
                              className="input-field w-full text-xs"
                              placeholder="Code"
                              value={item.itemCode}
                              onChange={e => handleItemChange(idx, 'itemCode', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              className="input-field w-full text-xs"
                              placeholder="Item name"
                              value={item.itemName}
                              required
                              onChange={e => handleItemChange(idx, 'itemName', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              className="input-field w-full text-xs text-right"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.qty}
                              onChange={e => handleItemChange(idx, 'qty', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <select
                              className="input-field w-full text-xs"
                              value={item.unit}
                              onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                            >
                              {UNITS.map(u => <option key={u}>{u}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1">
                            <input
                              className="input-field w-full text-xs text-right"
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <select
                              className="input-field w-full text-xs"
                              value={item.gst}
                              onChange={e => handleItemChange(idx, 'gst', e.target.value)}
                            >
                              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right text-text-gray">
                            ₹{Number(item.gstAmt).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-primary">
                            ₹{Number(item.total).toLocaleString()}
                          </td>
                          <td className="px-2 py-1 text-center">
                            {form.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="text-error hover:text-red-700"
                              >
                                <MinusCircle className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2 bg-primary/5 p-4 rounded-xl border border-primary/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-gray">Subtotal:</span>
                    <span className="font-semibold">₹{formSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-gray">GST Total:</span>
                    <span className="font-semibold">₹{formGST.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-primary/20" />
                  <div className="flex justify-between font-bold text-primary">
                    <span>Grand Total:</span>
                    <span>₹{formGrand.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-5 py-2 rounded-lg border border-border text-text-gray hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex items-center gap-2 disabled:opacity-60"
                >
                  {submitting ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {submitting ? 'Creating...' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
