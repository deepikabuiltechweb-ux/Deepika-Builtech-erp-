import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Autocomplete from '../components/ui/Autocomplete';
import { Warehouse, Plus, Eye, CheckCircle, Package, Truck, UserCheck, Trash2, X, Download, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

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

export default function StoreGRN() {
  const { grns, purchaseOrders, addGRN, deleteGRN, updateStockOnGRN, vendors, updatePurchaseOrder, isAdmin, projects, materials } = useApp();
  const [showEntry, setShowEntry] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedPOId, setSelectedPOId] = useState('');
  const [grnSearch, setGrnSearch] = useState('');
  const [poSearch, setPoSearch] = useState('');

  const filteredGrns = grns.filter(grn => {
    if (!grnSearch) return true;
    const query = grnSearch.toLowerCase().trim();
    const vendorName = grn.vendorName || vendors.find(v => v.id === grn.vendorId)?.name || '';
    return (
      (grn.id || '').toLowerCase().includes(query) ||
      (grn.poRef || grn.poId || '').toLowerCase().includes(query) ||
      vendorName.toLowerCase().includes(query)
    );
  });

  const filteredPendingPOs = purchaseOrders.filter(p => {
    const isPending = p.status === 'Sent' || p.status === 'Partial';
    if (!isPending) return false;
    
    if (!poSearch) return true;
    const query = poSearch.toLowerCase().trim();
    const vendorName = p.vendorName || vendors.find(v => v.id === p.vendorId)?.name || '';
    return (
      (p.id || '').toLowerCase().includes(query) ||
      vendorName.toLowerCase().includes(query)
    );
  });

  // ─── PDF Generator ────────────────────────────────────────────────────────
  const generatePDF = (grn) => {
    try {
      if (!grn) {
        toast.error("GRN record is missing or invalid.");
        return;
      }

      const doc = new jsPDF();

      // Header banner
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, 210, 42, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('DEEPIKA BUILTECH ENGINEERING', 105, 18, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('No. 12, Main Road, Industrial Suburb, Bangalore - 560010', 105, 27, { align: 'center' });
      doc.text('GSTIN: 29ABCDE1234F1Z5  |  Tel: +91 80 1234 5678', 105, 34, { align: 'center' });

      // GRN Title strip
      doc.setFillColor(239, 246, 255);
      doc.rect(0, 42, 210, 12, 'F');
      doc.setTextColor(30, 64, 175);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('GOODS RECEIPT NOTE (GRN)', 14, 51);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(`GRN No: ${grn.id || '—'}`, 140, 48);

      let grnDateFormatted = '—';
      if (grn.grnDate) {
        try {
          grnDateFormatted = format(new Date(grn.grnDate), 'dd-MM-yyyy');
        } catch (e) {
          grnDateFormatted = grn.grnDate;
        }
      }
      doc.text(`Date: ${grnDateFormatted}`, 140, 54);

      // Vendor & Shipment Boxes
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
      
      const vName = grn.vendorName || (vendors && vendors.find(v => v.id === grn.vendorId)?.name) || 'N/A';
      doc.text(vName, 17, 74);
      doc.text(`PO Reference: ${grn.poRef || grn.poId || '—'}`, 17, 80);
      doc.text(`DC / Invoice No: ${grn.dcNo || grn.invoiceNo || '—'}`, 17, 86);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text('RECEIVING DETAILS', 114, 67);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(`Vehicle No: ${grn.vehicleNo || '—'}`, 114, 74);
      doc.text(`Driver Name: ${grn.driverName || '—'}`, 114, 80);
      doc.text(`Received By: ${grn.receivedBy || '—'}`, 114, 86);

      // Items Table
      const tableData = (grn.items || []).map((item, idx) => [
        idx + 1,
        item.materialId || '—',
        item.name || '—',
        item.unitPrice ? `Rs. ${Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—',
        item.unitPrice ? `Rs. ${(Number(item.receivedQty || 0) * Number(item.unitPrice)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—',
        item.poQty || 0,
        item.receivedQty || 0,
        item.rejectedQty || 0,
        item.fromPO ? (item.keepPending === false ? 'NO' : 'YES') : '—',
        item.qualityOk ? 'PASSED' : 'FAILED',
        item.damageRemarks || '—'
      ]);

      const tableConfig = {
        startY: 104,
        head: [['#', 'Item Code', 'Material Description', 'Unit Price', 'Total Price', 'PO Qty', 'Received Qty', 'Rejected Qty', 'Pending?', 'Quality Status', 'Remarks / Damages']],
        body: tableData,
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 18 },
          3: { halign: 'right', cellWidth: 18 },
          4: { halign: 'right', cellWidth: 20 },
          5: { halign: 'right', cellWidth: 15 },
          6: { halign: 'right', cellWidth: 20 },
          7: { halign: 'right', cellWidth: 20 },
          8: { halign: 'center', cellWidth: 15 },
          9: { halign: 'center', cellWidth: 18 }
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

      const finalY = (doc.lastAutoTable?.finalY || doc.previousAutoTable?.finalY || 150) + 10;

      // Remarks
      if (grn.remarks) {
        doc.setFillColor(254, 243, 199);
        doc.rect(14, finalY, 182, 14, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 83, 9);
        doc.text('REMARKS:', 18, finalY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 53, 4);
        doc.text(grn.remarks, 18, finalY + 10);
      }

      // Signature lines
      const sigY = finalY + (grn.remarks ? 35 : 25);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.line(14, sigY, 70, sigY);
      doc.line(140, sigY, 196, sigY);
      doc.text('Received / Checked By', 14, sigY + 5);
      doc.text('Authorized Store Manager', 140, sigY + 5);

      doc.save(`${grn.id || 'GRN'}.pdf`);
      toast.success('GRN PDF downloaded!');
    } catch (err) {
      console.error("PDF Generation Error:", err);
      toast.error(`Failed to generate PDF: ${err.message}`);
    }
  };
  
  const [formData, setFormData] = useState({
    grnDate: format(new Date(), 'yyyy-MM-dd'),
    poRef: '',
    vendorId: '',
    vehicleNo: '',
    driverName: '',
    dcNo: '',
    receivedBy: 'Store Manager',
    items: [],
    remarks: ''
  });

  const getPOItemKey = (item, idx, materialsList) => {
    let key = item.materialId || item.itemCode || '';
    if (!key) {
      const matchingMat = materialsList.find(m => m.name?.toLowerCase().trim() === item.itemName?.toLowerCase().trim());
      if (matchingMat) {
        key = matchingMat.id;
      } else {
        // Generate a unique incremental MATxxx ID
        const maxIdNum = materialsList.reduce((max, m) => {
          const num = parseInt(m.id?.replace(/\D/g, '') || 0);
          return isNaN(num) ? max : (num > max ? num : max);
        }, 0);
        key = `MAT${String(maxIdNum + 1 + idx).padStart(3, '0')}`;
      }
    }
    return key;
  };

  const handlePOSelect = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      // Find all GRNs associated with this PO to compute past received quantities
      const poGrns = grns.filter(g => g.poRef === po.id || g.poId === po.id);

      setFormData({
        ...formData,
        poRef: poId,
        vendorId: po.vendorId,
        items: po.items.map((item, idx) => {
          const key = getPOItemKey(item, idx, materials);
          const pastGrnsForItem = poGrns.filter(g => g.items?.some(gi => (gi.materialId || gi.itemCode) === key));
          
          // Check if any past GRN marked this item as closed (keepPending === false)
          const wasClosed = pastGrnsForItem.some(g => {
            const match = g.items?.find(gi => (gi.materialId || gi.itemCode) === key);
            return match && match.keepPending === false;
          });

          const pastReceived = poGrns.reduce((sum, g) => {
            const match = g.items?.find(gi => (gi.materialId || gi.itemCode) === key);
            return sum + (match ? Number(match.receivedQty || 0) : 0);
          }, 0);

          const pendingQty = wasClosed ? 0 : Math.max(0, item.qty - pastReceived);

          return {
            materialId: key,
            name: item.itemName,
            poQty: item.qty,
            prevReceived: pastReceived,
            pendingQty: pendingQty,
            keepPending: pendingQty > 0,
            receivedQty: 0,
            rejectedQty: 0,
            damageRemarks: '',
            qualityOk: true,
            unitPrice: item.rate,
            fromPO: true,
            unit: item.unit || 'Nos'
          };
        })
      });
    } else {
      setFormData({
        ...formData,
        poRef: '',
        vendorId: '',
        items: []
      });
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          id: Date.now(),
          materialId: '',
          name: '',
          poQty: 0,
          receivedQty: 0,
          rejectedQty: 0,
          damageRemarks: '',
          qualityOk: true,
          unitPrice: 0,
          fromPO: false,
          unit: 'Nos'
        }
      ]
    });
  };

  const handleItemSelect = (index, material) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      materialId: material.id,
      name: material.name,
      unitPrice: material.latestPrice || material.lastPrice || 0,
      unit: material.unit || 'Nos'
    };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.poRef && !formData.vendorId) {
      toast.error("Please select a Vendor or a Purchase Order Reference!");
      return;
    }

    if (formData.items.length === 0) {
      toast.error("Please add at least one item!");
      return;
    }

    // Determine vendorId for duplicate validation
    const po = purchaseOrders.find(p => p.id === formData.poRef);
    const vendorId = formData.poRef ? (po?.vendorId || '') : formData.vendorId;
    const dcNo = (formData.dcNo || '').trim();

    if (dcNo) {
      // Check if there is already a GRN with this dcNo / invoiceNo for the same vendor
      const isDuplicate = grns.some(g => 
        g.vendorId === vendorId && 
        (String(g.dcNo || '').trim().toLowerCase() === dcNo.toLowerCase() || 
         String(g.invoiceNo || '').trim().toLowerCase() === dcNo.toLowerCase())
      );
      if (isDuplicate) {
        toast.error(`Duplicate DC / Invoice No: "${dcNo}" has already been entered for this vendor!`);
        return;
      }
    }

    // Check if any item lacks a materialId
    const hasInvalidItem = formData.items.some(item => !item.materialId);
    if (hasInvalidItem) {
      toast.error("Please select a valid material for all items!");
      return;
    }

    // Check if any item's receivedQty exceeds its pendingQty (or poQty)
    const itemsWithExcess = formData.items.filter(item => {
      if (item.fromPO) {
        const limit = item.pendingQty !== undefined ? item.pendingQty : item.poQty;
        return Number(item.receivedQty) > Number(limit);
      }
      return false;
    });

    if (itemsWithExcess.length > 0) {
      const excessDetails = itemsWithExcess.map(item => {
        const limit = item.pendingQty !== undefined ? item.pendingQty : item.poQty;
        return `- ${item.name}: Received Qty (${item.receivedQty}) > Pending/PO Qty (${limit})`;
      }).join('\n');

      const confirmSave = window.confirm(
        `Warning: The received quantity exceeds the pending/PO quantity for the following item(s):\n\n${excessDetails}\n\nDo you want to proceed and save the GRN anyway?`
      );

      if (!confirmSave) {
        return;
      }
    }

    const vendorName = formData.poRef
      ? (po?.vendorName || vendors.find(v => v.id === vendorId)?.name || 'Unknown Vendor')
      : (vendors.find(v => v.id === vendorId)?.name || 'Unknown Vendor');

    const cleanedItems = formData.items.map(item => ({
      ...item,
      receivedQty: Number(item.receivedQty || 0),
      rejectedQty: Number(item.rejectedQty || 0),
      unitPrice: Number(item.unitPrice || 0)
    }));

    const newGRN = {
      ...formData,
      items: cleanedItems,
      poId: formData.poRef || '',
      vendorId,
      vendorName,
      invoiceNo: formData.dcNo
    };

    const success = await addGRN(newGRN);
    if (success) {
      // Update stock using business logic in context
      await updateStockOnGRN(cleanedItems);

      // Update PO status dynamically if there is a PO reference
      if (formData.poRef) {
        const po = purchaseOrders.find(p => p.id === formData.poRef);
        if (po) {
          const receivedMap = {};
          
          // Current GRN items (match by name)
          formData.items.forEach(item => {
            const key = String(item.name || '').toLowerCase().trim();
            if (key) {
              receivedMap[key] = (receivedMap[key] || 0) + (Number(item.receivedQty) || 0);
            }
          });

          // Past GRNs for this PO
          grns.forEach(grn => {
            if (grn.poRef === po.id || grn.poId === po.id) {
              grn.items.forEach(item => {
                const key = String(item.name || '').toLowerCase().trim();
                if (key) {
                  receivedMap[key] = (receivedMap[key] || 0) + (Number(item.receivedQty) || 0);
                }
              });
            }
          });

          // Check if all PO items are fully received or closed
          const isFullyReceived = po.items.every((poItem) => {
            const keyName = String(poItem.itemName || '').toLowerCase().trim();
            
            // Check if closed (keepPending === false) in the current GRN
            const currentItem = cleanedItems.find(it => String(it.name || '').toLowerCase().trim() === keyName);
            if (currentItem && currentItem.keepPending === false) {
              return true; // Marked not pending in this GRN
            }

            // Check if closed in any past GRNs
            let isClosedInPast = false;
            grns.forEach(grn => {
              if (grn.poRef === po.id || grn.poId === po.id) {
                const pastItem = grn.items?.find(it => String(it.name || '').toLowerCase().trim() === keyName);
                if (pastItem && pastItem.keepPending === false) {
                  isClosedInPast = true;
                }
              }
            });
            if (isClosedInPast) {
              return true;
            }

            // Otherwise, check if cumulative received is >= PO quantity
            const cumulativeReceived = receivedMap[keyName] || 0;
            return cumulativeReceived >= Number(poItem.qty || 0);
          });

          const status = isFullyReceived ? 'Complete' : 'Partial';
          await updatePurchaseOrder(formData.poRef, { status });
        }
      }

      setShowEntry(false);
      setFormData({
        grnDate: format(new Date(), 'yyyy-MM-dd'),
        poRef: '',
        vendorId: '',
        vehicleNo: '',
        driverName: '',
        dcNo: '',
        receivedBy: 'Store Manager',
        items: [],
        remarks: ''
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Store / GRN Management</h1>
          <p className="text-text-gray">Receive materials from vendors and update stock inventory.</p>
        </div>
        {!showEntry && (
          <button onClick={() => setShowEntry(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New GRN Entry
          </button>
        )}
      </div>

      {showEntry ? (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-top-4 duration-300">
           <div className="card grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">PO Reference</label>
                <Autocomplete
                  options={purchaseOrders
                    .filter(p => p.status !== 'Complete')
                    .map(p => ({ ...p, name: `${p.id} - ${p.vendorName || vendors.find(v => v.id === p.vendorId)?.name || 'Unknown'}` }))}
                  onSelect={(po) => handlePOSelect(po.id)}
                  placeholder="Search Pending PO..."
                  value={formData.poRef}
                />
                {formData.poRef && (
                  <button
                    type="button"
                    onClick={() => {
                      const po = purchaseOrders.find(p => p.id === formData.poRef);
                      if (po) setSelectedPO(po);
                    }}
                    className="mt-1.5 text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <Eye className="w-3.5 h-3.5" /> View PO details
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">Vendor</label>
                {formData.poRef ? (
                  <input
                    type="text"
                    className="input-field bg-gray-100 cursor-not-allowed text-text-gray"
                    value={vendors.find(v => v.id === formData.vendorId)?.name || 'Unknown Vendor'}
                    disabled
                  />
                ) : (
                  <Autocomplete
                    options={vendors}
                    onSelect={(vendor) => setFormData({ ...formData, vendorId: vendor.id })}
                    placeholder="Search Vendor..."
                    value={formData.vendorId}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">GRN Date</label>
                <input type="date" className="input-field" value={formData.grnDate} onChange={e => setFormData({...formData, grnDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">Vehicle No</label>
                <input type="text" placeholder="KA-01-AB-1234" className="input-field" value={formData.vehicleNo} onChange={e => setFormData({...formData, vehicleNo: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-gray mb-1">DC / Invoice No</label>
                <input type="text" className="input-field" value={formData.dcNo} onChange={e => setFormData({...formData, dcNo: e.target.value})} />
              </div>
           </div>

           <div className="card overflow-hidden">
              <div className="p-4 bg-primary-dark text-white font-semibold flex items-center gap-2">
                 <Package className="w-5 h-5" /> Material Verification
              </div>
              <table className="erp-table">
                 <thead>
                    <tr>
                       <th className="w-1/3">Item Description</th>
                       <th>Item Code</th>
                       <th className="text-right">PO Qty</th>
                       <th className="text-right">Pending Qty</th>
                       <th className="text-center">Pending?</th>
                       <th className="text-right">Received Qty</th>
                       <th className="text-right">Rejected Qty</th>
                       <th className="text-right">Unit Price (₹)</th>
                       <th className="text-right">Total Price (₹)</th>
                       <th>Damage Remarks</th>
                       <th className="text-center">Quality OK</th>
                       <th className="w-12"></th>
                    </tr>
                 </thead>
                 <tbody>
                    {formData.items.length === 0 ? (
                      <tr>
                        <td colSpan="12" className="text-center p-8 text-text-gray italic">
                          No items added yet. Click "Add Item" below to add materials manually.
                        </td>
                      </tr>
                    ) : (
                      formData.items.map((item, index) => (
                        <tr key={item.id || index}>
                           <td>
                              {item.fromPO ? (
                                <div>
                                  <span className="font-medium text-text-dark block">{item.name || '—'}</span>
                                  {item.materialId && (
                                    <span className="text-[10px] text-text-gray font-mono">{item.materialId}</span>
                                  )}
                                </div>
                              ) : (
                                <Autocomplete 
                                   options={materials}
                                   onSelect={(mat) => handleItemSelect(index, mat)}
                                   placeholder="Search by name or item code..."
                                   value={item.materialId}
                                />
                              )}
                           </td>
                           <td>
                              <span className="font-mono text-xs text-text-gray">{item.materialId || '—'}</span>
                           </td>
                           <td className="text-right font-medium text-text-gray">
                              {item.fromPO ? item.poQty : '—'}
                           </td>
                           <td className="text-right font-medium text-warning font-semibold">
                              {item.fromPO ? (item.pendingQty ?? 0) : '—'}
                           </td>
                           <td className="text-center p-2">
                              {item.fromPO ? (
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 mx-auto cursor-pointer"
                                  checked={item.keepPending ?? true}
                                  onChange={(e) => {
                                    const newItems = [...formData.items];
                                    newItems[index].keepPending = e.target.checked;
                                    setFormData({...formData, items: newItems});
                                  }}
                                />
                              ) : '—'}
                           </td>
                           <td className="p-2 w-28">
                              <input 
                                type="number" 
                                className="input-field text-right" 
                                value={item.receivedQty === 0 || item.receivedQty === '0' ? '' : item.receivedQty}
                                onChange={(e) => {
                                  const newItems = [...formData.items];
                                  newItems[index].receivedQty = e.target.value;
                                  setFormData({...formData, items: newItems});
                                }}
                              />
                           </td>
                           <td className="p-2 w-28">
                              <input 
                                type="number" 
                                className="input-field text-right" 
                                value={item.rejectedQty === 0 || item.rejectedQty === '0' ? '' : item.rejectedQty}
                                onChange={(e) => {
                                  const newItems = [...formData.items];
                                  newItems[index].rejectedQty = e.target.value;
                                  setFormData({...formData, items: newItems});
                                }}
                              />
                           </td>
                           <td className="p-2 text-right font-medium text-text-gray">
                              ₹{Number(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                           </td>
                           <td className="p-2 text-right font-bold text-text-dark">
                              ₹{(Number(item.receivedQty || 0) * Number(item.unitPrice || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                           </td>
                           <td className="p-2">
                              <input 
                                type="text" 
                                className="input-field" 
                                placeholder="Any damages?"
                                value={item.damageRemarks}
                                onChange={(e) => {
                                  const newItems = [...formData.items];
                                  newItems[index].damageRemarks = e.target.value;
                                  setFormData({...formData, items: newItems});
                                }}
                              />
                           </td>
                           <td className="text-center">
                              <input 
                                type="checkbox" 
                                className="w-5 h-5 mx-auto"
                                checked={item.qualityOk}
                                onChange={(e) => {
                                  const newItems = [...formData.items];
                                  newItems[index].qualityOk = e.target.checked;
                                  setFormData({...formData, items: newItems});
                                }}
                              />
                           </td>
                           <td>
                              <button 
                                 type="button" 
                                 onClick={() => {
                                   const newItems = formData.items.filter((_, idx) => idx !== index);
                                   setFormData({...formData, items: newItems});
                                 }}
                                 className="p-1 text-error hover:bg-error/10 rounded"
                              >
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                      ))
                    )}
                 </tbody>
              </table>
              <div className="p-4 bg-gray-50 border-t border-border">
                 <button type="button" onClick={handleAddItem} className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add Item
                 </button>
              </div>
           </div>

           <div className="card grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-sm font-medium text-text-gray mb-1">Overall Remarks</label>
                 <textarea 
                    className="input-field h-20"
                    value={formData.remarks}
                    onChange={e => setFormData({...formData, remarks: e.target.value})}
                 ></textarea>
              </div>
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-text-gray mb-1">Received By</label>
                    <input type="text" className="input-field" value={formData.receivedBy} onChange={e => setFormData({...formData, receivedBy: e.target.value})} />
                 </div>
                 <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowEntry(false)} className="px-6 py-2 border border-border rounded-md">Cancel</button>
                    <button type="submit" className="btn-primary px-8">Save GRN & Update Inventory</button>
                 </div>
              </div>
           </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-4">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-gray" />
                  <input 
                     type="text" 
                     placeholder="Search GRNs (No, PO Ref, Vendor)..." 
                     className="input-field pl-10 pr-8 text-sm bg-white shadow-sm" 
                     value={grnSearch}
                     onChange={(e) => setGrnSearch(e.target.value)}
                  />
                  {grnSearch && (
                     <button 
                        type="button"
                        onClick={() => setGrnSearch('')} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-gray hover:text-text-dark"
                     >
                        <X className="w-4 h-4" />
                     </button>
                  )}
               </div>

               <div className="table-container">
                  <table className="erp-table">
                     <thead>
                        <tr>
                           <th>GRN No</th>
                           <th>Date</th>
                           <th>PO Ref</th>
                           <th>Vendor</th>
                           <th>Items</th>
                           <th>Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                        {grns.length === 0 ? (
                          <tr><td colSpan="6" className="p-8 text-center text-text-gray italic">No receipts yet.</td></tr>
                        ) : filteredGrns.length === 0 ? (
                          <tr><td colSpan="6" className="p-8 text-center text-text-gray italic">No receipts match your search.</td></tr>
                        ) : (
                          filteredGrns.map(grn => (
                             <tr key={grn.id}>
                                <td className="font-semibold text-primary">{grn.id}</td>
                                <td>{format(new Date(grn.grnDate), 'dd-MM-yyyy')}</td>
                                <td className="text-text-gray">{grn.poRef || grn.poId}</td>
                                <td className="font-medium">{grn.vendorName || vendors.find(v => v.id === grn.vendorId)?.name || 'Unknown Vendor'}</td>
                                <td>{grn.items.length} Items</td>
                                <td>
                                   <div className="flex gap-2">
                                      <button onClick={() => setSelectedGRN(grn)} className="p-1 text-primary hover:bg-primary-bg rounded" title="View GRN Details"><Eye className="w-4 h-4" /></button>
                                      <button onClick={() => generatePDF(grn)} className="p-1 text-success hover:bg-success/10 rounded" title="Download GRN PDF"><Download className="w-4 h-4" /></button>
                                      {isAdmin && (
                                         <button 
                                            onClick={() => {
                                               if (window.confirm('Are you sure you want to delete this GRN?')) {
                                                  deleteGRN(grn.id);
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
           </div>
           
           <div className="space-y-6">
              <div className="card bg-primary-dark text-white">
                 <h3 className="font-bold mb-3 flex items-center gap-2"><Truck className="w-5 h-5" /> Pending Deliveries</h3>
                 
                 <div className="relative mb-4">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
                     <input 
                        type="text" 
                        placeholder="Search Pending POs..." 
                        className="w-full pl-9 pr-8 py-1.5 bg-white/10 border border-white/20 rounded-md text-xs text-white placeholder-white/60 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/40 transition-all" 
                        value={poSearch}
                        onChange={(e) => setPoSearch(e.target.value)}
                     />
                     {poSearch && (
                        <button 
                           type="button"
                           onClick={() => setPoSearch('')} 
                           className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                        >
                           <X className="w-3.5 h-3.5" />
                        </button>
                     )}
                  </div>

                 <div className="space-y-3">
                    {purchaseOrders.filter(p => p.status === 'Sent' || p.status === 'Partial').length === 0 ? (
                       <p className="text-sm text-white/60 italic text-center py-4">No pending deliveries today.</p>
                    ) : filteredPendingPOs.length === 0 ? (
                       <p className="text-sm text-white/60 italic text-center py-4">No matching deliveries.</p>
                    ) : (
                       filteredPendingPOs.map(p => (
                          <div key={p.id} className="p-3 bg-white/10 rounded-lg border border-white/10">
                             <p className="font-bold">{p.id}</p>
                             <p className="text-xs text-white/70">{p.vendorName || vendors.find(v => v.id === p.vendorId)?.name || 'Unknown Vendor'}</p>
                             <div className="mt-2 flex justify-between items-center">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-warning">{p.status}</span>
                                <div className="flex gap-2">
                                  <button 
                                     type="button"
                                     onClick={() => setSelectedPO(p)} 
                                     className="text-[10px] bg-white/10 text-white border border-white/20 px-2 py-1 rounded font-bold hover:bg-white/20 flex items-center gap-0.5 transition-colors"
                                     title="View Purchase Order Details"
                                  >
                                     <Eye className="w-3 h-3" /> VIEW
                                  </button>
                                  <button onClick={() => { setShowEntry(true); handlePOSelect(p.id); }} className="text-[10px] bg-white text-primary px-2 py-1 rounded font-bold hover:bg-primary-bg transition-colors">RECEIVE</button>
                                </div>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </div>
              <div className="card">
                 <h3 className="font-bold mb-4 flex items-center gap-2 text-text-dark"><UserCheck className="w-5 h-5" /> Today's Statistics</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-primary-bg rounded-lg">
                       <p className="text-xs text-text-gray uppercase">Received</p>
                       <p className="text-xl font-bold text-primary">{grns.filter(g => format(new Date(g.grnDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}</p>
                    </div>
                    <div className="p-3 bg-primary-bg rounded-lg">
                       <p className="text-xs text-text-gray uppercase">Pending</p>
                       <p className="text-xl font-bold text-warning">{purchaseOrders.filter(p => p.status !== 'Complete').length}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* ─── GRN Detail Modal ──────────────────────────────────────────── */}
      {selectedGRN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-xl font-bold text-text-dark">GRN Details — {selectedGRN.id}</h2>
                <p className="text-sm text-text-gray">{format(new Date(selectedGRN.grnDate), 'dd-MM-yyyy')}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => generatePDF(selectedGRN)}
                  className="btn-primary flex items-center gap-2 bg-white text-primary border border-primary hover:bg-primary-bg py-1.5 px-3 rounded-lg text-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button onClick={() => setSelectedGRN(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-text-gray" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Meta Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'PO Reference', value: selectedGRN.poRef || selectedGRN.poId || '—' },
                  { label: 'Vendor', value: selectedGRN.vendorName || vendors.find(v => v.id === selectedGRN.vendorId)?.name || '—' },
                  { label: 'Vehicle No', value: selectedGRN.vehicleNo || '—' },
                  { label: 'DC / Invoice No', value: selectedGRN.dcNo || selectedGRN.invoiceNo || '—' },
                  { label: 'Driver Name', value: selectedGRN.driverName || '—' },
                  { label: 'Received By', value: selectedGRN.receivedBy || '—' },
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
                      <th className="px-4 py-2 text-left">Item Code</th>
                      <th className="px-4 py-2 text-left">Item Description</th>
                      <th className="px-4 py-2 text-right">Unit Price</th>
                      <th className="px-4 py-2 text-right">Total Price</th>
                      <th className="px-4 py-2 text-right">PO Qty</th>
                      <th className="px-4 py-2 text-right">Received</th>
                      <th className="px-4 py-2 text-right">Rejected</th>
                      <th className="px-4 py-2 text-center">Pending?</th>
                      <th className="px-4 py-2 text-center">Quality OK</th>
                      <th className="px-4 py-2 text-left">Damage Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGRN.items.map((item, idx) => (
                      <tr key={idx} className="border-t border-border hover:bg-gray-50">
                        <td className="px-4 py-2 text-text-gray">{idx + 1}</td>
                        <td className="px-4 py-2 font-mono text-xs">{item.materialId || '—'}</td>
                        <td className="px-4 py-2 font-medium">{item.name}</td>
                        <td className="px-4 py-2 text-right font-semibold">₹{Number(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-2 text-right font-bold text-text-dark">₹{(Number(item.receivedQty || 0) * Number(item.unitPrice || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-2 text-right">{item.poQty !== undefined && item.poQty !== null ? item.poQty : '—'}</td>
                        <td className="px-4 py-2 text-right font-bold text-primary">{item.receivedQty}</td>
                        <td className="px-4 py-2 text-right text-error">{item.rejectedQty || 0}</td>
                        <td className="px-4 py-2 text-center">
                          {item.fromPO ? (item.keepPending === false ? 'No' : 'Yes') : '—'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {item.qualityOk
                            ? <CheckCircle className="w-4 h-4 text-success mx-auto" />
                            : <span className="text-error font-bold">✗</span>}
                        </td>
                        <td className="px-4 py-2 text-text-gray text-xs">{item.damageRemarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedGRN.remarks && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Remarks</p>
                  <p className="text-sm text-amber-900">{selectedGRN.remarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ─── PO Detail Modal (Before GRN Receipt) ────────────────────────── */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">Purchase Order Preview</span>
                <h2 className="text-xl font-bold text-text-dark mt-1">Order Ref: {selectedPO.id}</h2>
                <p className="text-xs text-text-gray">PO Date: {format(new Date(selectedPO.date), 'dd-MM-yyyy')}</p>
              </div>
              <button onClick={() => setSelectedPO(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-text-gray" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-left">
              {/* Vendor & Project Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-primary-bg p-4 rounded-xl border border-border space-y-2">
                  <h3 className="font-bold text-primary text-xs uppercase tracking-wider">Vendor Details</h3>
                  <p className="font-bold text-text-dark text-base">{selectedPO.vendorName || vendors.find(v => v.id === selectedPO.vendorId)?.name || 'Unknown Vendor'}</p>
                  <p className="text-sm text-text-gray">Address: {[selectedPO.vendorAddressLine1, selectedPO.vendorAddressLine2, selectedPO.vendorCityPin].filter(Boolean).join(', ') || vendors.find(v => v.id === selectedPO.vendorId)?.address || '—'}</p>
                  <p className="text-sm text-text-gray">Contact: {selectedPO.vendorContact || vendors.find(v => v.id === selectedPO.vendorId)?.contact || '—'}</p>
                  <p className="text-sm text-text-gray">Email: {selectedPO.vendorEmail || vendors.find(v => v.id === selectedPO.vendorId)?.email || '—'}</p>
                </div>
                
                <div className="bg-primary-bg p-4 rounded-xl border border-border space-y-2">
                  <h3 className="font-bold text-primary text-xs uppercase tracking-wider">Project & Shipping</h3>
                  <p className="font-bold text-text-dark text-base">{projects?.find(p => p.id === selectedPO.projectId)?.name || 'Unknown Project'}</p>
                  <p className="text-sm text-text-gray">Work Order No: {selectedPO.workOrderNo || '—'}</p>
                  {selectedPO.deliveryDate && (
                    <p className="text-sm text-text-gray">
                      Expected Delivery: {displayDateFormatted(selectedPO.deliveryDate)}
                    </p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-primary/10 text-primary">
                    <tr>
                      <th className="px-4 py-2 text-left w-8">#</th>
                      <th className="px-4 py-2 text-left">Code</th>
                      <th className="px-4 py-2 text-left">Item Description</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-left">Unit</th>
                      <th className="px-4 py-2 text-right">Rate</th>
                      <th className="px-4 py-2 text-right">GST%</th>
                      <th className="px-4 py-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPO.items.map((item, idx) => (
                      <tr key={idx} className="border-t border-border hover:bg-gray-50">
                        <td className="px-4 py-2 text-text-gray">{idx + 1}</td>
                        <td className="px-4 py-2 font-mono text-xs">{item.itemCode || '—'}</td>
                        <td className="px-4 py-2 font-medium">{item.itemName}</td>
                        <td className="px-4 py-2 text-right font-bold text-text-dark">{item.qty}</td>
                        <td className="px-4 py-2 text-text-gray">{item.unit}</td>
                        <td className="px-4 py-2 text-right">₹{Number(item.rate).toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-text-gray">{item.gst}%</td>
                        <td className="px-4 py-2 text-right font-semibold text-primary">₹{Number(item.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary and Proceed Button */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 border-t border-border">
                <div className="text-sm">
                  <span className="text-text-gray">Total Order Value: </span>
                  <span className="font-bold text-lg text-primary">
                    ₹{selectedPO.items.reduce((acc, i) => acc + Number(i.total), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    type="button"
                    onClick={() => setSelectedPO(null)} 
                    className="flex-1 md:flex-initial px-5 py-2.5 border border-border rounded-xl text-text-gray hover:bg-gray-50 font-semibold text-sm transition-all"
                  >
                    Close
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowEntry(true);
                      handlePOSelect(selectedPO.id);
                      setSelectedPO(null);
                      toast.success(`Generated GRN Form for ${selectedPO.id}!`);
                    }}
                    className="flex-1 md:flex-initial btn-primary px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                  >
                    <Plus className="w-4 h-4" /> Generate GRN Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
