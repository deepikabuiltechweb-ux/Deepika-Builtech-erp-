import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Autocomplete from '../components/ui/Autocomplete';
import {
  ShoppingCart, Eye, Printer, Mail, CheckCircle, FileText,
  Download, Trash2, Plus, X, PlusCircle, MinusCircle, FileEdit
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
    purchaseOrders, addPurchaseOrder, deletePurchaseOrder, updatePurchaseOrder,
    vendors, projects, isAdmin, isPurchaseTeam, updateVendor, addVendor, addProject
  } = useApp();

  const [selectedPO, setSelectedPO] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // --- Form State ---
  const [form, setForm] = useState({
    vendorId: '',
    projectId: '',
    workOrderNo: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    deliveryDate: '',
    status: 'Sent',
    items: [emptyItem()],
    dispatchTo: 'DEEPIKA BUILTECH ENGINEERING\nSurvey No.44/5, Rajakulam Road,\nVaivayur Post, Karur Village, Kanchipuram - 631 561\nGSTIN: 33AEGPL3660M1ZC',
    deliveryTerms: format(new Date(), 'yyyy-MM-dd'),
    paymentTerms: '45 Days Credit',
    remarks: '* ALONG WITH INVOICE , MIL TEST CERTIFICATE REQUIRED',
    reference: 'WHATSAPP',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showDispatchSuggestions, setShowDispatchSuggestions] = useState(false);

  const handleAddNewVendor = async (name) => {
    const newVend = await addVendor({
      name,
      address: 'No. 15, Ponniamman Nagar Road, Chennai - 600095',
      email: 'TBD',
      contact: 'TBD',
      gstin: '33AAGCB5988F1ZH'
    });
    if (newVend) {
      setForm(f => ({ ...f, vendorId: newVend.id }));
    }
  };

  const handleAddNewProject = async (name) => {
    const newProj = await addProject({
      name,
      client: 'TBD',
      location: 'TBD',
      budget: 0,
      status: 'Active'
    });
    if (newProj) {
      setForm(f => ({ ...f, projectId: newProj.id }));
    }
  };

  const uniqueDispatchAddresses = Array.from(new Set(
    purchaseOrders
      .map(po => po.dispatchTo)
      .filter(addr => addr && addr.trim() !== '')
  ));
  
  const defaultAddress = 'DEEPIKA BUILTECH ENGINEERING\nSurvey No.44/5, Rajakulam Road,\nVaivayur Post, Karur Village, Kanchipuram - 631 561\nGSTIN: 33AEGPL3660M1ZC';
  
  const dispatchSuggestions = uniqueDispatchAddresses.includes(defaultAddress)
    ? uniqueDispatchAddresses
    : [defaultAddress, ...uniqueDispatchAddresses];

  const filteredDispatchSuggestions = dispatchSuggestions.filter(addr => 
    addr.toLowerCase().includes((form.dispatchTo || '').toLowerCase())
  );

  // ─── PDF Generator ────────────────────────────────────────────────────────
  const generatePDF = (po) => {
    try {
      const vendor = vendors.find(v => v.id === po.vendorId);
      const project = projects.find(p => p.id === po.projectId);
      const doc = new jsPDF();

      // Number to Words converter (Indian System: Lakhs & Crores)
      const numberToWords = (num) => {
        const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
        const b = ['', '', 'Twenty ', 'Thirty ', 'Forty ', 'Fifty ', 'Sixty ', 'Seventy ', 'Eighty ', 'Ninety '];
        
        const numStr = Math.round(num).toString();
        if (Math.round(num) === 0) return 'Zero Only';
        if (numStr.length > 9) return 'Amount too large';
        
        const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return '';
        
        let str = '';
        str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[n[1][0]] + a[n[1][1]]) + 'Crore ' : '';
        str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[n[2][0]] + a[n[2][1]]) + 'Lakh ' : '';
        str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[n[3][0]] + a[n[3][1]]) + 'Thousand ' : '';
        str += Number(n[4]) !== 0 ? a[Number(n[4])] + 'Hundred ' : '';
        str += Number(n[5]) !== 0 ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + a[n[5][1]]) : '';
        
        return str.trim() + ' Only';
      };

      // Styles
      doc.setFont('helvetica', 'normal');
      doc.setDrawColor(0, 0, 0); // Black borders
      doc.setLineWidth(0.4);

      // 1. Purchase Order Title Strip
      doc.setFillColor(219, 234, 254); // Light blue background
      doc.rect(10, 10, 190, 10, 'FD');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('PURCHASE ORDER', 105, 17, { align: 'center' });

      // 2. Bounding Grid Box (Y=20 to Y=90)
      doc.rect(10, 20, 190, 70, 'D');

      // Vertical Divider splits Left Panel (width 80) and Right Panel (width 110)
      doc.line(90, 20, 90, 90);

      // --- LEFT PANEL (X: 10 to 90) ---
      // Row 1: Deepika Address (spaced 3.5mm per line, fits Y=20 to Y=42)
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('DEEPIKA BUILTECH ENGINEERING', 13, 23.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Survey No.44/5, Rajakulam Road,', 13, 27);
      doc.text('Vaivayur Post, Karur Village, Kanchipuram - 631 561', 13, 30.5);
      doc.text('Phone: 044-26256416, 29565416', 13, 34);
      doc.text('mail: dbtechengg@gmail.com', 13, 37.5);
      doc.text('GSTIN: 33AEGPL3660M1ZC', 13, 41);

      // Row 2: Dispatch Header (Y = 44 to 49)
      doc.setFillColor(239, 246, 255);
      doc.rect(10, 44, 80, 5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.text('Dispatch / Shipped TO:', 13, 47.5);

      // Row 2: Dispatch Body (Y=52 to Y=62.5)
      doc.setFont('helvetica', 'normal');
      const dispatchAddr = po.dispatchTo || 'DEEPIKA BUILTECH ENGINEERING\nSurvey No.44/5, Rajakulam Road,\nVaivayur Post, Karur Village, Kanchipuram - 631 561\nGSTIN: 33AEGPL3660M1ZC';
      const dispatchLines = doc.splitTextToSize(dispatchAddr, 74);
      doc.text(dispatchLines[0] || '', 13, 52.5);
      doc.text(dispatchLines[1] || '', 13, 56);
      doc.text(dispatchLines[2] || '', 13, 59.5);
      doc.text(dispatchLines[3] || '', 13, 63);

      // Row 3: Supplier Header (Y = 66 to 71)
      doc.setFillColor(239, 246, 255);
      doc.rect(10, 66, 80, 5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.text('Supplier TO:', 13, 69.5);

      // Row 3: Supplier Body (spaced 3.2mm per line, Y=74 to Y=88)
      doc.setFont('helvetica', 'bold');
      doc.text(`M/S;   ${vendor?.name?.toUpperCase() || 'BHAGWATI STEEL AND ALLOYS PVT.LTD'}`, 13, 74.5);
      doc.setFont('helvetica', 'normal');
      
      const addr = vendor?.address || 'No. 15, Ponniamman Nagar Road, Chennai - 600095';
      const addrLines = doc.splitTextToSize(addr, 74);
      doc.text(addrLines[0] || '', 13, 78);
      
      doc.text(`MAIL:  ${vendor?.email || 'pradeepgs1@yahoo.com'}`, 13, 81.5);
      doc.text(`GSTIN:  ${vendor?.gstin || '33AAGCB5988F1ZH'}`, 13, 85);
      doc.text(`CONT:  ${vendor?.contact || 'ASHISH AGARWAL (9841160237)'}`, 13, 88.5);

      // --- RIGHT PANEL (X: 90 to 200) ---
      // Row 1 Divider
      doc.line(90, 33, 200, 33);
      doc.line(145, 20, 145, 33);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('PO.NO', 102, 28);
      doc.text(String(po.id), 125, 28);

      let poDateFormatted = '—';
      if (po.date) {
        try {
          poDateFormatted = format(new Date(po.date), 'dd/MM/yyyy');
        } catch (e) {
          poDateFormatted = po.date;
        }
      }
      doc.text(poDateFormatted, 160, 28);

      // Row 2: Buyer's Ref
      doc.line(90, 38, 200, 38);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text("Buyer's Ref/Order No.", 93, 36.5);

      doc.line(90, 45, 200, 45);
      doc.line(145, 38, 145, 45);
      doc.setFont('helvetica', 'normal');
      doc.text(po.reference || 'WHATSAPP', 105, 42.5);
      doc.text(`DBTE - ${po.workOrderNo || '202'}`, 160, 42.5);

      // Row 3: Terms Header
      doc.setFont('helvetica', 'bold');
      doc.text('Terms and Condition:-', 93, 49.5);

      // Row 3: Terms Body (X values shifted to 135 to prevent squish)
      doc.setFont('helvetica', 'bold');
      doc.text('DELIVERY:', 93, 55);
      doc.setFont('helvetica', 'normal');
      
      let deliveryText = po.deliveryTerms || 'Within a Days';
      if (deliveryText && (
        /^\d{4}-\d{2}-\d{2}$/.test(deliveryText) || /^\d{4}-\d{2}-\d{2}T/.test(deliveryText)
      )) {
        try {
          deliveryText = format(new Date(deliveryText), 'dd-MM-yyyy');
        } catch (e) {
          // ignore
        }
      }
      doc.text(deliveryText, 135, 55);

      doc.setFont('helvetica', 'bold');
      doc.text('TAX:', 93, 60);
      doc.setFont('helvetica', 'normal');
      doc.text('EXTRA @ 18%', 135, 60);

      doc.setFont('helvetica', 'bold');
      doc.text('TRANSPORT CHARGE:', 93, 65);
      doc.setFont('helvetica', 'normal');
      doc.text('Extra @ Actual', 135, 65);

      doc.setFont('helvetica', 'bold');
      doc.text('FREIGHT & FORWARDING:', 93, 70);
      doc.setFont('helvetica', 'normal');
      doc.text('WEIGHING / LOADING CHARGES INCLUSIVE', 135, 70);

      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT TERMS:', 93, 75);
      doc.setFont('helvetica', 'normal');
      doc.text(po.paymentTerms || '45 Days Credit', 135, 75);

      doc.line(90, 81, 200, 81);

      // Row 4: Note
      doc.setFont('helvetica', 'bold');
      doc.text('NOTE:', 93, 86);
      doc.setFont('helvetica', 'normal');
      doc.text(po.remarks || '* ALONG WITH INVOICE , MIL TEST CERTIFICATE REQUIRED', 108, 86);

      // Calculate totals
      const subtotal = po.items.reduce((acc, i) => acc + (Number(i.rate) * Number(i.qty)), 0);
      const gstTotal = po.items.reduce((acc, i) => acc + Number(i.gstAmt), 0);
      const grandTotal = subtotal + gstTotal;
      const totalQty = po.items.reduce((acc, i) => acc + (Number(i.qty) || 0), 0);
      const mainUnit = po.items[0]?.unit || 'kgs';

      // 3. Items Table
      const tableData = po.items.map((item, idx) => [
        idx + 1,
        item.itemName || '—',
        item.qty || 0,
        item.unit || 'Nos',
        Number(item.rate || 0).toFixed(2),
        Number(item.total || 0).toFixed(2)
      ]);

      const tableConfig = {
        startY: 92,
        theme: 'grid',
        head: [['SL. No.', 'Description Of Goods', 'QTY', 'UNIT', 'Rate', 'Total']],
        body: tableData,
        foot: [['', '', totalQty, mainUnit, 'GRAND TOTAL', `Rs. ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]],
        styles: { lineColor: [0, 0, 0], lineWidth: 0.3 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9, lineWidth: 0.3, lineColor: [0, 0, 0] },
        bodyStyles: { textColor: [0, 0, 0], fontSize: 8.5 },
        footStyles: { fillColor: [219, 234, 254], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9, lineWidth: 0.3, lineColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 85, halign: 'left' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 30, halign: 'right' }
        }
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

      const finalY = (doc.lastAutoTable?.finalY || doc.previousAutoTable?.finalY || 180) + 6;

      // 4. Amount in Words Box
      doc.setFillColor(239, 246, 255); // Soft blue background
      doc.rect(10, finalY - 4, 190, 12, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('AMOUNT IN WORDS:', 13, finalY);
      doc.setFont('helvetica', 'bold');
      doc.text(numberToWords(grandTotal), 13, finalY + 5);

      // 5. Signature / Footer Section
      const sigY = finalY + 22;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('This is a computer generated document, hence signature is not required.', 105, sigY, { align: 'center' });

      doc.save(`${po.id}.pdf`);
      toast.success('PO PDF downloaded in official format!');
    } catch (err) {
      console.error("PDF Generation Error:", err);
      toast.error(`Failed to generate PDF: ${err.message}`);
    }
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
      dispatchTo: 'DEEPIKA BUILTECH ENGINEERING\nSurvey No.44/5, Rajakulam Road,\nVaivayur Post, Karur Village, Kanchipuram - 631 561\nGSTIN: 33AEGPL3660M1ZC',
      deliveryTerms: format(new Date(), 'yyyy-MM-dd'),
      paymentTerms: '45 Days Credit',
      remarks: '* ALONG WITH INVOICE , MIL TEST CERTIFICATE REQUIRED',
      reference: 'WHATSAPP',
    });
  };

  const handleEditClick = (po) => {
    setEditingId(po.id || po._id);
    setForm({
      vendorId: po.vendorId || '',
      projectId: po.projectId || '',
      workOrderNo: po.workOrderNo || '',
      date: po.date ? format(new Date(po.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      deliveryDate: po.deliveryDate ? format(new Date(po.deliveryDate), 'yyyy-MM-dd') : '',
      status: po.status || 'Sent',
      items: po.items && po.items.length > 0 
        ? po.items.map(item => ({
            itemCode: item.itemCode || '',
            itemName: item.itemName || '',
            qty: item.qty || 1,
            unit: item.unit || 'Nos',
            rate: item.rate || 0,
            gst: item.gst || 18,
            gstAmt: item.gstAmt || 0,
            total: item.total || 0,
          }))
        : [emptyItem()],
      dispatchTo: po.dispatchTo || 'DEEPIKA BUILTECH ENGINEERING\nSurvey No.44/5, Rajakulam Road,\nVaivayur Post, Karur Village, Kanchipuram - 631 561\nGSTIN: 33AEGPL3660M1ZC',
      deliveryTerms: po.deliveryTerms ? (
        /^\d{4}-\d{2}-\d{2}$/.test(po.deliveryTerms) || /^\d{4}-\d{2}-\d{2}T/.test(po.deliveryTerms)
          ? format(new Date(po.deliveryTerms), 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd')
      ) : format(new Date(), 'yyyy-MM-dd'),
      paymentTerms: po.paymentTerms || '45 Days Credit',
      remarks: po.remarks || '* ALONG WITH INVOICE , MIL TEST CERTIFICATE REQUIRED',
      reference: po.reference || 'WHATSAPP',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendorId) return toast.error('Please select a vendor.');
    if (!form.projectId) return toast.error('Please select a project.');
    if (form.items.some(it => !it.itemName.trim())) return toast.error('All items must have a name.');
    setSubmitting(true);
    
    let result;
    if (editingId) {
      result = await updatePurchaseOrder(editingId, { ...form, date: new Date(form.date).toISOString() });
      if (result) {
        toast.success('Purchase Order updated successfully!');
      }
    } else {
      result = await addPurchaseOrder({ ...form, date: new Date(form.date).toISOString() });
    }
    
    setSubmitting(false);
    if (result) {
      setShowForm(false);
      resetForm();
      setEditingId(null);
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

    const subject = encodeURIComponent(`Purchase Order ${po.id} – Deepika Builtech Engineering`);
    const body = encodeURIComponent(
      `Dear ${vendor?.name || 'Vendor'},\n\nPlease find enclosed Purchase Order ${po.id} dated ${format(new Date(po.date), 'dd-MM-yyyy')}.\n\nKindly acknowledge receipt and confirm delivery schedule.\n\nRegards,\nDeepika Builtech Engineering`
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card space-y-3">
            <h3 className="font-bold text-primary border-b pb-2 uppercase tracking-wide text-sm">Vendor Details</h3>
            <p className="text-lg font-bold">{vendor?.name}</p>
            <p className="text-sm text-text-gray">Contact: {vendor?.contact}</p>
            <p className="text-sm text-text-gray">Email: {vendor?.email}</p>
            <p className="text-sm text-text-gray">GSTIN: {vendor?.gstin}</p>
          </div>
          <div className="card space-y-3">
            <h3 className="font-bold text-primary border-b pb-2 uppercase tracking-wide text-sm">Project Details</h3>
            <p className="text-lg font-bold">{project?.name}</p>
            <p className="text-sm text-text-gray">Work Order No: {selectedPO.workOrderNo}</p>
            <p className="text-sm text-text-gray">Buyer's Ref / Reference: {selectedPO.reference || 'WHATSAPP'}</p>
            {selectedPO.deliveryDate && (
              <p className="text-sm text-text-gray">
                Expected Delivery: {format(new Date(selectedPO.deliveryDate), 'dd-MM-yyyy')}
              </p>
            )}
          </div>
          <div className="card space-y-3">
            <h3 className="font-bold text-primary border-b pb-2 uppercase tracking-wide text-sm">Dispatch / Shipped TO</h3>
            <p className="text-sm text-text-dark font-medium whitespace-pre-line">{selectedPO.dispatchTo || 'DEEPIKA BUILTECH ENGINEERING\nSurvey No.44/5, Rajakulam Road,\nVaivayur Post, Karur Village, Kanchipuram - 631 561\nGSTIN: 33AEGPL3660M1ZC'}</p>
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

        <div className="card space-y-3">
          <h3 className="font-bold border-b pb-2 text-text-dark">Terms & Conditions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-text-gray text-xs uppercase tracking-wide">Delivery Date (Terms)</p>
              <p className="font-semibold text-text-dark mt-0.5">
                {selectedPO.deliveryTerms && (
                  /^\d{4}-\d{2}-\d{2}$/.test(selectedPO.deliveryTerms) || /^\d{4}-\d{2}-\d{2}T/.test(selectedPO.deliveryTerms)
                ) ? (
                  (() => {
                    try {
                      return format(new Date(selectedPO.deliveryTerms), 'dd-MM-yyyy');
                    } catch (e) {
                      return selectedPO.deliveryTerms;
                    }
                  })()
                ) : (
                  selectedPO.deliveryTerms || 'Within a Days'
                )}
              </p>
            </div>
            <div>
              <p className="text-text-gray text-xs uppercase tracking-wide">Payment Terms</p>
              <p className="font-semibold text-text-dark mt-0.5">{selectedPO.paymentTerms || '45 Days Credit'}</p>
            </div>
            <div>
              <p className="text-text-gray text-xs uppercase tracking-wide">Note / Instructions</p>
              <p className="font-semibold text-text-dark mt-0.5">{selectedPO.remarks || '* ALONG WITH INVOICE , MIL TEST CERTIFICATE REQUIRED'}</p>
            </div>
          </div>
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
                        {(isPurchaseTeam || isAdmin) && (
                          <button
                            title="Edit PO"
                            onClick={() => handleEditClick(po)}
                            className="p-1 text-text-gray hover:bg-primary-bg rounded"
                          >
                            <FileEdit className="w-4 h-4" />
                          </button>
                        )}
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
                  <h2 className="text-xl font-bold text-text-dark">{editingId ? 'Edit Purchase Order' : 'New Purchase Order'}</h2>
                  <p className="text-sm text-text-gray">{editingId ? 'Update the details of the PO' : 'Fill in the details to create a manual PO'}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowForm(false); resetForm(); setEditingId(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-gray" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Autocomplete
                    options={vendors.map(v => ({ id: v.id, name: v.name }))}
                    onSelect={(v) => setForm(f => ({ ...f, vendorId: v.id }))}
                    placeholder="Search/Select Vendor..."
                    label="Vendor *"
                    value={form.vendorId}
                    onAddNew={handleAddNewVendor}
                  />
                </div>
                <div className="space-y-1">
                  <Autocomplete
                    options={projects.map(p => ({ id: p.id, name: p.name }))}
                    onSelect={(p) => setForm(f => ({ ...f, projectId: p.id }))}
                    placeholder="Search/Select Project..."
                    label="Project *"
                    value={form.projectId}
                    onAddNew={handleAddNewProject}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-dark">Work Order No.</label>
                  <input
                    className="input-field w-full"
                    type="text"
                    placeholder="e.g. DBTE - 1212"
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
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-dark">Buyer's Ref / Reference</label>
                  <input
                    className="input-field w-full"
                    type="text"
                    placeholder="e.g. WHATSAPP"
                    value={form.reference}
                    onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                  />
                </div>
              </div>

              {/* Shipping & Dispatch Address */}
              <div className="card space-y-1 relative">
                <label className="text-sm font-medium text-text-dark">Dispatch / Shipped TO Address *</label>
                <div className="relative">
                  <textarea
                    className="input-field w-full h-24 resize-none pl-3 pt-2 text-sm"
                    placeholder="Enter full address details for Shipped TO..."
                    value={form.dispatchTo}
                    onChange={e => setForm(f => ({ ...f, dispatchTo: e.target.value }))}
                    onFocus={() => setShowDispatchSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowDispatchSuggestions(false), 250)}
                  />
                  {showDispatchSuggestions && filteredDispatchSuggestions.length > 0 && (
                    <div className="absolute z-[60] w-full mt-1 bg-white border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                      {filteredDispatchSuggestions.map((addr, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-primary-bg transition-colors border-b border-border text-xs font-medium text-text-dark whitespace-pre-line"
                          onClick={() => {
                            setForm(f => ({ ...f, dispatchTo: addr }));
                            setShowDispatchSuggestions(false);
                          }}
                        >
                          {addr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="card grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-dark">Delivery Date (Terms) *</label>
                  <input
                    className="input-field w-full"
                    type="date"
                    value={form.deliveryTerms}
                    onChange={e => setForm(f => ({ ...f, deliveryTerms: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-dark">Payment Terms / Days</label>
                  <input
                    className="input-field w-full"
                    type="text"
                    placeholder="e.g. 45 Days Credit"
                    value={form.paymentTerms}
                    onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text-dark">Note / Instructions</label>
                  <input
                    className="input-field w-full"
                    type="text"
                    placeholder="e.g. * ALONG WITH INVOICE , MIL TEST..."
                    value={form.remarks}
                    onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  />
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
                  onClick={() => { setShowForm(false); resetForm(); setEditingId(null); }}
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
                  {submitting ? (editingId ? 'Saving...' : 'Creating...') : (editingId ? 'Save Changes' : 'Create Purchase Order')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
