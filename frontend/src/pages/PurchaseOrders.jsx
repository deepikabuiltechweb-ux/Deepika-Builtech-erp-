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

// Format date from YYYY-MM-DD or ISO string to YYYY-MM-DD safely
const formatDateString = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
};

// Format date to DD-MM-YYYY format safely without timezone shift
const displayDateFormatted = (dateStr) => {
  if (!dateStr) return '';
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
};

// Return charge value if it is non-zero and non-empty
const displayCharges = (val) => {
  if (!val || val === '0' || val === 0) return null;
  return val;
};

// Determine transaction type dynamically
const getPOTaxType = (po, vendor) => {
  if (po && po.taxType) return po.taxType;
  const gstin = po?.vendorGstin || vendor?.gstin || '';
  const cleanGstin = gstin.trim().replace(/[^0-9a-zA-Z]/g, '');
  if (cleanGstin.length >= 2) {
    const stateCode = cleanGstin.substring(0, 2);
    let dispatchStateCode = '33';
    const dispatchGstinLine = (po?.dispatchTo || '').split('\n').find(l => l.toUpperCase().startsWith('GSTIN'));
    if (dispatchGstinLine) {
      const match = dispatchGstinLine.match(/GSTIN\s*:\s*([0-9]{2})/i);
      if (match && match[1]) {
        dispatchStateCode = match[1];
      }
    }
    if (stateCode !== dispatchStateCode) {
      return 'Inter-State';
    }
  }
  return 'Intra-State';
};

