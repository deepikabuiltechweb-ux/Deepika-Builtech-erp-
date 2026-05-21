import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Autocomplete from '../components/ui/Autocomplete';
import { Plus, Eye, CheckCircle, BarChart2, TrendingUp, DollarSign, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line
} from 'recharts';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Quotations() {
  const { enquiries, vendors, quotations, addQuotation, deleteQuotation, updateEnquiry, purchaseOrders, addPurchaseOrder, isAdmin, addVendor } = useApp();
  const [view, setView] = useState('list'); // 'list', 'entry', 'comparison'
  const [selectedEnquiryId, setSelectedEnquiryId] = useState('');
  
  // Entry Form State
  const [entryForm, setEntryForm] = useState({
    enquiryId: '',
    vendorId: '',
    quoteDate: format(new Date(), 'yyyy-MM-dd'),
    validityDate: '',
    items: []
  });

  const handleEnquirySelect = (enqId) => {
    const enq = enquiries.find(e => e.id === enqId);
    if (enq) {
      setEntryForm({
        ...entryForm,
        enquiryId: enqId,
        items: enq.items.map(item => ({
          materialId: item.materialId,
          name: item.name,
          qty: item.qty,
          unit: item.unit,
          unitPrice: 0,
          gst: 18,
          deliveryDays: 7,
          brand: ''
        }))
      });
    }
  };

  const handleSaveQuotation = async (e) => {
    e.preventDefault();
    const success = await addQuotation(entryForm);
    if (success) {
      // Update enquiry status
      await updateEnquiry(entryForm.enquiryId, { status: 'Quoted' });
      setView('list');
    }
  };

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Vendor Quotations</h1>
          <p className="text-text-gray">Manage and compare quotations received from vendors.</p>
        </div>
        <button onClick={() => setView('entry')} className="btn-primary">
          <Plus className="w-4 h-4" /> Entry New Quote
        </button>
      </div>

      <div className="table-container">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Quote ID</th>
              <th>Enquiry Ref</th>
              <th>Vendor</th>
              <th>Date</th>
              <th className="text-right">Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotations.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-text-gray italic">No quotations recorded yet.</td>
              </tr>
            ) : (
              quotations.map(quo => {
                const total = quo.items.reduce((acc, item) => {
                  const sub = item.qty * item.unitPrice;
                  return acc + sub + (sub * item.gst / 100);
                }, 0);
                return (
                  <tr key={quo.id}>
                    <td className="font-semibold text-primary">{quo.id}</td>
                    <td className="text-text-gray font-medium">{quo.enquiryId}</td>
                    <td className="font-medium">{vendors.find(v => v.id === quo.vendorId)?.name}</td>
                    <td>{format(new Date(quo.quoteDate), 'dd-MM-yyyy')}</td>
                    <td className="text-right font-bold">₹{total.toLocaleString('en-IN')}</td>
                    <td><span className="badge badge-success">Received</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setSelectedEnquiryId(quo.enquiryId);
                            setView('comparison');
                          }}
                          className="flex items-center gap-1 text-xs font-semibold text-primary px-2 py-1 bg-primary/10 rounded hover:bg-primary/20"
                        >
                          <BarChart2 className="w-3 h-3" /> Compare
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this quotation?')) {
                                deleteQuotation(quo.id);
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

  const renderEntry = () => (
    <form onSubmit={handleSaveQuotation} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-4">
        <button onClick={() => setView('list')} className="text-text-gray hover:text-primary">← Back</button>
        <h2 className="text-2xl font-bold">Quotation Entry</h2>
      </div>

      <div className="card grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-text-gray mb-1">Select Enquiry</label>
          <Autocomplete
            options={enquiries
              .filter(enq => enq.status === 'Open' || enq.status === 'Quoted')
              .map(e => ({ ...e, name: `${e.id} - ${e.workOrderNo}` }))}
            onSelect={(enq) => handleEnquirySelect(enq.id)}
            placeholder="Search Enquiry..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-gray mb-1">Vendor Name</label>
          <Autocomplete
            options={vendors}
            onSelect={(vendor) => setEntryForm({...entryForm, vendorId: vendor.id})}
            placeholder="Search Vendor..."
            onAddNew={async (name) => {
              const newVendor = await addVendor({ name, category: 'General', contact: 'N/A', email: 'N/A', city: 'TBD', rating: 3 });
              if (newVendor) setEntryForm({...entryForm, vendorId: newVendor.id});
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-gray mb-1">Quote Date</label>
          <input 
            type="date" 
            className="input-field"
            value={entryForm.quoteDate}
            onChange={(e) => setEntryForm({...entryForm, quoteDate: e.target.value})}
          />
        </div>
      </div>

      {entryForm.items.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 bg-primary-dark text-white font-semibold">Material-wise Price Entry</div>
          <table className="w-full text-left">
            <thead className="bg-primary-bg text-text-gray text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3">Item</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Unit Price (₹)</th>
                <th className="p-3 text-right">GST%</th>
                <th className="p-3 text-right">Total (Incl GST)</th>
                <th className="p-3">Brand Offered</th>
                <th className="p-3">Delivery Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entryForm.items.map((item, index) => {
                const total = item.qty * item.unitPrice * (1 + item.gst / 100);
                return (
                  <tr key={index}>
                    <td className="p-3 font-medium text-text-dark">
                      {item.name || <span className="text-error italic text-sm">Unnamed Item (Please Recreate Enquiry)</span>}
                    </td>
                    <td className="p-3 text-right">{item.qty} {item.unit}</td>
                    <td className="p-3">
                      <input 
                        type="number" 
                        required
                        className="input-field text-right"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const newItems = [...entryForm.items];
                          newItems[index].unitPrice = Number(e.target.value);
                          setEntryForm({...entryForm, items: newItems});
                        }}
                      />
                    </td>
                    <td className="p-3 w-20">
                      <select 
                        className="input-field text-right"
                        value={item.gst}
                        onChange={(e) => {
                          const newItems = [...entryForm.items];
                          newItems[index].gst = Number(e.target.value);
                          setEntryForm({...entryForm, items: newItems});
                        }}
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>
                    <td className="p-3 text-right font-bold text-primary">₹{total.toLocaleString()}</td>
                    <td className="p-3">
                      <input 
                        type="text" 
                        className="input-field"
                        value={item.brand}
                        onChange={(e) => {
                          const newItems = [...entryForm.items];
                          newItems[index].brand = e.target.value;
                          setEntryForm({...entryForm, items: newItems});
                        }}
                      />
                    </td>
                    <td className="p-3 w-24">
                      <input 
                        type="number" 
                        className="input-field"
                        value={item.deliveryDays}
                        onChange={(e) => {
                          const newItems = [...entryForm.items];
                          newItems[index].deliveryDays = Number(e.target.value);
                          setEntryForm({...entryForm, items: newItems});
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button 
          type="button" 
          onClick={() => setView('list')}
          className="px-6 py-2 rounded-md border border-border text-text-gray hover:bg-primary-bg"
        >
          Cancel
        </button>
        <button type="submit" className="btn-primary px-8" disabled={entryForm.items.length === 0}>
          Save Quotation
        </button>
      </div>
    </form>
  );

  const renderComparison = () => {
    const enqQuotes = quotations.filter(q => q.enquiryId === selectedEnquiryId);
    const enquiry = enquiries.find(e => e.id === selectedEnquiryId);
    
    // Logic to find L1, L2, L3 for each item
    const comparisonTable = enquiry.items.map(enqItem => {
      const vendorPrices = enqQuotes.map(q => {
        const itemQuote = q.items.find(i => i.materialId === enqItem.materialId);
        return {
          vendorId: q.vendorId,
          vendorName: vendors.find(v => v.id === q.vendorId)?.name,
          unitPrice: itemQuote?.unitPrice || 0,
          gst: itemQuote?.gst || 0,
          total: (itemQuote?.unitPrice || 0) * (1 + (itemQuote?.gst || 0) / 100),
          delivery: itemQuote?.deliveryDays || 0,
          brand: itemQuote?.brand || ''
        };
      }).sort((a, b) => a.total - b.total);

      return {
        materialId: enqItem.materialId,
        name: enqItem.name,
        qty: enqItem.qty,
        vendorPrices
      };
    });

    const chartData = enqQuotes.map(q => ({
      name: vendors.find(v => v.id === q.vendorId)?.name.split(' ')[0],
      amount: q.items.reduce((acc, i) => acc + (i.unitPrice * i.qty * (1 + i.gst/100)), 0)
    }));

    const createPO = async (quote) => {
      const newPO = {
        date: new Date().toISOString(),
        vendorId: quote.vendorId,
        enquiryId: selectedEnquiryId,
        projectId: enquiry.projectId,
        workOrderNo: enquiry.workOrderNo,
        items: quote.items.map(item => ({
          ...item,
          itemCode: item.materialId,
          itemName: item.name,
          rate: item.unitPrice,
          gstAmt: (item.unitPrice * item.qty * item.gst / 100),
          total: item.unitPrice * item.qty * (1 + item.gst / 100)
        })),
        status: 'Sent'
      };
      await addPurchaseOrder(newPO);
    };

    return (
      <div className="space-y-8 animate-in zoom-in duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="text-text-gray hover:text-primary">← Back</button>
            <h2 className="text-2xl font-bold">Comparison Statement: {selectedEnquiryId}</h2>
          </div>
          <div className="flex gap-3">
             <button className="btn-primary bg-white text-primary border border-primary hover:bg-primary-bg">Print Comparison</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2 overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4">Material-wise Comparison</h3>
            <table className="erp-table">
              <thead>
                <tr>
                  <th rowSpan={2}>Material</th>
                  {enqQuotes.map(q => (
                    <th key={q.id} colSpan={2} className="text-center border-l border-white/20">
                      {vendors.find(v => v.id === q.vendorId)?.name}
                    </th>
                  ))}
                </tr>
                <tr className="bg-primary/90">
                  {enqQuotes.map(q => (
                    <React.Fragment key={`sub-${q.id}`}>
                      <th className="text-xs border-l border-white/20">Rate</th>
                      <th className="text-xs">Total</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonTable.map((item, idx) => (
                  <tr key={idx}>
                    <td className="font-medium bg-primary-bg/50">{item.name}</td>
                    {item.vendorPrices.map((vp, vidx) => {
                       // Find rank of this vendor for this item
                       const sortedPrices = [...item.vendorPrices].sort((a,b) => a.total - b.total);
                       const rank = sortedPrices.findIndex(p => p.vendorId === vp.vendorId);
                       let bgColor = "";
                       if (rank === 0) bgColor = "bg-success/20 font-bold text-success";
                       if (rank === 1) bgColor = "bg-warning/20 text-warning";
                       if (rank === 2) bgColor = "bg-orange-100 text-orange-600";
                       
                       return (
                         <React.Fragment key={vidx}>
                           <td className={cn("text-right border-l", bgColor)}>₹{vp.unitPrice.toLocaleString()}</td>
                           <td className={cn("text-right", bgColor)}>₹{(vp.total * item.qty).toLocaleString()}</td>
                         </React.Fragment>
                       );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex gap-4 text-xs font-semibold">
               <span className="flex items-center gap-1"><div className="w-3 h-3 bg-success/20 border border-success/30"></div> L1 (Lowest)</span>
               <span className="flex items-center gap-1"><div className="w-3 h-3 bg-warning/20 border border-warning/30"></div> L2</span>
               <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-100 border border-orange-200"></div> L3</span>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-6">Quote Comparison (Total)</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#1E40AF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-4">
               <h4 className="font-semibold text-sm">Decision Panel</h4>
               {enqQuotes.map(q => (
                 <div key={q.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                   <div>
                     <p className="text-sm font-bold">{vendors.find(v => v.id === q.vendorId)?.name}</p>
                     <p className="text-xs text-text-gray">Score: {(vendors.find(v => v.id === q.vendorId)?.rating * 20).toFixed(0)}% Perf.</p>
                   </div>
                   <button 
                    onClick={() => createPO(q)}
                    className="px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary-dark transition-colors flex items-center gap-1"
                   >
                     Create PO
                   </button>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {view === 'list' && renderList()}
      {view === 'entry' && renderEntry()}
      {view === 'comparison' && renderComparison()}
    </>
  );
}
