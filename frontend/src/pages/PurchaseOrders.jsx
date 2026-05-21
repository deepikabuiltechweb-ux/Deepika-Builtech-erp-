import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingCart, Eye, Printer, Mail, CheckCircle, FileText, Download, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function PurchaseOrders() {
  const { purchaseOrders, deletePurchaseOrder, vendors, projects, isAdmin } = useApp();
  const [selectedPO, setSelectedPO] = useState(null);

  const generatePDF = (po) => {
    const vendor = vendors.find(v => v.id === po.vendorId);
    const project = projects.find(p => p.id === po.projectId);
    const doc = new jsPDF();

    // Company Header
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('DEEPIKA BUILTECH PRIVATE LIMITED', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('No. 12, Main Road, Industrial Suburb, Bangalore - 560010', 105, 30, { align: 'center' });

    // PO Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('PURCHASE ORDER', 14, 55);
    doc.setFontSize(10);
    doc.text(`PO No: ${po.id}`, 14, 65);
    doc.text(`Date: ${format(new Date(po.date), 'dd-MM-yyyy')}`, 14, 70);
    
    // Vendor Info
    doc.setFontSize(12);
    doc.text('VENDOR DETAILS:', 14, 85);
    doc.setFontSize(10);
    doc.text(vendor?.name || 'N/A', 14, 92);
    doc.text(`Contact: ${vendor?.contact}`, 14, 97);
    doc.text(`Email: ${vendor?.email}`, 14, 102);

    // Project Info
    doc.text('SHIP TO:', 120, 85);
    doc.text(project?.name || 'N/A', 120, 92);
    doc.text(`Work Order: ${po.workOrderNo}`, 120, 97);

    // Table
    const tableData = po.items.map((item, idx) => [
      idx + 1,
      item.itemCode,
      item.itemName,
      item.qty,
      item.unit,
      item.rate.toLocaleString(),
      `${item.gst}%`,
      item.total.toLocaleString()
    ]);

    doc.autoTable({
      startY: 115,
      head: [['#', 'Code', 'Item Description', 'Qty', 'Unit', 'Rate', 'GST%', 'Total']],
      body: tableData,
      headStyles: { fillColor: [30, 58, 138] },
    });

    const finalY = doc.lastAutoTable.finalY;
    const subtotal = po.items.reduce((acc, i) => acc + (i.rate * i.qty), 0);
    const gstTotal = po.items.reduce((acc, i) => acc + i.gstAmt, 0);
    const grandTotal = subtotal + gstTotal;

    doc.text(`Subtotal:`, 140, finalY + 10);
    doc.text(`₹${subtotal.toLocaleString()}`, 180, finalY + 10, { align: 'right' });
    doc.text(`GST Total:`, 140, finalY + 15);
    doc.text(`₹${gstTotal.toLocaleString()}`, 180, finalY + 15, { align: 'right' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Grand Total:`, 140, finalY + 25);
    doc.text(`₹${grandTotal.toLocaleString()}`, 180, finalY + 25, { align: 'right' });

    doc.save(`${po.id}.pdf`);
    toast.success("PDF Generated!");
  };

  if (selectedPO) {
    const vendor = vendors.find(v => v.id === selectedPO.vendorId);
    const project = projects.find(p => p.id === selectedPO.projectId);
    const subtotal = selectedPO.items.reduce((acc, i) => acc + (i.rate * i.qty), 0);
    const gstTotal = selectedPO.items.reduce((acc, i) => acc + i.gstAmt, 0);
    const grandTotal = subtotal + gstTotal;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedPO(null)} className="text-text-gray hover:text-primary">← Back</button>
            <h2 className="text-2xl font-bold">Purchase Order Detail: {selectedPO.id}</h2>
          </div>
          <div className="flex gap-3">
             <button onClick={() => generatePDF(selectedPO)} className="btn-primary bg-white text-primary border border-primary hover:bg-primary-bg">
                <Printer className="w-4 h-4" /> Print PDF
             </button>
             <button className="btn-primary">
                <Mail className="w-4 h-4" /> Email Vendor
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card space-y-4">
             <h3 className="font-bold text-primary border-b pb-2 uppercase tracking-wide text-sm">Vendor Details</h3>
             <div>
                <p className="text-lg font-bold">{vendor?.name}</p>
                <p className="text-sm text-text-gray">Contact: {vendor?.contact}</p>
                <p className="text-sm text-text-gray">Email: {vendor?.email}</p>
             </div>
          </div>
          <div className="card space-y-4">
             <h3 className="font-bold text-primary border-b pb-2 uppercase tracking-wide text-sm">Project & Shipping</h3>
             <div>
                <p className="text-lg font-bold">{project?.name}</p>
                <p className="text-sm text-text-gray">Work Order No: {selectedPO.workOrderNo}</p>
                <p className="text-sm text-text-gray">Expected Delivery: {format(new Date(), 'dd-MM-yyyy')}</p>
             </div>
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
                       <td className="text-right">₹{item.rate.toLocaleString()}</td>
                       <td className="text-right">{item.gst}%</td>
                       <td className="text-right">₹{item.gstAmt.toLocaleString()}</td>
                       <td className="text-right font-bold text-primary">₹{item.total.toLocaleString()}</td>
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
              <div className="h-px bg-border"></div>
              <div className="flex justify-between text-lg font-bold text-primary">
                 <span>Grand Total:</span>
                 <span>₹{grandTotal.toLocaleString()}</span>
              </div>
           </div>
        </div>

        <div className="card">
           <h3 className="font-bold mb-4">Terms & Conditions</h3>
           <p className="text-sm text-text-gray leading-relaxed">
              1. Delivery must be made within the specified time frame.<br/>
              2. Materials must be of specified brand and quality standards.<br/>
              3. Payment will be made within 30 days of GRN receipt and invoice submission.<br/>
              4. Any damage during transit is the vendor's responsibility.
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Purchase Orders</h1>
          <p className="text-text-gray">Manage and track your official material orders.</p>
        </div>
      </div>

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
                <td colSpan="7" className="p-8 text-center text-text-gray italic">No Purchase Orders found.</td>
              </tr>
            ) : (
              purchaseOrders.map(po => {
                const total = po.items.reduce((acc, i) => acc + i.total, 0);
                return (
                  <tr key={po.id}>
                    <td className="font-semibold text-primary">{po.id}</td>
                    <td>{format(new Date(po.date), 'dd-MM-yyyy')}</td>
                    <td className="font-medium">{vendors.find(v => v.id === po.vendorId)?.name}</td>
                    <td>{projects.find(p => p.id === po.projectId)?.name}</td>
                    <td className="text-right font-bold">₹{total.toLocaleString()}</td>
                    <td>
                      <span className={cn(
                        "badge",
                        po.status === 'Sent' ? "badge-primary" : po.status === 'Partial' ? "badge-warning" : "badge-success"
                      )}>
                        {po.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedPO(po)} className="p-1 text-primary hover:bg-primary-bg rounded"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => generatePDF(po)} className="p-1 text-text-gray hover:bg-primary-bg rounded"><Printer className="w-4 h-4" /></button>
                        <button className="p-1 text-success hover:bg-success/10 rounded"><Mail className="w-4 h-4" /></button>
                        {isAdmin && (
                          <button 
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
    </div>
  );
}