// Group items by GST rate slabs and return taxes broken down
const getTaxBreakdown = (items, taxType) => {
  const breakdown = {};
  (items || []).forEach(item => {
    const rate = parseFloat(item.rate) || 0;
    const qty = parseFloat(item.qty) || 0;
    const gstRate = parseFloat(item.gst) || 0;
    if (gstRate === 0) return;
    
    const base = rate * qty;
    const gstAmt = parseFloat(((base * gstRate) / 100).toFixed(2));
    
    if (!breakdown[gstRate]) {
      breakdown[gstRate] = { base: 0, gstAmt: 0 };
    }
    breakdown[gstRate].base += base;
    breakdown[gstRate].gstAmt += gstAmt;
  });
  
  const rows = [];
  Object.keys(breakdown).sort((a, b) => Number(a) - Number(b)).forEach(rateStr => {
    const rate = Number(rateStr);
    const { gstAmt } = breakdown[rateStr];
    if (taxType === 'Inter-State') {
      rows.push({
        label: `IGST @ ${rate}%`,
        amount: gstAmt,
        rate
      });
    } else {
      const halfRate = rate / 2;
      const halfAmt = parseFloat((gstAmt / 2).toFixed(2));
      rows.push({
        label: `CGST @ ${halfRate}%`,
        amount: halfAmt,
        rate: halfRate
      });
      rows.push({
        label: `SGST @ ${halfRate}%`,
        amount: halfAmt,
        rate: halfRate
      });
    }
  });
  return rows;
};

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
  const [isManualVendor, setIsManualVendor] = useState(false);
  const [descModal, setDescModal] = useState({
    isOpen: false,
    itemIndex: null,
    itemCode: '',
    text: ''
  });

  // --- Form State ---
  const defaultDispatchFields = {
    companyName: 'DEEPIKA BUILTECH ENGINEERING',
    addrLine1: 'Survey No.44/5, Rajakulam Road,',
    addrLine2: 'Vaivayur Post, Karur Village, Kanchipuram - 631 561',
    cityPin: '',
    gstin: '33AEGPL3660M1ZC',
  };
  
  const buildDispatchString = (fields) =>
    [fields.companyName, fields.addrLine1, fields.addrLine2, fields.cityPin, fields.gstin ? `GSTIN: ${fields.gstin}` : '']
      .filter(Boolean)
      .join('\n');

  const parseDispatchString = (str) => {
    if (!str) return { ...defaultDispatchFields };
    const lines = str.split('\n').map(l => l.trim()).filter(Boolean);
    const gstinLine = lines.find(l => l.toUpperCase().startsWith('GSTIN'));
    const rest = lines.filter(l => !l.toUpperCase().startsWith('GSTIN'));
    return {
      companyName: rest[0] || '',
      addrLine1: rest[1] || '',
      addrLine2: rest[2] || '',
      cityPin: rest[3] || '',
      gstin: gstinLine ? gstinLine.replace(/GSTIN\s*:\s*/i, '').trim() : '',
    };
  };

  const [dispatchFields, setDispatchFields] = useState({ ...defaultDispatchFields });
  const [savedDispatchAddresses, setSavedDispatchAddresses] = useState(() => {
    try {
      const stored = localStorage.getItem('erp_dispatch_addresses');
      const parsed = stored ? JSON.parse(stored) : [];
      const def = buildDispatchString(defaultDispatchFields);
      return parsed.includes(def) ? parsed : [def, ...parsed];
    } catch {
      return [buildDispatchString(defaultDispatchFields)];
    }
  });
  const [showDispatchDropdown, setShowDispatchDropdown] = useState(false);
  const [dispatchDropdownSearch, setDispatchDropdownSearch] = useState('');

  const saveDispatchAddress = (addr) => {
    if (!addr.trim() || savedDispatchAddresses.includes(addr)) return;
    const updated = [...savedDispatchAddresses, addr];
    setSavedDispatchAddresses(updated);
    try { localStorage.setItem('erp_dispatch_addresses', JSON.stringify(updated)); } catch {}
  };

  const deleteDispatchAddress = (addr) => {
    const def = buildDispatchString(defaultDispatchFields);
    if (addr === def) return; // Don't allow deleting default
    const updated = savedDispatchAddresses.filter(a => a !== addr);
    setSavedDispatchAddresses(updated);
    try { localStorage.setItem('erp_dispatch_addresses', JSON.stringify(updated)); } catch {}
  };

  const applyDispatchAddress = (addr) => {
    const fields = parseDispatchString(addr);
    setDispatchFields(fields);
    
    // Auto-detect tax type
    const cleanVendorGstin = (form.vendorGstin || '').trim().replace(/[^0-9a-zA-Z]/g, '');
    const cleanDispatchGstin = (fields.gstin || '').trim().replace(/[^0-9a-zA-Z]/g, '');
    let newTaxType = form.taxType;
    if (cleanVendorGstin.length >= 2 && cleanDispatchGstin.length >= 2) {
      const vendorState = cleanVendorGstin.substring(0, 2);
      const dispatchState = cleanDispatchGstin.substring(0, 2);
      newTaxType = vendorState === dispatchState ? 'Intra-State' : 'Inter-State';
    }
    
    setForm(f => ({ ...f, dispatchTo: addr, taxType: newTaxType }));
    setShowDispatchDropdown(false);
    setDispatchDropdownSearch('');
  };

  const handleDispatchFieldChange = (field, value) => {
    const updated = { ...dispatchFields, [field]: value };
    setDispatchFields(updated);
    
    let newTaxType = form.taxType;
    if (field === 'gstin') {
      const cleanVendorGstin = (form.vendorGstin || '').trim().replace(/[^0-9a-zA-Z]/g, '');
      const cleanDispatchGstin = value.trim().replace(/[^0-9a-zA-Z]/g, '');
      if (cleanVendorGstin.length >= 2 && cleanDispatchGstin.length >= 2) {
        const vendorState = cleanVendorGstin.substring(0, 2);
        const dispatchState = cleanDispatchGstin.substring(0, 2);
        newTaxType = vendorState === dispatchState ? 'Intra-State' : 'Inter-State';
      }
    }
    setForm(f => ({ ...f, dispatchTo: buildDispatchString(updated), taxType: newTaxType }));
  };

  const currentDispatchString = buildDispatchString(dispatchFields);
  const isNewDispatchAddress = currentDispatchString.trim() && !savedDispatchAddresses.includes(currentDispatchString);
  const filteredSavedAddresses = savedDispatchAddresses.filter(a =>
    !dispatchDropdownSearch || a.toLowerCase().includes(dispatchDropdownSearch.toLowerCase())
  );

  const parseAddressString = (addressStr) => {
    if (!addressStr) return { addrLine1: '', addrLine2: '', cityPin: '' };
    const parts = addressStr.split(',').map(p => p.trim());
    if (parts.length === 1) {
      return { addrLine1: parts[0], addrLine2: '', cityPin: '' };
    } else if (parts.length === 2) {
      return { addrLine1: parts[0], addrLine2: parts[1], cityPin: '' };
    } else {
      const cityPin = parts[parts.length - 1];
      const addrLine2 = parts[parts.length - 2];
      const addrLine1 = parts.slice(0, parts.length - 2).join(', ');
      return { addrLine1, addrLine2, cityPin };
    }
  };

  const [form, setForm] = useState({
    vendorId: '',
    vendorName: '',
    vendorAddressLine1: '',
    vendorAddressLine2: '',
    vendorCityPin: '',
    vendorGstin: '',
    vendorContact: '',
    vendorEmail: '',
    freightCharges: '',
    loadingCharges: '',
    unloadingCharges: '',
    weighingCharges: '',
    projectId: '',
    workOrderNo: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    deliveryDate: '',
    status: 'Sent',
    items: [emptyItem()],
    dispatchTo: buildDispatchString(defaultDispatchFields),
    deliveryTerms: format(new Date(), 'yyyy-MM-dd'),
    paymentTerms: '45 Days Credit',
    remarks: '* ALONG WITH INVOICE , MIL TEST CERTIFICATE REQUIRED',
    reference: 'WHATSAPP',
    taxType: 'Intra-State',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleAddNewVendor = async (name) => {
    const newVend = await addVendor({
      name,
      address: 'No. 15, Ponniamman Nagar Road, Chennai - 600095',
      email: 'TBD',
      contact: 'TBD',
      gstin: '33AAGCB5988F1ZH'
    });
    if (newVend) {
      const addrParsed = parseAddressString(newVend.address);
      setForm(f => ({
        ...f,
        vendorId: newVend.id,
        vendorName: newVend.name || '',
        vendorAddressLine1: addrParsed.addrLine1 || '',
        vendorAddressLine2: addrParsed.addrLine2 || '',
        vendorCityPin: addrParsed.cityPin || '',
        vendorGstin: newVend.gstin || '',
        vendorContact: newVend.contact || '',
        vendorEmail: newVend.email || ''
      }));
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


  // ─── PDF Generator ────────────────────────────────────────────────────────
  const generatePDF = (po) => {
    try {
      const vendor = vendors.find(v => v.id === po.vendorId);
      const project = projects.find(p => p.id === po.projectId);
      const doc = new jsPDF();

      // Vendor fallback mapping
      const vName = po.vendorName || vendor?.name || '—';
      const vContact = po.vendorContact || vendor?.contact || '—';
      const vEmail = po.vendorEmail || vendor?.email || '—';
      const vGstin = po.vendorGstin || vendor?.gstin || '—';
      
      const vAddressParts = [
        po.vendorAddressLine1,
        po.vendorAddressLine2,
        po.vendorCityPin
      ].filter(Boolean);
      const vAddress = vAddressParts.length > 0 ? vAddressParts.join('\n') : (vendor?.address || '—');

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
      doc.setDrawColor(226, 232, 240); // Soft border
      doc.setLineWidth(0.4);

      // 1. Purchase Order Title Strip
      doc.setFillColor(219, 234, 254); // Light blue background
      doc.rect(10, 10, 190, 8, 'FD');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PURCHASE ORDER', 105, 15.5, { align: 'center' });

      // 2. Company Details & PO Header Block
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, 21, 190, 25, 'D');
      doc.line(115, 21, 115, 46); // Vertical divider

      // Deepika Address
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('DEEPIKA BUILTECH ENGINEERING', 13, 26);
      doc.setFont('helvetica', 'normal');
      doc.text('Survey No.44/5, Rajakulam Road,', 13, 30);
      doc.text('Vaivayur Post, Karur Village, Kanchipuram - 631 561', 13, 34);
      doc.text('Phone: 044-26256416, 29565416  |  Mail: dbtechengg@gmail.com', 13, 38);
      doc.setFont('helvetica', 'bold');
      doc.text('GSTIN: 33AEGPL3660M1ZC', 13, 42);

      // PO Details
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('PO Number:', 118, 26);
      doc.setFont('helvetica', 'normal');
      doc.text(String(po.id), 145, 26);

      doc.setFont('helvetica', 'bold');
      doc.text('PO Date:', 118, 30);
      doc.setFont('helvetica', 'normal');
      let poDateFormatted = '—';
      if (po.date) {
        poDateFormatted = displayDateFormatted(po.date);
      }
      doc.text(poDateFormatted, 145, 30);

      doc.setFont('helvetica', 'bold');
      doc.text("Buyer's Ref:", 118, 34);
      doc.setFont('helvetica', 'normal');
      doc.text(po.reference || 'WHATSAPP', 145, 34);

      doc.setFont('helvetica', 'bold');
      doc.text('Work Order No:', 118, 38);
      doc.setFont('helvetica', 'normal');
      doc.text(po.workOrderNo ? `DBTE - ${po.workOrderNo}` : '—', 145, 38);

      doc.setFont('helvetica', 'bold');
      doc.text('Project:', 118, 42);
      doc.setFont('helvetica', 'normal');
      doc.text(project?.name || '—', 145, 42);

      // 3. Two-Column Vendor & Ship-To Details
      // Vendor Box (Left, X=10 to 102) — height 40 to fit all content
      doc.rect(10, 49, 92, 40, 'D');
      doc.setFillColor(241, 245, 249);
      doc.rect(10, 49, 92, 6, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.text('VENDOR / SUPPLIER DETAILS', 13, 53);

      doc.setFont('helvetica', 'bold');
      doc.text(vName.toUpperCase(), 13, 59);
      doc.setFont('helvetica', 'normal');
      const vAddrLines = doc.splitTextToSize(vAddress, 86);
      let addrY = 63;
      for (let i = 0; i < Math.min(vAddrLines.length, 4); i++) {
        doc.text(vAddrLines[i], 13, addrY);
        addrY += 3.5;
      }
      // Always place GSTIN and Contact within box (max Y = 84)
      const gstY = Math.max(addrY + 1, 70);
      const contactY = gstY + 4.5;
      doc.setFont('helvetica', 'bold');
      doc.text(`GSTIN: ${vGstin}`, 13, gstY);
      doc.setFont('helvetica', 'normal');
      const contactStr = `Contact: ${vContact} | Email: ${vEmail}`;
      const contactLines = doc.splitTextToSize(contactStr, 86);
      contactLines.slice(0, 2).forEach((line, i) => doc.text(line, 13, contactY + i * 3.5));

      // Ship To Box (Right, X=108 to 200) — height 40 to match vendor box
      doc.rect(108, 49, 92, 40, 'D');
      doc.setFillColor(241, 245, 249);
      doc.rect(108, 49, 92, 6, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.text('SHIP TO / DISPATCH DETAILS', 111, 53);

      doc.setFont('helvetica', 'bold');
      const dispatchAddr = po.dispatchTo || 'DEEPIKA BUILTECH ENGINEERING\nSurvey No.44/5, Rajakulam Road,\nVaivayur Post, Karur Village, Kanchipuram - 631 561\nGSTIN: 33AEGPL3660M1ZC';
      const dispatchLines = doc.splitTextToSize(dispatchAddr, 86);
      doc.text(dispatchLines[0] || '', 111, 59);
      doc.setFont('helvetica', 'normal');
      let dispY = 63;
      for (let i = 1; i < Math.min(dispatchLines.length, 7); i++) {
        doc.text(dispatchLines[i], 111, dispY);
        dispY += 3.5;
      }


      // Calculate totals
      const subtotal = po.items.reduce((acc, i) => acc + (Number(i.rate) * Number(i.qty)), 0);
      const freight = Number(po.freightCharges) || 0;
      const loading = Number(po.loadingCharges) || 0;
      const unloading = Number(po.unloadingCharges) || 0;
      const weighing = Number(po.weighingCharges) || 0;
      
      // Compute GST split totals
      const taxType = po.taxType || getPOTaxType(po, vendor);
      const taxBreakdown = getTaxBreakdown(po.items, taxType);
      const gstTotal = taxBreakdown.reduce((sum, row) => sum + row.amount, 0);
      
      const grandTotal = subtotal + gstTotal + freight + loading + unloading + weighing;
      const totalQty = po.items.reduce((acc, i) => acc + (Number(i.qty) || 0), 0);
      const mainUnit = po.items[0]?.unit || 'Nos';

      // 5. Items Table
      const tableData = po.items.map((item, idx) => [
        idx + 1,
        item.itemCode || '—',
        item.itemName || '—',
        item.qty || 0,
        item.unit || 'Nos',
        Number(item.rate || 0).toFixed(2),
        (Number(item.rate || 0) * Number(item.qty || 0)).toFixed(2)
      ]);

      const footRows = [
        ['', '', '', '', '', 'Subtotal', `Rs. ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
      ];
      
      // Push each split GST row
      taxBreakdown.forEach(row => {
        footRows.push(['', '', '', '', '', row.label, `Rs. ${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);
      });
      
      // Helper function to format charge value for PDF
      const getChargeStr = (val) => {
        const numVal = Number(val);
        return !isNaN(numVal) ? `Rs. ${numVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : val;
      };

      if (displayCharges(po.freightCharges)) {
        footRows.push(['', '', '', '', '', 'Freight Charges', getChargeStr(po.freightCharges)]);
      }
      if (displayCharges(po.loadingCharges)) {
        footRows.push(['', '', '', '', '', 'Loading Charges', getChargeStr(po.loadingCharges)]);
      }
      if (displayCharges(po.unloadingCharges)) {
        footRows.push(['', '', '', '', '', 'Unloading Charges', getChargeStr(po.unloadingCharges)]);
      }
      if (displayCharges(po.weighingCharges)) {
        footRows.push(['', '', '', '', '', 'Weighing Charges', getChargeStr(po.weighingCharges)]);
      }
      footRows.push(['', '', '', totalQty, mainUnit, 'GRAND TOTAL', `Rs. ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]);

      const tableConfig = {
        startY: 93,
        margin: { left: 10, right: 10 },
        tableWidth: 190,
        theme: 'grid',
        head: [['SL. No.', 'Item Code', 'Description Of Goods', 'QTY', 'UNIT', 'Rate', 'Total']],
        body: tableData,
        foot: footRows,
        styles: { lineColor: [0, 0, 0], lineWidth: 0.3, overflow: 'linebreak' },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9, lineWidth: 0.3, lineColor: [0, 0, 0] },
        bodyStyles: { textColor: [0, 0, 0], fontSize: 8.5 },
        footStyles: { textColor: [0, 0, 0], fontSize: 9, lineWidth: 0.3, lineColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 25, halign: 'left' },
          2: { cellWidth: 63, halign: 'left' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 26, halign: 'right' },
          6: { cellWidth: 28, halign: 'right' }
        },
        didParseCell: function (data) {
          if (data.section === 'foot') {
            if (data.row.index === data.table.foot.length - 1) {
              data.cell.styles.fillColor = [219, 234, 254];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.fillColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            }
          }
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
      let currentY = finalY;

      // Check if we need to add a page to fit the footer elements
      // A4 page height is 297mm. If elements overflow, we add a page.
      if (currentY + 56 > 280) {
        doc.addPage();
        currentY = 20; // start near top of new page
      }

      // 6. Amount in Words Box
      doc.setFillColor(239, 246, 255); // Soft blue background
      doc.rect(10, currentY - 4, 190, 12, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('AMOUNT IN WORDS:', 13, currentY);
      doc.text(numberToWords(grandTotal), 13, currentY + 5);

      currentY = currentY + 12; // move past Amount in Words box

      // 7. Terms and Conditions Box
      doc.rect(10, currentY, 190, 12, 'D');
      doc.setFillColor(241, 245, 249);
      doc.rect(10, currentY, 190, 5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('TERMS & CONDITIONS', 13, currentY + 3.5);

      doc.setFont('helvetica', 'bold');
      doc.text('DELIVERY DATE:', 13, currentY + 9);
      doc.setFont('helvetica', 'normal');
      let deliveryText = po.deliveryDate || po.deliveryTerms || 'Within a Days';
      if (deliveryText && (/^\d{4}-\d{2}-\d{2}$/.test(deliveryText) || /^\d{4}-\d{2}-\d{2}T/.test(deliveryText) || /^\d{2}-\d{2}-\d{4}$/.test(deliveryText))) {
        deliveryText = displayDateFormatted(deliveryText);
      }
      doc.text(deliveryText, 45, currentY + 9);

      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT TERMS:', 110, currentY + 9);
      doc.setFont('helvetica', 'normal');
      doc.text(po.paymentTerms || '45 Days Credit', 145, currentY + 9);

      currentY = currentY + 16; // 12 height + 4 spacing

      // 8. Notes Box (under Terms and Conditions)
      doc.rect(10, currentY, 190, 12, 'D');
      doc.setFillColor(241, 245, 249);
      doc.rect(10, currentY, 190, 5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('NOTES / REMARKS', 13, currentY + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.text(po.remarks || 'ALONG WITH INVOICE, MIL TEST CERTIFICATE REQUIRED', 13, currentY + 9);

      currentY = currentY + 16; // 12 height + 4 spacing

      // 9. Signature / Footer Section
      const sigY = currentY + 2;
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
    setDispatchFields({ ...defaultDispatchFields });
    setIsManualVendor(false);
    setForm({
      vendorId: '',
      vendorName: '',
      vendorAddressLine1: '',
      vendorAddressLine2: '',
      vendorCityPin: '',
      vendorGstin: '',
      vendorContact: '',
      vendorEmail: '',
      freightCharges: '',
      loadingCharges: '',
      unloadingCharges: '',
      weighingCharges: '',
      projectId: '',
      workOrderNo: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      deliveryDate: '',
      status: 'Sent',
      items: [emptyItem()],
      dispatchTo: buildDispatchString(defaultDispatchFields),
      deliveryTerms: format(new Date(), 'yyyy-MM-dd'),
      paymentTerms: '45 Days Credit',
      remarks: '* ALONG WITH INVOICE , MIL TEST CERTIFICATE REQUIRED',
      reference: 'WHATSAPP',
      taxType: 'Intra-State',
    });
  };

  const handleEditClick = (po) => {
    setEditingId(po.id || po._id);
    setIsManualVendor(!po.vendorId && !!po.vendorName);
    const vendor = vendors.find(v => v.id === po.vendorId);
    const determinedTaxType = po.taxType || getPOTaxType(po, vendor);
    const vendorAddrParsed = vendor?.address ? parseAddressString(vendor.address) : { addrLine1: '', addrLine2: '', cityPin: '' };
    
    const parsedDispatch = parseDispatchString(po.dispatchTo || buildDispatchString(defaultDispatchFields));
    const cleanedDispatchTo = buildDispatchString(parsedDispatch);

    setForm({
      vendorId: po.vendorId || '',
      vendorName: po.vendorName || vendor?.name || '',
      vendorAddressLine1: po.vendorAddressLine1 || vendorAddrParsed.addrLine1 || '',
      vendorAddressLine2: po.vendorAddressLine2 || vendorAddrParsed.addrLine2 || '',
      vendorCityPin: po.vendorCityPin || vendorAddrParsed.cityPin || vendor?.city || '',
      vendorGstin: po.vendorGstin || vendor?.gstin || '',
      vendorContact: po.vendorContact || vendor?.contact || '',
      vendorEmail: po.vendorEmail || vendor?.email || '',
      freightCharges: po.freightCharges !== undefined && po.freightCharges !== null ? String(po.freightCharges) : '',
      loadingCharges: po.loadingCharges !== undefined && po.loadingCharges !== null ? String(po.loadingCharges) : '',
      unloadingCharges: po.unloadingCharges !== undefined && po.unloadingCharges !== null ? String(po.unloadingCharges) : '',
      weighingCharges: po.weighingCharges !== undefined && po.weighingCharges !== null ? String(po.weighingCharges) : '',
      projectId: po.projectId || '',
      workOrderNo: po.workOrderNo || '',
      date: formatDateString(po.date) || format(new Date(), 'yyyy-MM-dd'),
      deliveryDate: formatDateString(po.deliveryDate) || '',
      status: po.status || 'Sent',
      items: po.items && po.items.length > 0
        ? po.items.map(item => ({
          itemCode: item.itemCode || '',
          itemName: item.itemName || '',
          qty: item.qty !== undefined ? Number(item.qty) : 1,
          unit: item.unit || 'Nos',
          rate: item.rate !== undefined ? Number(item.rate) : 0,
          gst: item.gst !== undefined ? Number(item.gst) : 18,
          gstAmt: item.gstAmt !== undefined ? Number(item.gstAmt) : 0,
          total: item.total !== undefined ? Number(item.total) : 0,
        }))
        : [emptyItem()],
      dispatchTo: cleanedDispatchTo,
      deliveryTerms: formatDateString(po.deliveryTerms) || format(new Date(), 'yyyy-MM-dd'),
      paymentTerms: po.paymentTerms || '45 Days Credit',
      remarks: po.remarks || '* ALONG WITH INVOICE , MIL TEST CERTIFICATE REQUIRED',
      reference: po.reference || 'WHATSAPP',
      taxType: determinedTaxType,
    });
    setDispatchFields(parsedDispatch);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendorId && !form.vendorName?.trim()) return toast.error('Please select a vendor or enter vendor details manually.');
    if (!form.projectId) return toast.error('Please select a project.');
    if (form.items.some(it => !it.itemName.trim())) return toast.error('All items must have a name.');
    setSubmitting(true);

    const payload = {
      ...form,
      date: new Date(form.date).toISOString(),
      deliveryDate: form.deliveryDate ? new Date(form.deliveryDate).toISOString() : '',
      deliveryTerms: form.deliveryTerms ? new Date(form.deliveryTerms).toISOString() : '',
      loadingCharges: form.loadingCharges || '0',
      unloadingCharges: form.unloadingCharges || '0',
      weighingCharges: form.weighingCharges || '0',
    };

    let result;
    if (editingId) {
      result = await updatePurchaseOrder(editingId, payload);
      if (result) {
        toast.success('Purchase Order updated successfully!');
      }
    } else {
      result = await addPurchaseOrder(payload);
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
  const formCharges = (parseFloat(form.freightCharges) || 0) + (parseFloat(form.loadingCharges) || 0) + (parseFloat(form.unloadingCharges) || 0) + (parseFloat(form.weighingCharges) || 0);
  const formGrand = formSubtotal + formGST + formCharges;

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
      `Dear ${vendor?.name || 'Vendor'},\n\nPlease find enclosed Purchase Order ${po.id} dated ${displayDateFormatted(po.date)}.\n\nKindly acknowledge receipt and confirm delivery schedule.\n\nRegards,\nDeepika Builtech Engineering`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  if (selectedPO) {
    const vendor = vendors.find(v => v.id === selectedPO.vendorId);
    const project = projects.find(p => p.id === selectedPO.projectId);
    const subtotal = selectedPO.items.reduce((acc, i) => acc + (Number(i.rate) * Number(i.qty)), 0);
    const charges = (Number(selectedPO.freightCharges) || 0) + (Number(selectedPO.loadingCharges) || 0) + (Number(selectedPO.unloadingCharges) || 0) + (Number(selectedPO.weighingCharges) || 0);
    const determinedTaxType = selectedPO.taxType || getPOTaxType(selectedPO, vendor);
    const taxBreakdown = getTaxBreakdown(selectedPO.items, determinedTaxType);
    const gstTotal = taxBreakdown.reduce((sum, row) => sum + row.amount, 0);
    const grandTotal = subtotal + gstTotal + charges;

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
            <p className="text-lg font-bold">{selectedPO.vendorName || vendor?.name}</p>
            <p className="text-sm text-text-gray">
              Address: {[selectedPO.vendorAddressLine1, selectedPO.vendorAddressLine2, selectedPO.vendorCityPin].filter(Boolean).join(', ') || vendor?.address}
            </p>
            <p className="text-sm text-text-gray">Contact: {selectedPO.vendorContact || vendor?.contact}</p>
            <p className="text-sm text-text-gray">Email: {selectedPO.vendorEmail || vendor?.email}</p>
            <p className="text-sm text-text-gray">GSTIN: {selectedPO.vendorGstin || vendor?.gstin}</p>
          </div>
          <div className="card space-y-3">
            <h3 className="font-bold text-primary border-b pb-2 uppercase tracking-wide text-sm">Project Details</h3>
            <p className="text-lg font-bold">{project?.name}</p>
            <p className="text-sm text-text-gray">Work Order No: {selectedPO.workOrderNo}</p>
            <p className="text-sm text-text-gray">Buyer's Ref / Reference: {selectedPO.reference || 'WHATSAPP'}</p>
            {selectedPO.deliveryDate && (
              <p className="text-sm text-text-gray">
                Expected Delivery: {displayDateFormatted(selectedPO.deliveryDate)}
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
              <span className="font-semibold">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {taxBreakdown.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-between text-sm">
                <span className="text-text-gray">{row.label}:</span>
                <span className="font-semibold">₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
            {displayCharges(selectedPO.freightCharges) && (
              <div className="flex justify-between text-sm">
                <span className="text-text-gray">Freight Charges:</span>
                <span className="font-semibold">
                  {isNaN(Number(selectedPO.freightCharges)) ? selectedPO.freightCharges : `₹${Number(selectedPO.freightCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
            )}
            {displayCharges(selectedPO.loadingCharges) && (
              <div className="flex justify-between text-sm">
                <span className="text-text-gray">Loading Charges:</span>
                <span className="font-semibold">
                  {isNaN(Number(selectedPO.loadingCharges)) ? selectedPO.loadingCharges : `₹${Number(selectedPO.loadingCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
            )}
            {displayCharges(selectedPO.unloadingCharges) && (
              <div className="flex justify-between text-sm">
                <span className="text-text-gray">Unloading Charges:</span>
                <span className="font-semibold">
                  {isNaN(Number(selectedPO.unloadingCharges)) ? selectedPO.unloadingCharges : `₹${Number(selectedPO.unloadingCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
            )}
            {displayCharges(selectedPO.weighingCharges) && (
              <div className="flex justify-between text-sm">
                <span className="text-text-gray">Weighing Charges:</span>
                <span className="font-semibold">
                  {isNaN(Number(selectedPO.weighingCharges)) ? selectedPO.weighingCharges : `₹${Number(selectedPO.weighingCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
            )}
            <div className="h-px bg-border" />
            <div className="flex justify-between text-lg font-bold text-primary">
              <span>Grand Total:</span>
              <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="card space-y-3">
          <h3 className="font-bold border-b pb-2 text-text-dark">Terms & Conditions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-text-gray text-xs uppercase tracking-wide">Delivery Date (Terms)</p>
              <p className="font-semibold text-text-dark mt-0.5">
                {selectedPO.deliveryTerms ? displayDateFormatted(selectedPO.deliveryTerms) : 'Within a Days'}
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
                const charges = (Number(po.freightCharges) || 0) + (Number(po.loadingCharges) || 0) + (Number(po.unloadingCharges) || 0) + (Number(po.weighingCharges) || 0);
                const total = po.items.reduce((acc, i) => acc + Number(i.total), 0) + charges;
                return (
                  <tr key={po.id}>
                    <td className="font-semibold text-primary">{po.id}</td>
                    <td>{displayDateFormatted(po.date)}</td>
                    <td className="font-medium">{po.vendorName || vendors.find(v => v.id === po.vendorId)?.name || '—'}</td>
                    <td>{projects.find(p => p.id === po.projectId)?.name}</td>
                    <td className="text-right font-bold">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-text-dark">Vendor *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextManual = !isManualVendor;
                        setIsManualVendor(nextManual);
                        setForm(f => ({
                          ...f,
                          vendorId: '',
                          vendorName: '',
                          vendorAddressLine1: '',
                          vendorAddressLine2: '',
                          vendorCityPin: '',
                          vendorGstin: '',
                          vendorContact: '',
                          vendorEmail: ''
                        }));
                      }}
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      {isManualVendor ? 'Search Registered' : 'Enter Manually'}
                    </button>
                  </div>
                  {isManualVendor ? (
                    <input
                      type="text"
                      className="input-field w-full text-sm py-2"
                      placeholder="Enter Vendor Name manually..."
                      value={form.vendorName || ''}
                      onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))}
                      required
                    />
                  ) : (
                    <Autocomplete
                      options={vendors.map(v => ({ id: v.id, name: v.name }))}
                      onSelect={(v) => {
                        const selected = vendors.find(vend => vend.id === v.id);
                        const addrParsed = parseAddressString(selected?.address);
                        const gstin = selected?.gstin || '33AAGCB5988F1ZH';
                        const cleanGstin = gstin.trim().replace(/[^0-9a-zA-Z]/g, '');
                        let newTaxType = 'Intra-State';
                        if (cleanGstin.length >= 2) {
                          const stateCode = cleanGstin.substring(0, 2);
                          let dispatchStateCode = '33';
                          if (dispatchFields.gstin && dispatchFields.gstin.length >= 2) {
                            dispatchStateCode = dispatchFields.gstin.substring(0, 2);
                          }
                          if (stateCode !== dispatchStateCode) {
                            newTaxType = 'Inter-State';
                          }
                        }
                        setForm(f => ({
                          ...f,
                          vendorId: v.id,
                          vendorName: selected?.name || '',
                          vendorAddressLine1: addrParsed.addrLine1 || '',
                          vendorAddressLine2: addrParsed.addrLine2 || '',
                          vendorCityPin: addrParsed.cityPin || selected?.city || '',
                          vendorGstin: gstin,
                          vendorContact: selected?.contact || '',
                          vendorEmail: selected?.email || '',
                          taxType: newTaxType
                        }));
                      }}
                      placeholder="Search/Select Vendor..."
                      value={form.vendorId}
                      onAddNew={handleAddNewVendor}
                    />
                  )}
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
                  <label className="text-sm font-medium text-text-dark">GST Transaction Type</label>
                  <select
                    className="input-field w-full font-semibold"
                    value={form.taxType || 'Intra-State'}
                    onChange={e => setForm(f => ({ ...f, taxType: e.target.value }))}
                  >
                    <option value="Intra-State">Intra-State (CGST + SGST)</option>
                    <option value="Inter-State">Inter-State (IGST)</option>
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

              {/* Side by side Vendor details and Shipped TO details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vendor Address Details */}
                <div className="card space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-text-dark">Vendor Address Details (Edit manually if needed) *</label>
                  </div>
                  <div className="space-y-2">
                    {[
                      { key: 'vendorName',         label: 'Vendor Name',     placeholder: 'e.g. Tata Steel Distribution' },
                      { key: 'vendorAddressLine1', label: 'Address Line 1',  placeholder: 'e.g. No. 15, Ponniamman Nagar Road' },
                      { key: 'vendorAddressLine2', label: 'Address Line 2',  placeholder: 'e.g. Karur Village, Vaivayur Post' },
                      { key: 'vendorCityPin',      label: 'City/State/PIN', placeholder: 'e.g. Chennai, Tamil Nadu - 600095' },
                      { key: 'vendorGstin',        label: 'GSTIN',           placeholder: 'e.g. 33AAGCB5988F1ZH' },
                      { key: 'vendorContact',      label: 'Contact Info',    placeholder: 'e.g. Ashish Agarwal (9841160237)' },
                      { key: 'vendorEmail',        label: 'Email Address',   placeholder: 'e.g. sales@vendor.com' }
                    ].map(({ key, label, placeholder }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-text-gray uppercase tracking-wider w-32 shrink-0">{label}</span>
                        <input
                          className="input-field flex-1 text-sm py-1.5"
                          type="text"
                          placeholder={placeholder}
                          value={form[key] || ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (key === 'vendorGstin') {
                              const cleanGstin = val.trim().replace(/[^0-9a-zA-Z]/g, '');
                              let newTaxType = 'Intra-State';
                              if (cleanGstin.length >= 2) {
                                const stateCode = cleanGstin.substring(0, 2);
                                let dispatchStateCode = '33';
                                if (dispatchFields.gstin && dispatchFields.gstin.length >= 2) {
                                  dispatchStateCode = dispatchFields.gstin.substring(0, 2);
                                }
                                if (stateCode !== dispatchStateCode) {
                                  newTaxType = 'Inter-State';
                                }
                              }
                              setForm(f => ({ ...f, vendorGstin: val, taxType: newTaxType }));
                            } else {
                              setForm(f => ({ ...f, [key]: val }));
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping & Dispatch Address */}
                <div className="card space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-text-dark">Dispatch / Shipped TO Address *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDispatchDropdown(v => !v)}
                      className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      Saved Addresses
                    </button>
                    {showDispatchDropdown && (
                      <div className="absolute right-0 top-9 z-[70] w-80 bg-white border border-border rounded-xl shadow-2xl overflow-hidden">
                        <div className="p-2 border-b border-border">
                          <input
                            type="text"
                            placeholder="Search saved addresses..."
                            className="input-field w-full text-xs py-1.5"
                            value={dispatchDropdownSearch}
                            onChange={e => setDispatchDropdownSearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="max-h-52 overflow-y-auto custom-scrollbar">
                          {filteredSavedAddresses.length === 0 ? (
                            <p className="p-4 text-xs text-text-gray text-center italic">No saved addresses found.</p>
                          ) : filteredSavedAddresses.map((addr, idx) => (
                            <div key={idx} className="flex items-start gap-1 border-b border-border last:border-0 hover:bg-primary-bg transition-colors group">
                              <button
                                type="button"
                                className="flex-1 text-left px-3 py-2.5 text-xs font-medium text-text-dark whitespace-pre-line"
                                onClick={() => applyDispatchAddress(addr)}
                              >
                                {addr}
                              </button>
                              {addr !== buildDispatchString(defaultDispatchFields) && (
                                <button
                                  type="button"
                                  title="Remove this address"
                                  onClick={() => deleteDispatchAddress(addr)}
                                  className="p-2 text-text-gray hover:text-error opacity-0 group-hover:opacity-100 transition-all mt-1 shrink-0"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {showDispatchDropdown && (
                      <div className="fixed inset-0 z-[65]" onClick={() => { setShowDispatchDropdown(false); setDispatchDropdownSearch(''); }} />
                    )}
                  </div>
                </div>

                {/* Structured Address Rows */}
                <div className="space-y-2">
                  {[
                    { key: 'companyName', label: 'Company / Name', placeholder: 'e.g. DEEPIKA BUILTECH ENGINEERING' },
                    { key: 'addrLine1',   label: 'Address Line 1', placeholder: 'e.g. Survey No.44/5, Rajakulam Road,' },
                    { key: 'addrLine2',   label: 'Address Line 2', placeholder: 'e.g. Vaivayur Post, Kanchipuram - 631 561' },
                    { key: 'cityPin',     label: 'City / State / PIN', placeholder: 'e.g. Chennai, Tamil Nadu - 600 001' },
                    { key: 'gstin',       label: 'GSTIN',           placeholder: 'e.g. 33AEGPL3660M1ZC' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-text-gray uppercase tracking-wider w-32 shrink-0">{label}</span>
                      <input
                        className="input-field flex-1 text-sm py-1.5"
                        type="text"
                        placeholder={placeholder}
                        value={dispatchFields[key]}
                        onChange={e => handleDispatchFieldChange(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                {/* Save New Address Prompt */}
                {isNewDispatchAddress && (
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-amber-800">This is a new address. Save it for future use?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveDispatchAddress(currentDispatchString)}
                        className="text-xs font-bold text-success hover:underline px-2 py-1 bg-success/10 rounded"
                      >
                        Save Address
                      </button>
                      <button
                        type="button"
                        onClick={() => saveDispatchAddress('')}  
                        className="text-xs text-text-gray hover:underline"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                )}
              </div>
              </div> {/* Close Grid grid-cols-1 md:grid-cols-2 */}

              {/* Terms & Conditions */}
              <div className="card space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">Price & Charges (Manual Entry)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-text-dark">Freight Charges</label>
                      <input
                        className="input-field w-full text-right"
                        type="text"
                        placeholder="e.g. 0.00 or Extra"
                        value={form.freightCharges}
                        onChange={e => setForm(f => ({ ...f, freightCharges: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-text-dark">Loading Charges (₹)</label>
                      <input
                        className="input-field w-full text-right"
                        type="text"
                        placeholder="e.g. 0.00 or Extra"
                        value={form.loadingCharges}
                        onChange={e => setForm(f => ({ ...f, loadingCharges: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-text-dark">Unloading Charges (₹)</label>
                      <input
                        className="input-field w-full text-right"
                        type="text"
                        placeholder="e.g. 0.00 or Extra"
                        value={form.unloadingCharges}
                        onChange={e => setForm(f => ({ ...f, unloadingCharges: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-text-dark">Weighing Charges (₹)</label>
                      <input
                        className="input-field w-full text-right"
                        type="text"
                        placeholder="e.g. 0.00 or Extra"
                        value={form.weighingCharges}
                        onChange={e => setForm(f => ({ ...f, weighingCharges: e.target.value }))}
                      />
                    </div>
                  </div>
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
                              className="input-field w-full text-xs cursor-zoom-in"
                              title="Double click to edit in pop-up"
                              placeholder="Item name"
                              value={item.itemName}
                              required
                              onChange={e => handleItemChange(idx, 'itemName', e.target.value)}
                              onDoubleClick={() => setDescModal({
                                isOpen: true,
                                itemIndex: idx,
                                itemCode: item.itemCode || '',
                                text: item.itemName
                              })}
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
                <div className="w-80 space-y-2 bg-primary/5 p-4 rounded-xl border border-primary/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-gray">Subtotal:</span>
                    <span className="font-semibold">₹{formSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {getTaxBreakdown(form.items, form.taxType).map((row, rIdx) => (
                    <div key={rIdx} className="flex justify-between text-sm animate-in fade-in duration-200">
                      <span className="text-text-gray">{row.label}:</span>
                      <span className="font-semibold">₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  {displayCharges(form.freightCharges) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-gray">Freight Charges:</span>
                      <span className="font-semibold">
                        {isNaN(Number(form.freightCharges)) ? form.freightCharges : `₹${parseFloat(form.freightCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                      </span>
                    </div>
                  )}
                  {displayCharges(form.loadingCharges) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-gray">Loading Charges:</span>
                      <span className="font-semibold">
                        {isNaN(Number(form.loadingCharges)) ? form.loadingCharges : `₹${parseFloat(form.loadingCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                      </span>
                    </div>
                  )}
                  {displayCharges(form.unloadingCharges) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-gray">Unloading Charges:</span>
                      <span className="font-semibold">
                        {isNaN(Number(form.unloadingCharges)) ? form.unloadingCharges : `₹${parseFloat(form.unloadingCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                      </span>
                    </div>
                  )}
                  {displayCharges(form.weighingCharges) && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-gray">Weighing Charges:</span>
                      <span className="font-semibold">
                        {isNaN(Number(form.weighingCharges)) ? form.weighingCharges : `₹${parseFloat(form.weighingCharges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                      </span>
                    </div>
                  )}
                  <div className="h-px bg-primary/20" />
                  <div className="flex justify-between font-bold text-primary text-lg">
                    <span>Grand Total:</span>
                    <span>₹{formGrand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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

      {/* ─── Item Description Double-Click Modal ─────────────────────────── */}
      {descModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-primary/10 text-primary px-5 py-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-bold text-text-dark">Edit Item Description</h3>
                <p className="text-xs text-text-gray mt-0.5">
                  Item #{descModal.itemIndex + 1} {descModal.itemCode ? `(Code: ${descModal.itemCode})` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDescModal(prev => ({ ...prev, isOpen: false }))}
                className="text-text-gray hover:text-text-dark"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <textarea
                className="input-field w-full h-40 text-sm font-sans p-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-y"
                placeholder="Enter detailed item description..."
                value={descModal.text}
                onChange={e => setDescModal(prev => ({ ...prev, text: e.target.value }))}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleItemChange(descModal.itemIndex, 'itemName', descModal.text);
                    setDescModal(prev => ({ ...prev, isOpen: false }));
                  }
                }}
              />
              <p className="text-[11px] text-text-gray italic">
                Press <kbd className="font-semibold px-1 py-0.5 bg-gray-100 border rounded">Enter</kbd> to save. Press <kbd className="font-semibold px-1 py-0.5 bg-gray-100 border rounded">Shift + Enter</kbd> for a new line.
              </p>
            </div>
            <div className="px-5 py-3.5 bg-gray-50 border-t border-border flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDescModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-border rounded-lg text-sm text-text-gray hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleItemChange(descModal.itemIndex, 'itemName', descModal.text);
                  setDescModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="btn-primary px-5"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
