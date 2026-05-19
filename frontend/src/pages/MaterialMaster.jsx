import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Search, Filter, Edit2, Trash2, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MaterialMaster() {
  const { materials, addMaterial, updateMaterial, deleteMaterial, setMaterials, isAdmin, canEdit } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Pipe',
    unit: 'KG',
    brand: '',
    lastPrice: 0,
    latestPrice: 0,
    currentStock: 0,
    minLevel: 0
  });

  const categories = ['Pipe', 'Bolt', 'Sheet', 'Rod', 'Cement', 'Tool', 'Consumable'];
  const units = ['KG', 'Nos', 'Meter', 'Litre', 'Bags', 'Box', 'Pairs'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      const result = await updateMaterial(editingId, formData);
      if (result) {
        setIsModalOpen(false);
        resetForm();
      }
    } else {
      const result = await addMaterial(formData);
      if (result) {
        setIsModalOpen(false);
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      category: 'Pipe',
      unit: 'KG',
      brand: '',
      lastPrice: 0,
      latestPrice: 0,
      currentStock: 0,
      minLevel: 0
    });
  };

  const handleEdit = (material) => {
    setEditingId(material._id || material.id);
    setFormData({
      name: material.name,
      category: material.category,
      unit: material.unit,
      brand: material.brand,
      lastPrice: material.lastPrice,
      latestPrice: material.latestPrice,
      currentStock: material.currentStock,
      minLevel: material.minLevel
    });
    setIsModalOpen(true);
  };

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-dark">Material Master</h1>
          <p className="text-text-gray">Manage your inventory catalog and specifications.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-primary bg-white text-primary border border-primary hover:bg-primary-bg">
            <Download className="w-4 h-4" /> Export
          </button>
          {canEdit && (
            <button onClick={() => setIsModalOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Material
            </button>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-gray" />
            <input 
              type="text" 
              placeholder="Search by name, code or category..." 
              className="input-field pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-primary bg-white text-text-gray border border-border hover:bg-primary-bg">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="erp-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Material Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Brand</th>
              <th className="text-right">Last Price</th>
              <th className="text-right">Latest Price</th>
              <th className="text-right">Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterials.map((m) => (
              <tr key={m.id}>
                <td className="font-semibold text-primary">{m.id}</td>
                <td className="font-medium">{m.name}</td>
                <td>{m.category}</td>
                <td>{m.unit}</td>
                <td>{m.brand}</td>
                <td className="text-right">₹{m.lastPrice.toLocaleString()}</td>
                <td className="text-right font-semibold">₹{m.latestPrice.toLocaleString()}</td>
                <td className="text-right">
                  <span className={m.currentStock <= m.minLevel ? "text-error font-bold" : ""}>
                    {m.currentStock}
                  </span>
                </td>
                <td>
                  {m.currentStock <= m.minLevel ? (
                    <span className="badge badge-error">Low Stock</span>
                  ) : (
                    <span className="badge badge-success">In Stock</span>
                  )}
                </td>
                <td>
                  <div className="flex gap-2">
                    {canEdit && (
                      <button 
                        onClick={() => handleEdit(m)}
                        className="p-1 text-primary hover:bg-primary-bg rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this material?')) {
                            console.log("Deleting material with ID:", m._id || m.id);
                            deleteMaterial(m._id || m.id);
                          }
                        }}
                        className="p-1 text-error hover:bg-error/10 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {!canEdit && (
                      <span className="text-xs text-text-gray italic">View Only</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Material Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-primary-dark p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Material' : 'Add New Material'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingId(null); }} className="text-white/70 hover:text-white">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-gray mb-1">Material Name</label>
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
                  <label className="block text-sm font-medium text-text-gray mb-1">Unit</label>
                  <select 
                    className="input-field"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  >
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-gray mb-1">Brand</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-gray mb-1">Minimum Stock Level</label>
                  <input 
                    type="number" 
                    className="input-field text-right" 
                    value={formData.minLevel}
                    onChange={(e) => setFormData({...formData, minLevel: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-gray mb-1">Opening Stock</label>
                  <input 
                    type="number" 
                    className="input-field text-right" 
                    value={formData.currentStock}
                    onChange={(e) => setFormData({...formData, currentStock: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-gray mb-1">Opening Rate (₹)</label>
                  <input 
                    type="number" 
                    className="input-field text-right" 
                    value={formData.latestPrice}
                    onChange={(e) => setFormData({...formData, latestPrice: Number(e.target.value)})}
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
                  {editingId ? 'Update Material' : 'Save Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
