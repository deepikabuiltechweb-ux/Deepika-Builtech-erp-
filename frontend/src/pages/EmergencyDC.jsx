import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle, Plus, Trash2, CheckCircle, XCircle, Clock,
  ShoppingBag, User, Phone, MapPin, FileText, IndianRupee,
  CreditCard, Receipt, Building2, ClipboardList, Eye, Download
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

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Credit'];
const EMERGENCY_REASONS = [
  'Breakdown Repair / Maintenance',
  'Routine Servicing & Calibration',
  'Warranty Claim / Service',
  'Inspection & Fault Diagnosis',
  'Refurbishment / Overhaul',
  'Other Maintenance / Service'
];

const statusConfig = {
  'Pending Approval': { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  'Approved': { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
  'Rejected': { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

function StatusBadge({ status }) {
  const cfg = statusConfig[status] || statusConfig['Pending Approval'];
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', cfg.color)}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

const emptyItem = () => ({ description: '', qty: 1, unit: 'Nos', unitPrice: 0, totalPrice: 0 });

export default function EmergencyDC() {
  const { emergencyDCs, addEmergencyDC, deleteEmergencyDC, updateEmergencyDCStatus, projects, user, isAdmin } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [viewDC, setViewDC] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');

  // ─── PDF Generator ────────────────────────────────────────────────────────
  const generatePDF = (dc) => {
    const doc = new jsPDF();

    // Header banner
    doc.setFillColor(30, 64, 175); // Dark Blue corporate theme
    doc.rect(0, 0, 210, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DEEPIKA BUILTECH ENGINEERING', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('No. 12, Main Road, Industrial Suburb, Bangalore - 560010', 105, 27, { align: 'center' });
    doc.text('GSTIN: 29ABCDE1234F1Z5  |  Tel: +91 80 1234 5678', 105, 34, { align: 'center' });

    // Title strip
    doc.setFillColor(239, 246, 255); // Soft blue background
    doc.rect(0, 42, 210, 12, 'F');
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MACHINE SERVICE DELIVERY CHALLAN', 14, 51);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`DC No: ${dc.id}`, 140, 48);
    doc.text(`Date: ${format(new Date(dc.dcDate), 'dd-MM-yyyy')}`, 140, 54);

    // Vendor & Shipment Boxes
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(14, 60, 85, 38);
    doc.rect(111, 60, 85, 38);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175); // Corporate Blue
    doc.text('SERVICE CENTER / REPAIR SHOP', 17, 67);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(dc.localVendorName || '—', 17, 74);
    doc.text(`Phone: ${dc.localVendorPhone || '—'}`, 17, 80);
    doc.text(`Address: ${dc.localVendorAddress || '—'}`, 17, 86);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175); // Corporate Blue
    doc.text('CHALLAN & SENDER DETAILS', 114, 67);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(`Project: ${dc.projectName || dc.projectId || '—'}`, 114, 74);
    doc.text(`Sent By: ${dc.purchasedBy || '—'}`, 114, 80);
    doc.text(`Payment Mode: ${dc.paymentMode || '—'} (Est. Bill: ${dc.billAttached ? 'YES' : 'NO'})`, 114, 86);

    // Challan Justification Section
    doc.setFillColor(245, 247, 255); // Soft blue background
    doc.rect(14, 104, 182, 10, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175); // Corporate Blue
    doc.text(`SERVICE REASON: ${dc.emergencyReason || '—'}`, 18, 110);

    // Items Table
    const tableData = dc.items.map((item, idx) => [
      idx + 1,
      item.description,
      item.qty,
      item.unit || 'Nos',
      `Rs. ${Number(item.unitPrice).toLocaleString()}`,
      `Rs. ${Number(item.totalPrice).toLocaleString()}`
    ]);

    const tableConfig = {
      startY: 118,
      head: [['#', 'Machine / Equipment Description', 'Quantity', 'Unit', 'Est. Service Price', 'Est. Total Price']],
      body: tableData,
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 9 }, // Corporate Blue Header
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 8 },
        2: { halign: 'right', cellWidth: 24 },
        4: { halign: 'right', cellWidth: 32 },
        5: { halign: 'right', cellWidth: 32 }
      },
      alternateRowStyles: { fillColor: [245, 247, 255] }, // Soft Blue alternate rows
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
    doc.setFillColor(245, 247, 255); // Soft Blue Box
    doc.rect(120, finalY, 76, 12, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175); // Corporate Blue
    doc.text('Grand Total:', 125, finalY + 8);
    doc.text(`Rs. ${Number(dc.totalAmount).toLocaleString()}`, 193, finalY + 8, { align: 'right' });

    // Remarks
    if (dc.remarks) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(`Remarks: ${dc.remarks}`, 14, finalY + 20);
    }

    // Signature lines
    const sigY = finalY + (dc.remarks ? 38 : 30);
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.line(14, sigY, 70, sigY);
    doc.line(140, sigY, 196, sigY);
    doc.text('Sent By Signature', 14, sigY + 5);
    doc.text('Approved / Authorized By', 140, sigY + 5);

    doc.save(`${dc.id}.pdf`);
    toast.success('Delivery Challan PDF downloaded!');
  };

  const [form, setForm] = useState({
    dcDate: format(new Date(), 'yyyy-MM-dd'),
    dcNo: '',
    projectId: '',
    projectName: '',
    localVendorName: '',
    localVendorPhone: '',
    localVendorAddress: '',
    emergencyReason: '',
    purchasedBy: user?.name || '',
    approvedBy: '',
    paymentMode: 'Cash',
    billAttached: false,
    billProof: null,   // Base64 string of the uploaded bill image/PDF
    items: [emptyItem()],
    remarks: ''
  });

  const handleBillProofUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({ ...f, billProof: ev.target.result, billAttached: true }));
    };
    reader.readAsDataURL(file);
  };

  const updateItem = (index, field, value) => {
    const updated = [...form.items];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-calc total
    if (field === 'qty' || field === 'unitPrice') {
      const qty = field === 'qty' ? Number(value) : Number(updated[index].qty);
      const up = field === 'unitPrice' ? Number(value) : Number(updated[index].unitPrice);
      updated[index].totalPrice = parseFloat((qty * up).toFixed(2));
    }
    setForm({ ...form, items: updated });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, emptyItem()] });

  const removeItem = (index) => {
    if (form.items.length === 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const grandTotal = form.items.reduce((sum, i) => sum + (Number(i.totalPrice) || 0), 0);

  const handleProjectChange = (e) => {
    const pid = e.target.value;
    const proj = projects.find(p => p.id === pid);
    setForm({ ...form, projectId: pid, projectName: proj?.name || proj?.projectName || '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.localVendorName.trim()) { toast.error('Service Center / Repair Shop name is required'); return; }
    if (!form.emergencyReason) { toast.error('Please select a reason / justification'); return; }
    if (form.items.some(i => !i.description.trim())) { toast.error('All item descriptions are required'); return; }

    const cleanedItems = form.items.map(it => ({
      ...it,
      qty: parseFloat(it.qty) || 0,
      unitPrice: parseFloat(it.unitPrice) || 0,
      totalPrice: parseFloat(it.totalPrice) || 0
    }));
    const payload = { ...form, items: cleanedItems, totalAmount: grandTotal };
    const saved = await addEmergencyDC(payload);
    if (saved) {
      setShowForm(false);
      setForm({
        dcDate: format(new Date(), 'yyyy-MM-dd'),
        dcNo: '',
        projectId: '',
        projectName: '',
        localVendorName: '',
        localVendorPhone: '',
        localVendorAddress: '',
        emergencyReason: '',
        purchasedBy: user?.name || '',
        approvedBy: '',
        paymentMode: 'Cash',
        billAttached: false,
        billProof: null,
        items: [emptyItem()],
        remarks: ''
      });
    }
  };

  const filtered = filterStatus === 'All'
    ? emergencyDCs
    : emergencyDCs.filter(d => d.status === filterStatus);

  const stats = {
    total: emergencyDCs.length,
    pending: emergencyDCs.filter(d => d.status === 'Pending Approval').length,
    approved: emergencyDCs.filter(d => d.status === 'Approved').length,
    totalSpend: emergencyDCs.filter(d => d.status === 'Approved').reduce((s, d) => s + (d.totalAmount || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-dark">Machine Service DC</h1>
            <p className="text-text-gray text-sm">Outward delivery challans for machinery and tools sent for servicing or repairs</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Delivery Challan
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {!showForm && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total DCs', value: stats.total, icon: ClipboardList, color: 'text-primary bg-primary-bg' },
            { label: 'Pending Approval', value: stats.pending, icon: Clock, color: 'text-amber-600 bg-amber-50' },
            { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Total Spend (Approved)', value: `₹${stats.totalSpend.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-red-600 bg-red-50' },
          ].map(stat => (
            <div key={stat.label} className="card flex items-center gap-4">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-text-gray text-xs uppercase tracking-wide">{stat.label}</p>
                <p className="text-xl font-bold text-text-dark">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FORM */}
      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-top-4 duration-300">
          {/* DC Info Banner */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <ClipboardList className="w-6 h-6 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-primary-dark">Machine Service / Repair Delivery Challan</p>
              <p className="text-sm text-primary">This outward delivery challan tracks machines and tools sent out of the store for servicing or repairs. Requires administrative approval.</p>
            </div>
          </div>

          {/* Section 1: Header Info */}
          <div className="card">
            <h3 className="font-bold text-text-dark mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> DC Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">DC Date *</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.dcDate}
                  onChange={e => setForm({ ...form, dcDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">DC / Bill No</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Vendor bill / challan no."
                  value={form.dcNo}
                  onChange={e => setForm({ ...form, dcNo: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">Project / Work Order</label>
                <select
                  className="input-field"
                  value={form.projectId}
                  onChange={handleProjectChange}
                >
                  <option value="">-- Select Project --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.id} - {p.name || p.projectName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Justification Info */}
          <div className="card">
            <h3 className="font-bold text-text-dark mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" /> Challan Justification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">Reason / Justification *</label>
                <select
                  className="input-field"
                  value={form.emergencyReason}
                  onChange={e => setForm({ ...form, emergencyReason: e.target.value })}
                  required
                >
                  <option value="">-- Select Reason --</option>
                  {EMERGENCY_REASONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">Sent By *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Name of person sending"
                  value={form.purchasedBy}
                  onChange={e => setForm({ ...form, purchasedBy: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Local Vendor Info */}
          <div className="card">
            <h3 className="font-bold text-text-dark mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" /> Service Center / Repair Shop Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">
                  <User className="w-3.5 h-3.5 inline mr-1" />
                  Service Center / Repair Shop Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Service workshop or repair shop name"
                  value={form.localVendorName}
                  onChange={e => setForm({ ...form, localVendorName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">
                  <Phone className="w-3.5 h-3.5 inline mr-1" />
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="Contact number"
                  value={form.localVendorPhone}
                  onChange={e => setForm({ ...form, localVendorPhone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  Address / Location
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Service center address"
                  value={form.localVendorAddress}
                  onChange={e => setForm({ ...form, localVendorAddress: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Items Table */}
          <div className="card overflow-hidden p-0">
            <div className="p-4 bg-primary-dark text-white font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Receipt className="w-5 h-5" /> Machines / Equipment Sent
              </span>
              <button
                type="button"
                onClick={addItem}
                className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Row
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th className="w-8">#</th>
                    <th>Machine / Equipment Description *</th>
                    <th className="w-24 text-right">Qty</th>
                    <th className="w-24">Unit</th>
                    <th className="w-32 text-right">Est. Service Price (₹)</th>
                    <th className="w-32 text-right">Total (₹)</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="text-center text-text-gray text-sm">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. Concrete Mixer, Drill Machine..."
                          value={item.description}
                          onChange={e => updateItem(idx, 'description', e.target.value)}
                          required
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="input-field text-right"
                          value={item.qty === 0 || item.qty === '0' ? '' : item.qty}
                          onChange={e => updateItem(idx, 'qty', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <select
                          className="input-field"
                          value={item.unit}
                          onChange={e => updateItem(idx, 'unit', e.target.value)}
                        >
                          {['Nos', 'Kg', 'L', 'M', 'Bags', 'Boxes', 'Pcs', 'Rmt', 'Sqm', 'Set'].map(u => (
                            <option key={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input-field text-right"
                          value={item.unitPrice === 0 || item.unitPrice === '0' ? '' : item.unitPrice}
                          onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                        />
                      </td>
                      <td className="text-right px-4 font-semibold text-text-dark">
                        ₹{Number(item.totalPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          disabled={form.items.length === 1}
                          className="p-1 text-error hover:bg-error/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-primary-bg/50">
                    <td colSpan={5} className="px-4 py-3 text-right font-bold text-text-dark">Est. Grand Total</td>
                    <td className="px-4 py-3 text-right font-bold text-primary text-lg">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 5: Payment & Remarks */}
          <div className="card grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">
                  <CreditCard className="w-3.5 h-3.5 inline mr-1" /> Payment Mode
                </label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_MODES.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMode: m })}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                        form.paymentMode === m
                          ? 'bg-primary text-white border-primary'
                          : 'border-border text-text-gray hover:border-primary hover:text-primary'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {/* Bill Proof Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-gray">
                  <Receipt className="w-3.5 h-3.5 inline mr-1" />
                  Invoice / Challan Proof
                </label>
                {form.billProof ? (
                  <div className="relative group rounded-xl overflow-hidden border-2 border-emerald-300 bg-emerald-50">
                    {form.billProof.startsWith('data:image') ? (
                      <img
                        src={form.billProof}
                        alt="Document proof"
                        className="w-full max-h-40 object-contain p-2"
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-dark">PDF Document Uploaded</p>
                          <p className="text-xs text-text-gray">Click view to open</p>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2 p-2 bg-emerald-50 border-t border-emerald-200">
                      <a
                        href={form.billProof}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center text-xs font-bold text-emerald-700 hover:underline py-1"
                      >
                        View Document
                      </a>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, billProof: null, billAttached: false }))}
                        className="text-xs font-bold text-error hover:underline py-1 px-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-5 px-4 cursor-pointer hover:border-primary hover:bg-primary-bg/40 transition-colors">
                    <div className="w-10 h-10 bg-primary-bg rounded-full flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-text-dark">Upload Invoice / Challan</p>
                      <p className="text-xs text-text-gray mt-0.5">JPG, PNG or PDF — max 5 MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handleBillProofUpload}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">Remarks</label>
                <textarea
                  className="input-field h-20 resize-none"
                  placeholder="Additional notes, justification..."
                  value={form.remarks}
                  onChange={e => setForm({ ...form, remarks: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 border border-border rounded-lg text-text-gray hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-8 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Submit Delivery Challan
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* LIST VIEW */
        <div className="space-y-4">
          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {['All', 'Pending Approval', 'Approved', 'Rejected'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                  filterStatus === s
                    ? 'bg-primary text-white border-primary'
                    : 'border-border text-text-gray hover:border-primary hover:text-primary bg-white'
                )}
              >
                {s}
                {s !== 'All' && (
                  <span className={cn(
                    'ml-2 px-1.5 py-0.5 rounded-full text-xs',
                    filterStatus === s ? 'bg-white/20' : 'bg-gray-100'
                  )}>
                    {emergencyDCs.filter(d => d.status === s).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="table-container overflow-x-auto">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>DC No</th>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Service Center</th>
                  <th>Reason</th>
                  <th>Sent By</th>
                  <th className="text-right">Est. Cost</th>
                  <th>Payment</th>
                  <th>Document</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-10 text-center text-text-gray italic">
                      No Delivery Challans found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(dc => (
                    <tr key={dc.id}>
                      <td className="font-semibold text-primary whitespace-nowrap">{dc.id}</td>
                      <td className="whitespace-nowrap">
                        {dc.dcDate ? format(new Date(dc.dcDate), 'dd-MM-yyyy') : '-'}
                      </td>
                      <td className="text-text-gray">{dc.projectName || dc.projectId || '-'}</td>
                      <td className="font-medium">{dc.localVendorName}</td>
                      <td className="text-sm text-text-gray max-w-[160px] truncate" title={dc.emergencyReason}>
                        {dc.emergencyReason}
                      </td>
                      <td>{dc.purchasedBy}</td>
                      <td className="text-right font-semibold text-text-dark whitespace-nowrap">
                        ₹{Number(dc.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-text-gray">
                          {dc.paymentMode}
                        </span>
                      </td>
                      <td className="text-center">
                        {dc.billProof ? (
                          <a
                            href={dc.billProof}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Document Proof"
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 hover:bg-emerald-200 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          </a>
                        ) : dc.billAttached ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" title="Document marked attached" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-300 mx-auto" title="No document" />
                        )}
                      </td>
                      <td>
                        <StatusBadge status={dc.status} />
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewDC(dc)}
                            className="p-1.5 text-primary hover:bg-primary-bg rounded transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => generatePDF(dc)}
                            className="p-1.5 text-success hover:bg-success/10 rounded transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {isAdmin && dc.status === 'Pending Approval' && (
                            <>
                              <button
                                onClick={() => updateEmergencyDCStatus(dc.id, 'Approved')}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => updateEmergencyDCStatus(dc.id, 'Rejected')}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this Delivery Challan?')) {
                                  deleteEmergencyDC(dc.id);
                                }
                              }}
                              className="p-1.5 text-error hover:bg-error/10 rounded transition-colors"
                              title="Delete"
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
        </div>
      )}

      {/* Detail Modal */}
      {viewDC && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewDC(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-lg text-text-dark">{viewDC.id}</p>
                    <button
                      onClick={() => generatePDF(viewDC)}
                      className="btn-primary flex items-center gap-1.5 bg-white text-primary border border-primary hover:bg-primary-bg py-1 px-2.5 rounded-lg text-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                  </div>
                  <p className="text-sm text-text-gray">
                    {viewDC.dcDate ? format(new Date(viewDC.dcDate), 'dd MMM yyyy') : '-'}
                  </p>
                </div>
              </div>
              <StatusBadge status={viewDC.status} />
            </div>

            <div className="p-6 space-y-5">
              {/* Justification Info */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs uppercase font-bold tracking-widest text-primary mb-1">Reason / Justification</p>
                <p className="font-semibold text-primary-dark">{viewDC.emergencyReason}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-gray text-xs uppercase tracking-wide mb-0.5">Project</p>
                  <p className="font-medium text-text-dark">{viewDC.projectName || viewDC.projectId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-text-gray text-xs uppercase tracking-wide mb-0.5">Sent By</p>
                  <p className="font-medium text-text-dark">{viewDC.purchasedBy}</p>
                </div>
                <div>
                  <p className="text-text-gray text-xs uppercase tracking-wide mb-0.5">Service Center / Repair Shop</p>
                  <p className="font-medium text-text-dark">{viewDC.localVendorName}</p>
                  {viewDC.localVendorPhone && <p className="text-text-gray">{viewDC.localVendorPhone}</p>}
                  {viewDC.localVendorAddress && <p className="text-text-gray text-xs">{viewDC.localVendorAddress}</p>}
                </div>
                <div>
                  <p className="text-text-gray text-xs uppercase tracking-wide mb-0.5">Payment</p>
                  <p className="font-medium text-text-dark">{viewDC.paymentMode}</p>
                  {viewDC.billProof ? (
                    <a
                      href={viewDC.billProof}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline mt-1"
                    >
                      <Eye className="w-3 h-3" /> View Document Proof
                    </a>
                  ) : (
                    <p className={cn('text-xs mt-1', viewDC.billAttached ? 'text-emerald-600' : 'text-red-400')}>
                      {viewDC.billAttached ? '✓ Document Attached' : '✗ No Document'}
                    </p>
                  )}
                </div>
              </div>

              {/* Items */}
              {viewDC.items?.length > 0 && (
                <div>
                  <p className="text-xs uppercase font-bold tracking-widest text-text-gray mb-2">Machines / Equipment Sent</p>
                  <div className="rounded-xl overflow-hidden border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-text-gray">#</th>
                          <th className="px-3 py-2 text-left font-semibold text-text-gray">Description</th>
                          <th className="px-3 py-2 text-right font-semibold text-text-gray">Qty</th>
                          <th className="px-3 py-2 text-left font-semibold text-text-gray">Unit</th>
                          <th className="px-3 py-2 text-right font-semibold text-text-gray">Est. Service Price</th>
                          <th className="px-3 py-2 text-right font-semibold text-text-gray">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewDC.items.map((item, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2 text-text-gray">{i + 1}</td>
                            <td className="px-3 py-2 font-medium text-text-dark">{item.description}</td>
                            <td className="px-3 py-2 text-right">{item.qty}</td>
                            <td className="px-3 py-2 text-text-gray">{item.unit}</td>
                            <td className="px-3 py-2 text-right">₹{Number(item.unitPrice || 0).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2 text-right font-semibold">₹{Number(item.totalPrice || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-primary/20 bg-primary-bg/50">
                          <td colSpan={5} className="px-3 py-2 text-right font-bold text-text-dark">Est. Grand Total</td>
                          <td className="px-3 py-2 text-right font-bold text-primary text-base">
                            ₹{Number(viewDC.totalAmount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bill Proof Preview in modal */}
              {viewDC.billProof && (
                <div>
                  <p className="text-xs uppercase font-bold tracking-widest text-text-gray mb-2">Invoice / Challan Proof</p>
                  {viewDC.billProof.startsWith('data:image') ? (
                    <div className="rounded-xl overflow-hidden border border-border">
                      <img
                        src={viewDC.billProof}
                        alt="Document proof"
                        className="w-full max-h-64 object-contain bg-gray-50"
                      />
                      <div className="border-t border-border p-2 text-center">
                        <a
                          href={viewDC.billProof}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-primary hover:underline"
                        >
                          Open Full Size
                        </a>
                      </div>
                    </div>
                  ) : (
                    <a
                      href={viewDC.billProof}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-700">PDF Document Uploaded</p>
                        <p className="text-xs text-red-500">Click to open in new tab</p>
                      </div>
                    </a>
                  )}
                </div>
              )}

              {viewDC.remarks && (
                <div>
                  <p className="text-xs uppercase font-bold tracking-widest text-text-gray mb-1">Remarks</p>
                  <p className="text-sm text-text-dark bg-gray-50 rounded-lg px-3 py-2">{viewDC.remarks}</p>
                </div>
              )}

              {/* Admin Actions in modal */}
              {isAdmin && viewDC.status === 'Pending Approval' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { updateEmergencyDCStatus(viewDC.id, 'Approved'); setViewDC(null); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve DC
                  </button>
                  <button
                    onClick={() => { updateEmergencyDCStatus(viewDC.id, 'Rejected'); setViewDC(null); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Reject DC
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => setViewDC(null)}
                className="w-full py-2.5 border border-border rounded-xl text-text-gray hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
