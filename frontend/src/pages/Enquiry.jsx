import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Autocomplete from '../components/ui/Autocomplete';
import { Plus, Trash2, Send, Eye, FileEdit, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Enquiry() {
  const { materials, projects, vendors, enquiries, setEnquiries, deleteEnquiry, addMaterial, isAdmin, addProject } = useApp();
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    projectId: '',
    workOrderNo: '',
    requiredDate: '',
    items: [{ id: Date.now(), materialId: '', name: '', qty: 0, unit: '', requiredDate: '' }],
    selectedVendors: []
  });

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { id: Date.now(), materialId: '', name: '', qty: 0, unit: '', requiredDate: '' }]
    });
  };

  const handleRemoveItem = (id) => {
    if (formData.items.length === 1) return;
    setFormData({
      ...formData,
      items: formData.items.filter(item => item.id !== id)
    });
  };

  const handleItemSelect = (index, material) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      materialId: material.id,
      name: material.name,
      unit: material.unit
    };
    setFormData({ ...formData, items: newItems });
  };

  const handleVendorToggle = (vendorId) => {
    const current = formData.selectedVendors;
    if (current.includes(vendorId)) {
      setFormData({ ...formData, selectedVendors: current.filter(id => id !== vendorId) });
    } else {
      setFormData({ ...formData, selectedVendors: [...current, vendorId] });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newEnquiry = {
      id: `ENQ-${String(enquiries.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString(),
      ...formData,
      status: 'Open'
    };
    setEnquiries([...enquiries, newEnquiry]);
    toast.success("Enquiry created successfully!");
    setShowForm(false);
    setFormData({
      projectId: '',
      workOrderNo: '',
      requiredDate: '',
      items: [{ id: Date.now(), materialId: '', name: '', qty: 0, unit: '', requiredDate: '' }],
      selectedVendors: []
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Purchase Enquiry</h1>
          <p className="text-text-gray">Request quotations from vendors for project materials.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Create Enquiry
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-top-4 duration-300">
          <div className="card grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-gray mb-1">Project</label>
              <Autocomplete
                options={projects}
                onSelect={(proj) => setFormData({...formData, projectId: proj.id})}
                placeholder="Search Project..."
                onAddNew={async (name) => {
                  const response = await addProject({ name, client: 'TBD', location: 'TBD', budget: 0, status: 'Active' });
                  const newProj = response?.data || response;
                  if (newProj) setFormData({...formData, projectId: newProj.id || newProj._id});
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-gray mb-1">Work Order No</label>
              <input 
                type="text" 
                required
                className="input-field"
                value={formData.workOrderNo}
                onChange={(e) => setFormData({...formData, workOrderNo: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-gray mb-1">Required Date</label>
              <input 
                type="date" 
                required
                className="input-field"
                value={formData.requiredDate}
                onChange={(e) => setFormData({...formData, requiredDate: e.target.value})}
              />
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 bg-primary-dark text-white font-semibold">Material List</div>
            <div className="p-0">
              <table className="w-full text-left">
                <thead className="bg-primary-bg text-text-gray text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 w-1/3">Item Name (Autocomplete)</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3 w-24">Unit</th>
                    <th className="p-3">Required Date</th>
                    <th className="p-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {formData.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="p-3 text-center text-text-gray font-medium">{index + 1}</td>
                      <td className="p-3">
                        <Autocomplete 
                          options={materials}
                          onSelect={(mat) => handleItemSelect(index, mat)}
                          onAddNew={async (name) => {
                            const response = await addMaterial({ name, category: 'General', unit: 'Nos', brand: '', lastPrice: 0, latestPrice: 0, currentStock: 0, minLevel: 0 });
                            const newMat = response?.data || response;
                            if (newMat) handleItemSelect(index, newMat);
                          }}
                          placeholder="Type material name..."
                        />
                      </td>
                      <td className="p-3">
                        <input 
                          type="number" 
                          required
                          className="input-field text-right"
                          value={item.qty}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].qty = Number(e.target.value);
                            setFormData({...formData, items: newItems});
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <input 
                          type="text" 
                          className="input-field"
                          value={item.unit}
                          placeholder="e.g. Nos, Kg"
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].unit = e.target.value;
                            setFormData({...formData, items: newItems});
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <input 
                          type="date" 
                          className="input-field"
                          value={item.requiredDate}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].requiredDate = e.target.value;
                            setFormData({...formData, items: newItems});
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 text-error hover:bg-error/10 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4">
                <button 
                  type="button" 
                  onClick={handleAddItem}
                  className="btn-primary bg-white text-primary border border-primary hover:bg-primary-bg"
                >
                  <Plus className="w-4 h-4" /> Add Row
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Select Vendors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map(vendor => (
                <label key={vendor.id} className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-primary-bg transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                    checked={formData.selectedVendors.includes(vendor.id)}
                    onChange={() => handleVendorToggle(vendor.id)}
                  />
                  <div>
                    <p className="font-semibold text-text-dark">{vendor.name}</p>
                    <p className="text-xs text-text-gray">{vendor.category} | {vendor.city}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="px-6 py-2 rounded-md border border-border text-text-gray hover:bg-primary-bg"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary px-8">
              Save & Send Enquiry
            </button>
          </div>
        </form>
      ) : (
        <div className="table-container">
          <table className="erp-table">
            <thead>
              <tr>
                <th>ENQ No</th>
                <th>Date</th>
                <th>Project</th>
                <th>Items Count</th>
                <th>Vendors</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-text-gray italic">No enquiries found.</td>
                </tr>
              ) : (
                enquiries.map(enq => (
                  <tr key={enq.id}>
                    <td className="font-semibold text-primary">{enq.id}</td>
                    <td>{format(new Date(enq.date), 'dd-MM-yyyy')}</td>
                    <td className="font-medium">
                      {projects.find(p => p.id === enq.projectId)?.name || 'N/A'}
                    </td>
                    <td>{enq.items.length} Items</td>
                    <td>
                      <div className="flex -space-x-2">
                        {enq.selectedVendors.slice(0, 3).map(vId => (
                          <div key={vId} className="w-8 h-8 rounded-full bg-primary-light text-white flex items-center justify-center text-[10px] font-bold border-2 border-white" title={vendors.find(v => v.id === vId)?.name}>
                            {vendors.find(v => v.id === vId)?.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        ))}
                        {enq.selectedVendors.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-text-gray text-white flex items-center justify-center text-[10px] font-bold border-2 border-white">
                            +{enq.selectedVendors.length - 3}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={cn(
                        "badge",
                        enq.status === 'Open' ? "badge-warning" : enq.status === 'Quoted' ? "badge-primary" : "badge-success"
                      )}>
                        {enq.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => toast("View feature coming soon", { icon: '👁️' })} className="p-1 text-primary hover:bg-primary-bg rounded"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => toast("Edit feature coming soon", { icon: '✏️' })} className="p-1 text-text-gray hover:bg-primary-bg rounded"><FileEdit className="w-4 h-4" /></button>
                        <button onClick={() => toast.success("Enquiry Sent to Vendors!")} className="p-1 text-success hover:bg-success/10 rounded"><Send className="w-4 h-4" /></button>
                        {isAdmin && (
                          <button 
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this enquiry?')) {
                                deleteEnquiry(enq.id);
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
      )}
    </div>
  );
}
