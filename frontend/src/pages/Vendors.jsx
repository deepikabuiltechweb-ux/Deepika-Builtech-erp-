import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Star, MapPin, Phone, Mail, Award, TrendingUp, ShoppingBag, Plus, Trash2, Edit2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function Vendors() {
  const { vendors, purchaseOrders, addVendor, updateVendor, deleteVendor, canEdit, isAdmin } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Material',
    city: '',
    email: '',
    contact: '',
    rating: 4.5
  });

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
                                 <button className="text-xs font-bold text-primary hover:underline">VIEW PROFILE</button>
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
    </div>
  );
}
