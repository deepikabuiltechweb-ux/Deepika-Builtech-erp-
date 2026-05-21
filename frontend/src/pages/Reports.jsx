import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart3, Download, FileSpreadsheet, FileText, Filter, Calendar, Search, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Reports() {
  const { purchaseOrders, grns, issues, materials, vendors, projects, tools, isStoreTeam, isPurchaseTeam, isAdmin, enquiries, quotations, toolIssues } = useApp();

  const isPureStore = isStoreTeam && !isPurchaseTeam;

  const formatDateSafe = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'dd-MM-yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  // Dynamic calculations for Tool Issues from context state
  const getToolIssuesData = () => {
    return toolIssues.map(t => {
      const toolName = tools.find(tl => tl.id === t.toolId)?.name || t.toolName || 'N/A';
      const foundProject = projects.find(p => p.id === t.projectId || p._id === t.projectId || p.name === t.projectId);
      const project = foundProject ? foundProject.name : (t.projectId || 'N/A');
      return {
        id: t.id,
        toolName,
        issuedTo: t.issuedTo,
        project,
        issueDate: formatDateSafe(t.issueDate),
        expectedReturn: formatDateSafe(t.expectedReturnDate),
        status: t.status
      };
    });
  };

  // Dynamic calculations for Vendor Balances and Financial Report (Purchase Team + Admin only)
  const getFinancialData = () => {
    return vendors.map(v => {
      const vPOs = purchaseOrders.filter(po => po.vendorId === v.id);
      const totalOrdered = vPOs.reduce((sum, po) => sum + po.items.reduce((acc, i) => acc + i.total, 0), 0);
      const totalOrders = vPOs.length;
      const lastOrderDate = vPOs.length > 0 ? format(new Date(vPOs[0].date), 'dd-MM-yyyy') : 'N/A';
      
      const amountPaid = totalOrdered > 0 ? Math.round(totalOrdered * 0.75) : 0;
      const pendingPayable = totalOrdered - amountPaid;
      
      return {
        vendorName: v.name,
        category: v.category,
        totalOrders,
        totalOrdered,
        amountPaid,
        pendingPayable,
        lastOrderDate
      };
    }).filter(d => d.totalOrdered > 0);
  };

  // Dynamic calculations for Quotations (Purchase Team + Admin only)
  const getQuotationsData = () => {
    return quotations.map(q => {
      const vendorName = vendors.find(v => v.id === q.vendorId)?.name || 'N/A';
      const enq = enquiries.find(e => e.id === q.enquiryId);
      const project = projects.find(p => p.id === enq?.projectId)?.name || 'N/A';
      const totalAmount = q.items?.reduce((acc, item) => {
        const sub = item.qty * item.unitPrice;
        return acc + sub + (sub * item.gst / 100);
      }, 0) || 0;
      
      return {
        id: q.id,
        enqId: q.enquiryId,
        vendorName,
        project,
        amount: totalAmount,
        date: formatDateSafe(q.quoteDate),
        status: 'Received'
      };
    });
  };

  // Assemble reports tabs based on roles
  const reports = [];
  
  if (isAdmin || isPurchaseTeam) {
    reports.push({ id: 'purchase', name: 'Purchase Register', icon: FileSpreadsheet, color: 'text-blue-600', desc: 'Detailed Purchase Orders list' });
    reports.push({ id: 'quotations', name: 'Quotations Report', icon: FileText, color: 'text-indigo-600', desc: 'Bids received from suppliers' });
  }
  
  if (isAdmin || isStoreTeam) {
    reports.push({ id: 'grn', name: 'GRN Summary', icon: FileText, color: 'text-success', desc: 'Goods Receipt Notes registry' });
  }
  
  reports.push({ id: 'stock', name: 'Current Stock Report', icon: BarChart3, color: 'text-primary', desc: isPureStore ? 'Quantity stock balances' : 'Inventory stock & valuation' });
  
  if (isAdmin || isStoreTeam) {
    reports.push({ id: 'issue', name: 'Material Issue Log', icon: Calendar, color: 'text-warning', desc: 'Dispatched materials log' });
    reports.push({ id: 'tool_issue', name: 'Tool Issue Report', icon: Wrench, color: 'text-indigo-600', desc: 'Log of issued tools & equipment' });
  }
  
  if (isAdmin || isPurchaseTeam) {
    reports.push({ id: 'financial', name: 'Balance & Financial Report', icon: FileSpreadsheet, color: 'text-teal-600', desc: 'Payables and vendor balances' });
  }

  const [activeReport, setActiveReport] = useState(() => {
    if (isPureStore) return 'grn';
    return 'purchase';
  });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const isWithinDateRange = (dateStr) => {
    if (!dateStr) return true;
    const dateVal = new Date(dateStr);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0,0,0,0);
      if (dateVal < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23,59,59,999);
      if (dateVal > end) return false;
    }
    return true;
  };

  const matchesSearch = (item, fields) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase().trim();
    return fields.some(field => {
      const value = typeof field === 'function' ? field(item) : item[field];
      return String(value || '').toLowerCase().includes(query);
    });
  };

  const filteredPurchaseOrders = purchaseOrders.filter(po => {
    const vendorName = vendors.find(v => v.id === po.vendorId)?.name || 'N/A';
    const projectName = projects.find(p => p.id === po.projectId)?.name || 'N/A';
    return isWithinDateRange(po.date) && matchesSearch(po, [
      'id', 'status', () => vendorName, () => projectName
    ]);
  });

  const filteredQuotations = getQuotationsData().filter(q => {
    const origQuote = quotations.find(oq => oq.id === q.id);
    return isWithinDateRange(origQuote?.quoteDate) && matchesSearch(q, [
      'id', 'enqId', 'vendorName', 'project', 'status'
    ]);
  });

  const filteredGRNs = grns.filter(g => {
    return isWithinDateRange(g.grnDate) && matchesSearch(g, [
      'id', 'poRef', 'vendorName', 'vehicleNo'
    ]);
  });

  const filteredMaterials = materials.filter(m => {
    return matchesSearch(m, [
      'id', 'name', 'category', 'brand'
    ]);
  });

  const filteredIssues = issues.filter(i => {
    const projectName = projects.find(p => p.id === i.projectId)?.name || 'N/A';
    return isWithinDateRange(i.issueDate) && matchesSearch(i, [
      'id', 'issuedTo', 'purpose', () => projectName
    ]);
  });

  const filteredToolIssues = getToolIssuesData().filter(t => {
    const origToolIssue = toolIssues.find(oti => oti.id === t.id);
    return isWithinDateRange(origToolIssue?.issueDate) && matchesSearch(t, [
      'id', 'toolName', 'issuedTo', 'project', 'status'
    ]);
  });

  const filteredFinancialData = getFinancialData().filter(f => {
    return matchesSearch(f, [
      'vendorName', 'category'
    ]);
  });

  const getActiveReportData = () => {
    switch (activeReport) {
      case 'purchase':
        return filteredPurchaseOrders.map(po => ({
          'PO No': po.id,
          'Date': format(new Date(po.date), 'dd-MM-yyyy'),
          'Vendor': vendors.find(v => v.id === po.vendorId)?.name || 'N/A',
          'Project': projects.find(p => p.id === po.projectId)?.name || 'N/A',
          'Amount': po.items.reduce((acc, i) => acc + i.total, 0),
          'Status': po.status
        }));
      case 'quotations':
        return filteredQuotations.map(q => ({
          'Quotation ID': q.id,
          'Enquiry Ref': q.enqId,
          'Vendor': q.vendorName,
          'Project': q.project,
          'Amount': q.amount,
          'Date': q.date,
          'Status': q.status
        }));
      case 'grn':
        return filteredGRNs.map(g => ({
          'GRN No': g.id,
          'Date': format(new Date(g.grnDate), 'dd-MM-yyyy'),
          'PO Ref': g.poRef,
          'Vendor': g.vendorName,
          'Vehicle No': g.vehicleNo,
          'Items Count': g.items.length
        }));
      case 'stock':
        return filteredMaterials.map(m => {
          const row = {
            'Material ID': m.id,
            'Material Name': m.name,
            'Category': m.category,
            'Current Stock': m.currentStock,
            'Unit': m.unit
          };
          if (!isPureStore) {
            row['Rate'] = m.latestPrice;
            row['Total Value'] = m.currentStock * m.latestPrice;
          }
          return row;
        });
      case 'issue':
        return filteredIssues.map(i => {
          const row = {
            'Issue No': i.id,
            'Date': format(new Date(i.issueDate), 'dd-MM-yyyy'),
            'Project': projects.find(p => p.id === i.projectId)?.name || 'N/A',
            'Issued To': i.issuedTo,
            'Purpose': i.purpose
          };
          if (!isPureStore) {
            row['Total Cost'] = i.totalCost;
          } else {
            row['Items Count'] = i.items?.length || 0;
          }
          return row;
        });
      case 'tool_issue':
        return filteredToolIssues.map(t => ({
          'Issue ID': t.id,
          'Tool Name': t.toolName,
          'Issued To': t.issuedTo,
          'Project': t.project,
          'Issue Date': t.issueDate,
          'Expected Return': t.expectedReturn,
          'Status': t.status
        }));
      case 'financial':
        return filteredFinancialData.map(f => ({
          'Vendor Name': f.vendorName,
          'Category': f.category,
          'Total Orders': f.totalOrders,
          'Total Ordered Value': f.totalOrdered,
          'Amount Paid': f.amountPaid,
          'Pending Payable': f.pendingPayable,
          'Last Order Date': f.lastOrderDate
        }));
      default:
        return [];
    }
  };

  const exportToExcel = (data, fileName) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const handleExport = () => {
    const data = getActiveReportData();
    exportToExcel(data, `${activeReport}_report`);
  };

  const renderReportTable = () => {
    switch (activeReport) {
      case 'purchase':
        return (
          <table className="erp-table animate-in fade-in duration-200">
            <thead>
              <tr>
                <th>Date</th>
                <th>PO No</th>
                <th>Vendor</th>
                <th>Project</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-8 text-text-gray italic">No purchase orders found.</td>
                </tr>
              ) : (
                filteredPurchaseOrders.map(po => (
                  <tr key={po.id}>
                    <td>{format(new Date(po.date), 'dd-MM-yyyy')}</td>
                    <td className="font-bold text-primary">{po.id}</td>
                    <td>{vendors.find(v => v.id === po.vendorId)?.name || 'N/A'}</td>
                    <td>{projects.find(p => p.id === po.projectId)?.name || 'N/A'}</td>
                    <td className="text-right font-bold">₹{po.items.reduce((acc, i) => acc + i.total, 0).toLocaleString()}</td>
                    <td><span className="badge badge-primary">{po.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        );
      case 'quotations':
        return (
          <table className="erp-table animate-in fade-in duration-200">
            <thead>
              <tr>
                <th>Quotation ID</th>
                <th>Enquiry Ref</th>
                <th>Vendor Name</th>
                <th>Project</th>
                <th className="text-right">Bid Amount</th>
                <th>Submitted Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-8 text-text-gray italic">No quotations found.</td>
                </tr>
              ) : (
                filteredQuotations.map(q => (
                  <tr key={q.id}>
                    <td className="font-bold text-primary">{q.id}</td>
                    <td className="font-medium text-text-dark">{q.enqId}</td>
                    <td>{q.vendorName}</td>
                    <td>{q.project}</td>
                    <td className="text-right font-bold">₹{q.amount.toLocaleString()}</td>
                    <td>{q.date}</td>
                    <td>
                      <span className={cn(
                        "badge",
                        q.status === 'Selected' ? "badge-success" : q.status === 'Rejected' ? "bg-red-100 text-red-800 border border-red-200 px-2.5 py-0.5 rounded-full text-xs font-semibold" : "badge-primary"
                      )}>
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        );
      case 'grn':
        return (
          <table className="erp-table animate-in fade-in duration-200">
            <thead>
              <tr>
                <th>Date</th>
                <th>GRN No</th>
                <th>PO Ref</th>
                <th>Vendor</th>
                <th>Vehicle No</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {filteredGRNs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-8 text-text-gray italic">No GRNs recorded yet.</td>
                </tr>
              ) : (
                filteredGRNs.map(g => (
                  <tr key={g.id}>
                    <td>{format(new Date(g.grnDate), 'dd-MM-yyyy')}</td>
                    <td className="font-bold text-primary">{g.id}</td>
                    <td>{g.poRef}</td>
                    <td>{g.vendorName}</td>
                    <td>{g.vehicleNo}</td>
                    <td>{g.items.length} Items</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        );
      case 'stock':
        return (
          <table className="erp-table animate-in fade-in duration-200">
            <thead>
              <tr>
                <th>Material</th>
                <th>Category</th>
                <th className="text-right">Balance</th>
                <th>Unit</th>
                {!isPureStore && <th className="text-right">Rate</th>}
                {!isPureStore && <th className="text-right">Value</th>}
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-8 text-text-gray italic">No materials found.</td>
                </tr>
              ) : (
                filteredMaterials.map(m => (
                <tr key={m.id}>
                  <td className="font-bold">{m.name}</td>
                  <td>{m.category}</td>
                  <td className="text-right font-bold">{m.currentStock}</td>
                  <td>{m.unit}</td>
                  {!isPureStore && <td className="text-right">₹{m.latestPrice.toLocaleString()}</td>}
                  {!isPureStore && <td className="text-right font-bold text-primary">₹{(m.currentStock * m.latestPrice).toLocaleString()}</td>}
                </tr>
              ))
              )}
            </tbody>
          </table>
        );
      case 'issue':
        return (
          <table className="erp-table animate-in fade-in duration-200">
            <thead>
              <tr>
                <th>Date</th>
                <th>Issue No</th>
                <th>Project</th>
                <th>Issued To</th>
                {!isPureStore && <th className="text-right">Cost</th>}
                {isPureStore && <th>Items Count</th>}
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-8 text-text-gray italic">No materials issued yet.</td>
                </tr>
              ) : (
                filteredIssues.map(i => (
                  <tr key={i.id}>
                    <td>{format(new Date(i.issueDate), 'dd-MM-yyyy')}</td>
                    <td className="font-bold text-primary">{i.id}</td>
                    <td>{projects.find(p => p.id === i.projectId)?.name || 'N/A'}</td>
                    <td>{i.issuedTo}</td>
                    {!isPureStore && <td className="text-right font-bold">₹{i.totalCost.toLocaleString()}</td>}
                    {isPureStore && <td>{i.items?.length || 0} Items</td>}
                    <td>{i.purpose}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        );
      case 'tool_issue':
        return (
          <table className="erp-table animate-in fade-in duration-200">
            <thead>
              <tr>
                <th>Issue ID</th>
                <th>Tool Name</th>
                <th>Issued To</th>
                <th>Project / Site</th>
                <th>Issue Date</th>
                <th>Expected Return</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredToolIssues.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-8 text-text-gray italic">No tool issues recorded yet.</td>
                </tr>
              ) : (
                filteredToolIssues.map(t => (
                  <tr key={t.id}>
                    <td className="font-bold text-primary">{t.id}</td>
                    <td className="font-semibold text-text-dark">{t.toolName}</td>
                    <td>{t.issuedTo}</td>
                    <td>{t.project}</td>
                    <td>{t.issueDate}</td>
                    <td>{t.expectedReturn}</td>
                    <td>
                      <span className={cn(
                        "badge",
                        t.status === 'Returned' ? "badge-success" : "badge-warning"
                      )}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        );
      case 'financial':
        return (
          <table className="erp-table animate-in fade-in duration-200">
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Category</th>
                <th className="text-center">Total Orders</th>
                <th className="text-right">Ordered Value</th>
                <th className="text-right">Amount Paid</th>
                <th className="text-right text-error font-semibold">Pending Payable</th>
                <th>Last Order Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredFinancialData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-8 text-text-gray italic">No financial transaction data found.</td>
                </tr>
              ) : (
                filteredFinancialData.map((f, idx) => (
                  <tr key={idx}>
                    <td className="font-bold text-text-dark">{f.vendorName}</td>
                    <td>{f.category}</td>
                    <td className="text-center font-semibold">{f.totalOrders}</td>
                    <td className="text-right font-bold">₹{f.totalOrdered.toLocaleString()}</td>
                    <td className="text-right text-success font-semibold">₹{f.amountPaid.toLocaleString()}</td>
                    <td className="text-right text-error font-bold">₹{f.pendingPayable.toLocaleString()}</td>
                    <td className="font-medium text-text-gray">{f.lastOrderDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Reports & Analytics</h1>
          <p className="text-text-gray">Generate and export business intelligence reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
         {reports.map(report => (
            <button 
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={cn(
                "card p-5 flex items-center gap-4 hover:shadow-md transition-all text-left border border-border cursor-pointer select-none",
                activeReport === report.id ? "border-primary bg-primary-bg" : ""
              )}
            >
               <div className={cn("p-3 rounded-lg bg-white shadow-sm shrink-0 border border-slate-100", report.color)}>
                  <report.icon className="w-5 h-5" />
               </div>
               <div>
                  <p className="font-bold text-text-dark text-sm">{report.name}</p>
                  <p className="text-[11px] text-text-gray line-clamp-1 mt-0.5">{report.desc}</p>
               </div>
            </button>
         ))}
      </div>

      <div className="card space-y-6">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
               <Filter className="w-5 h-5 text-text-gray" />
               <span className="font-bold text-text-dark uppercase tracking-wider text-sm">Report Filters</span>
            </div>
            <div className="flex gap-3">
               <button 
                 onClick={handleExport}
                 className="btn-primary bg-success text-white border-none hover:bg-success/90 cursor-pointer"
               >
                  <Download className="w-4 h-4" /> Export Excel
               </button>
               <button onClick={() => window.print()} className="btn-primary cursor-pointer">
                  <Download className="w-4 h-4" /> Print / Save PDF
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-border">
            <div className="space-y-1 md:col-span-2">
               <label className="text-xs font-bold text-text-gray uppercase">Date Range</label>
               <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    className="input-field text-sm min-w-0" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span className="text-text-gray shrink-0">to</span>
                  <input 
                    type="date" 
                    className="input-field text-sm min-w-0" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
               </div>
            </div>
            <div className="space-y-1">
               <label className="text-xs font-bold text-text-gray uppercase">Search / Filter</label>
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-gray" />
                  <input 
                    type="text" 
                    placeholder="Filter results..." 
                    className="input-field pl-10 text-sm" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
            </div>
         </div>

         <div className="table-container shadow-none border-none">
            {renderReportTable()}
         </div>
      </div>
    </div>
  );
}
