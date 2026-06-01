import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Users, Star, MapPin, Phone, Mail, Award, TrendingUp, 
  ShoppingBag, Plus, Trash2, Edit2, X, Download, Eye, ShoppingCart 
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Vendors() {
  const { vendors, projects, purchaseOrders, addVendor, updateVendor, deleteVendor, canEdit, isAdmin } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewingVendor, setViewingVendor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Material',
    city: '',
    email: '',
    contact: '',
    rating: 4.5
  });

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

  const getVendorStats = (vendorId) => {
    const orders = purchaseOrders.filter(po => po.vendorId === vendorId);
    const spent = orders.reduce((acc, po) => acc + po.items.reduce((sum, item) => sum + item.total, 0), 0);
    return { count: orders.length, spent };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      const result = await updateVendor(editingId, formData);
      if (result) {
        setIsModalOpen(false);
        resetForm();
      }
    } else {
      const result = await addVendor(formData);
      if (result) {
        setIsModalOpen(false);
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', category: 'Material', city: '', email: '', contact: '', rating: 4.5 });
  };

  const handleEdit = (vendor) => {
    setEditingId(vendor._id || vendor.id);
    setFormData({
      name: vendor.name,
      category: vendor.category,
      city: vendor.city,
      email: vendor.email,
      contact: vendor.contact,
      rating: vendor.rating
    });
    setIsModalOpen(true);
  };

  const categories = ['Material', 'Service', 'Consultant', 'Logistics', 'Other'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Vendor Directory</h1>
          <p className="text-text-gray">Manage supplier relationships and performance ratings.</p>
        </div>
        {canEdit && (
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">
            <Users className="w-4 h-4" /> Add New Vendor
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="space-y-6">
            {(vendors || []).filter(v => v !== null).map(vendor => {
               const stats = getVendorStats(vendor.id);
               return (
                  <div key={vendor.id} className="card hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-primary">
                     <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-xl bg-primary-bg flex items-center justify-center text-primary font-bold text-xl group-hover:bg-primary group-hover:text-white transition-colors">
                           {vendor.name[0]}
                        </div>
                        <div className="flex-1">
                           <div className="flex justify-between items-start">
                              <div>
                                 <h3 className="text-lg font-bold text-text-dark">{vendor.name}</h3>
                                 <p className="text-xs font-semibold text-primary uppercase tracking-wider">{vendor.category} Supplier</p>
                              </div>
                              <div className="flex items-center gap-1 bg-yellow-100 text-warning px-2 py-1 rounded text-xs font-bold">
                                 <Star className="w-3 h-3 fill-warning" /> {vendor.rating}
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-text-gray">
                              <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {vendor.city}</div>
                              <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> {vendor.email}</div>
                           </div>

                           <div className="flex gap-6 mt-6 pt-4 border-t border-border">
                              <div>
                                 <p className="text-[10px] uppercase font-bold text-text-gray">Total Orders</p>
                                 <p className="font-bold text-text-dark">{stats.count}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] uppercase font-bold text-text-gray">Total Business</p>
                                 <p className="font-bold text-primary">₹{stats.spent.toLocaleString()}</p>
                              </div>
                              <div className="flex-1 text-right flex justify-end gap-2">
                                 <button 
                                    onClick={() => setViewingVendor(vendor)}
                                    className="text-xs font-bold text-primary hover:underline"
                                 >
                                    VIEW PROFILE
                                 </button>
                                 {isAdmin && (
                                    <div className="flex gap-2">
                                       <button 
                                          onClick={() => handleEdit(vendor)}
                                          className="p-1 text-primary hover:bg-primary-bg rounded"
                                       >
                                          <Edit2 className="w-4 h-4" />
                                       </button>
                                       <button 
                                          onClick={() => {
                                             if (window.confirm('Are you sure you want to delete this vendor?')) {
                                                console.log("Deleting vendor with ID:", vendor._id || vendor.id);
                                                deleteVendor(vendor._id || vendor.id);
                                             }
                                          }}
                                          className="p-1 text-error hover:bg-error/10 rounded"
                                       >
                                          <Trash2 className="w-4 h-4" />
                                       </button>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               );
            })}
         </div>

         <div className="space-y-6">
            <div className="card bg-primary-dark text-white p-8 overflow-hidden relative">
               <div className="relative z-10">
                  <Award className="w-12 h-12 mb-4 text-blue-300" />
                  <h3 className="text-2xl font-bold mb-2">Performance Insights</h3>
                  <p className="text-white/70 mb-6 text-sm">Automated vendor rating based on delivery time, quality rejection, and price competitive metrics.</p>
                  
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold uppercase"><span>On-Time Delivery</span><span>94%</span></div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-success w-[94%]"></div></div>
                     </div>
                     <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold uppercase"><span>Material Quality</span><span>98%</span></div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-primary-light w-[98%]"></div></div>
                     </div>
                     <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold uppercase"><span>Price Competitive</span><span>82%</span></div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-warning w-[82%]"></div></div>
                     </div>
                  </div>
               </div>
               <TrendingUp className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5" />
            </div>

            <div className="card">
               <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-primary" /> Top Suppliers by Value</h3>
               <div className="space-y-4">
                  {vendors.sort((a,b) => getVendorStats(b.id).spent - getVendorStats(a.id).spent).slice(0, 5).map((v, i) => (
                     <div key={v.id} className="flex items-center gap-4 p-3 hover:bg-primary-bg rounded-lg transition-colors">
                        <div className="w-8 h-8 rounded bg-primary-bg text-primary flex items-center justify-center font-bold text-xs">{i+1}</div>
                        <div className="flex-1">
                           <p className="text-sm font-bold text-text-dark">{v.name}</p>
                           <p className="text-xs text-text-gray">{v.category}</p>
                        </div>
                        <p className="font-bold text-primary">₹{getVendorStats(v.id).spent.toLocaleString()}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* Add Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-primary-dark p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Vendor' : 'Add New Vendor'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="text-white/70 hover:text-white">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-gray mb-1">Vendor Name</label>
                  <input 
                    type="text" 
                    required 
                    className="input-field" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-gray mb-1">Category</label>
                  <select 
                    className="input-field"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-gray mb-1">City</label>
                  <input 
                    type="text" 
                    required
                    className="input-field" 
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-gray mb-1">Email</label>
                  <input 
                    type="email" 
                    required
                    className="input-field" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-gray mb-1">Contact No</label>
                  <input 
                    type="text" 
                    required
                    className="input-field" 
                    value={formData.contact}
                    onChange={(e) => setFormData({...formData, contact: e.target.value})}
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
                  {editingId ? 'Update Vendor' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Profile Modal */}
      {viewingVendor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-6 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl animate-in fade-in slide-in-from-top-4 duration-300 overflow-hidden">
            {/* Header */}
            <div className="bg-primary-dark text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-bold text-2xl">
                  {viewingVendor.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{viewingVendor.name}</h2>
                    <span className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                      {viewingVendor.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-white/80 mt-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span>{viewingVendor.rating} Rating</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setViewingVendor(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Info Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card flex items-center gap-3 p-4 bg-primary-bg border border-border">
                  <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-text-gray font-bold uppercase tracking-wider">City / Location</p>
                    <p className="font-semibold text-text-dark truncate">{viewingVendor.city || 'Chennai'}</p>
                  </div>
                </div>
                <div className="card flex items-center gap-3 p-4 bg-primary-bg border border-border">
                  <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-text-gray font-bold uppercase tracking-wider">Contact Number</p>
                    <p className="font-semibold text-text-dark truncate">{viewingVendor.contact || 'N/A'}</p>
                  </div>
                </div>
                <div className="card flex items-center gap-3 p-4 bg-primary-bg border border-border">
                  <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-text-gray font-bold uppercase tracking-wider">Email Address</p>
                    <p className="font-semibold text-text-dark truncate" title={viewingVendor.email}>{viewingVendor.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Statistics Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-primary/5 rounded-xl border border-primary/10 p-5 text-center flex flex-col justify-center items-center">
                  <p className="text-3xl font-extrabold text-primary">
                    {purchaseOrders.filter(po => po.vendorId === viewingVendor.id || po.vendorId === viewingVendor._id).length}
                  </p>
                  <p className="text-xs font-bold uppercase text-text-gray tracking-widest mt-1.5">Total Orders Placed</p>
                </div>
                <div className="bg-primary/5 rounded-xl border border-primary/10 p-5 text-center flex flex-col justify-center items-center">
                  <p className="text-3xl font-extrabold text-primary">
                    ₹{purchaseOrders.filter(po => po.vendorId === viewingVendor.id || po.vendorId === viewingVendor._id)
                      .reduce((sum, po) => sum + po.items.reduce((s, i) => s + (Number(i.total) || 0), 0), 0)
                      .toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs font-bold uppercase text-text-gray tracking-widest mt-1.5">Total Business Value</p>
                </div>
              </div>

              {/* Purchase Order History Table */}
              <div>
                <h3 className="font-bold text-text-dark mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" /> Purchase Order History
                </h3>
                <div className="table-container max-h-72 overflow-y-auto custom-scrollbar border border-border rounded-xl">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>PO Number</th>
                        <th>PO Date</th>
                        <th className="text-right">Total Amount</th>
                        <th>Status</th>
                        <th className="text-center w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const vendorPOs = purchaseOrders.filter(po => po.vendorId === viewingVendor.id || po.vendorId === viewingVendor._id);
                        if (vendorPOs.length === 0) {
                          return (
                            <tr>
                              <td colSpan="5" className="p-8 text-center text-text-gray italic">
                                No purchase orders registered for this vendor.
                              </td>
                            </tr>
                          );
                        }
                        return vendorPOs.map(po => {
                          const poTotal = po.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
                          return (
                            <tr key={po.id || po._id}>
                              <td className="font-semibold text-primary">{po.id}</td>
                              <td>{format(new Date(po.date), 'dd-MM-yyyy')}</td>
                              <td className="text-right font-bold">₹{poTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
                              <td className="text-center">
                                <button
                                  title="Download PO PDF"
                                  onClick={() => generatePDF(po)}
                                  className="p-1.5 text-text-gray hover:bg-primary-bg rounded transition-colors"
                                  type="button"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-end bg-gray-50">
              <button 
                onClick={() => setViewingVendor(null)}
                className="px-5 py-2 rounded-lg border border-border text-sm font-bold text-text-gray hover:bg-gray-100 transition-colors"
                type="button"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
