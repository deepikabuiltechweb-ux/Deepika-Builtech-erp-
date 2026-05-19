import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart3, Download, FileSpreadsheet, FileText, Filter, Calendar, Search } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Reports() {
  const { purchaseOrders, grns, issues, materials, vendors, projects } = useApp();
  const [activeReport, setActiveReport] = useState('purchase');

  const exportToExcel = (data, fileName) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const reports = [
    { id: 'purchase', name: 'Purchase Register', icon: FileSpreadsheet, color: 'text-blue-600' },
    { id: 'grn', name: 'GRN Summary', icon: FileText, color: 'text-success' },
    { id: 'stock', name: 'Current Stock Report', icon: BarChart3, color: 'text-primary' },
    { id: 'issue', name: 'Material Issue Log', icon: Calendar, color: 'text-warning' },
  ];

  const renderReportTable = () => {
    switch (activeReport) {
      case 'purchase':
        return (
          <table className="erp-table">
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
              {purchaseOrders.map(po => (
                <tr key={po.id}>
                  <td>{format(new Date(po.date), 'dd-MM-yyyy')}</td>
                  <td className="font-bold text-primary">{po.id}</td>
                  <td>{vendors.find(v => v.id === po.vendorId)?.name}</td>
                  <td>{projects.find(p => p.id === po.projectId)?.name}</td>
                  <td className="text-right font-bold">₹{po.items.reduce((acc, i) => acc + i.total, 0).toLocaleString()}</td>
                  <td><span className="badge badge-primary">{po.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'grn':
        return (
          <table className="erp-table">
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
              {grns.map(g => (
                <tr key={g.id}>
                  <td>{format(new Date(g.grnDate), 'dd-MM-yyyy')}</td>
                  <td className="font-bold text-primary">{g.id}</td>
                  <td>{g.poRef}</td>
                  <td>{g.vendorName}</td>
                  <td>{g.vehicleNo}</td>
                  <td>{g.items.length} Items</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'stock':
        return (
          <table className="erp-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Category</th>
                <th className="text-right">Balance</th>
                <th>Unit</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(m => (
                <tr key={m.id}>
                  <td className="font-bold">{m.name}</td>
                  <td>{m.category}</td>
                  <td className="text-right font-bold">{m.currentStock}</td>
                  <td>{m.unit}</td>
                  <td className="text-right">₹{m.latestPrice.toLocaleString()}</td>
                  <td className="text-right font-bold text-primary">₹{(m.currentStock * m.latestPrice).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'issue':
        return (
          <table className="erp-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Issue No</th>
                <th>Project</th>
                <th>Issued To</th>
                <th className="text-right">Cost</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {issues.map(i => (
                <tr key={i.id}>
                  <td>{format(new Date(i.issueDate), 'dd-MM-yyyy')}</td>
                  <td className="font-bold text-primary">{i.id}</td>
                  <td>{projects.find(p => p.id === i.projectId)?.name}</td>
                  <td>{i.issuedTo}</td>
                  <td className="text-right font-bold">₹{i.totalCost.toLocaleString()}</td>
                  <td>{i.purpose}</td>
                </tr>
              ))}
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {reports.map(report => (
            <button 
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={cn(
                "card p-6 flex items-center gap-4 hover:shadow-md transition-all text-left",
                activeReport === report.id ? "border-primary bg-primary-bg" : ""
              )}
            >
               <div className={cn("p-3 rounded-lg bg-white shadow-sm", report.color)}>
                  <report.icon className="w-6 h-6" />
               </div>
               <div>
                  <p className="font-bold text-text-dark">{report.name}</p>
                  <p className="text-xs text-text-gray">View detailed records</p>
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
                 onClick={() => exportToExcel(
                   activeReport === 'purchase' ? purchaseOrders : activeReport === 'grn' ? grns : activeReport === 'stock' ? materials : issues,
                   activeReport
                 )}
                 className="btn-primary bg-success text-white border-none hover:bg-success/90"
               >
                  <Download className="w-4 h-4" /> Export Excel
               </button>
               <button className="btn-primary">
                  <Download className="w-4 h-4" /> Export PDF
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-border">
            <div className="space-y-1">
               <label className="text-xs font-bold text-text-gray uppercase">Date Range</label>
               <div className="flex items-center gap-2">
                  <input type="date" className="input-field text-sm" />
                  <span className="text-text-gray">to</span>
                  <input type="date" className="input-field text-sm" />
               </div>
            </div>
            <div className="space-y-1">
               <label className="text-xs font-bold text-text-gray uppercase">Search / Filter</label>
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-gray" />
                  <input type="text" placeholder="Filter results..." className="input-field pl-10 text-sm" />
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
