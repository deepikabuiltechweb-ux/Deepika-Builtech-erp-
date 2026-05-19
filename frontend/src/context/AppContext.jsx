import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/v1' : 'http://localhost:5000/api/v1');

// Ensure cookies are sent with every request
axios.defaults.withCredentials = true;

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [grns, setGrns] = useState([]);
  const [issues, setIssues] = useState([]);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  // Interceptor removed since we rely on httpOnly cookies sent automatically via withCredentials.
  // axios.defaults.withCredentials = true is already set at the top of the file!

  // Auth Functions
  const login = async (email, password) => {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      const safeUserData = { ...data };
      delete safeUserData.token; // DO NOT store raw JWT in localStorage to prevent XSS
      setUser(safeUserData);
      localStorage.setItem('erp_user', JSON.stringify(safeUserData));
      toast.success(`Welcome back, ${data.name}!`);
      fetchData(); // Fetch data immediately after successful login
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('erp_user');
    setMaterials([]);
    setProjects([]);
    setVendors([]);
    toast.success("Logged out successfully");
  };

  // Fetch all data from Backend
  const fetchData = async () => {
    const storedUser = localStorage.getItem('erp_user');
    if (!storedUser) {
      setLoading(false);
      return;
    }

    try {
      const [mats, projs, vends] = await Promise.all([
        axios.get(`${API_BASE_URL}/materials`),
        axios.get(`${API_BASE_URL}/projects`),
        axios.get(`${API_BASE_URL}/vendors`)
      ]);

      setMaterials(mats.data.data || mats.data);
      setProjects(projs.data.data || projs.data);
      setVendors(vends.data.data || vends.data);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data from API", error);
      if (error.response && error.response.status === 401) {
        logout();
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('erp_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  // --- Material Master Functions ---
  const addMaterial = async (material) => {
    try {
      const materialId = `MAT${String(materials.length + 1).padStart(3, '0')}`;
      const newMaterial = { ...material, id: materialId };
      const response = await axios.post(`${API_BASE_URL}/materials`, newMaterial);
      setMaterials([...materials, response.data.data || response.data]);
      toast.success("Material added successfully");
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Error adding material");
      return false;
    }
  };

  const updateStockOnGRN = async (grnItems) => {
    try {
      await axios.post(`${API_BASE_URL}/grn`, { items: grnItems });
      const mats = await axios.get(`${API_BASE_URL}/materials`);
      setMaterials(mats.data);
    } catch (error) {
      toast.error("Failed to update stock on backend");
    }
  };

  const deductStockOnIssue = (issueItems) => {
    setMaterials(prev => prev.map(mat => {
      const issued = issueItems.find(item => item.materialId === mat.id);
      if (issued) {
        return { ...mat, currentStock: mat.currentStock - issued.qty };
      }
      return mat;
    }));
  };

  // --- Vendor Functions ---
  const addVendor = async (vendor) => {
    try {
      const vendorId = `VND${String(vendors.length + 1).padStart(3, '0')}`;
      const newVendor = { ...vendor, id: vendorId };
      const response = await axios.post(`${API_BASE_URL}/vendors`, newVendor);
      setVendors([...vendors, response.data.data || response.data]);
      toast.success("Vendor added successfully");
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Error adding vendor");
      return false;
    }
  };

  // --- Project Functions ---
  const addProject = async (project) => {
    try {
      const projectId = `PRJ${String(projects.length + 1).padStart(3, '0')}`;
      const newProject = { ...project, id: projectId };
      const response = await axios.post(`${API_BASE_URL}/projects`, newProject);
      setProjects([...projects, response.data.data || response.data]);
      toast.success("Project added successfully");
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Error adding project");
      return false;
    }
  };

  const updateProject = async (id, project) => {
    try {
      console.log(`Attempting to update project with ID: ${id}`);
      const response = await axios.put(`${API_BASE_URL}/projects/${id}`, project);
      const updatedData = response.data.data || response.data;
      setProjects(prev => prev.map(p => (String(p.id) === String(id) || String(p._id) === String(id)) ? (updatedData || p) : p));
      toast.success("Project updated successfully");
      return response.data;
    } catch (error) {
      console.error("Update Project Error:", error.response || error);
      toast.error(error.response?.data?.message || "Error updating project");
      return false;
    }
  };

  const updateMaterial = async (id, material) => {
    try {
      console.log(`Attempting to update material with ID: ${id}`);
      const response = await axios.put(`${API_BASE_URL}/materials/${id}`, material);
      const updatedData = response.data.data || response.data;
      setMaterials(prev => prev.map(m => (String(m.id) === String(id) || String(m._id) === String(id)) ? (updatedData || m) : m));
      toast.success("Material updated successfully");
      return response.data;
    } catch (error) {
      console.error("Update Material Error:", error.response || error);
      toast.error(error.response?.data?.message || "Error updating material");
      return false;
    }
  };

  const updateVendor = async (id, vendor) => {
    try {
      console.log(`Attempting to update vendor with ID: ${id}`);
      const response = await axios.put(`${API_BASE_URL}/vendors/${id}`, vendor);
      const updatedData = response.data.data || response.data;
      setVendors(prev => prev.map(v => (String(v.id) === String(id) || String(v._id) === String(id)) ? (updatedData || v) : v));
      toast.success("Vendor updated successfully");
      return response.data;
    } catch (error) {
      console.error("Update Vendor Error:", error.response || error);
      toast.error(error.response?.data?.message || "Error updating vendor");
      return false;
    }
  };

  const deleteMaterial = async (id) => {
    try {
      console.log(`[FRONTEND] Attempting to delete material with ID: ${id}`);
      const response = await axios.delete(`${API_BASE_URL}/materials/${id}`);
      console.log("[FRONTEND] Delete response:", response.data);
      setMaterials(prev => prev.filter(m => String(m.id) !== String(id) && String(m._id) !== String(id)));
      toast.success("Material deleted successfully");
      return true;
    } catch (error) {
      console.error("[FRONTEND] Delete Material Error Full Object:", error);
      if (error.response) {
        console.error("[FRONTEND] Error Response Data:", error.response.data);
        console.error("[FRONTEND] Error Response Status:", error.response.status);
      }
      toast.error(error.response?.data?.message || "Error deleting material - Check console");
      return false;
    }
  };

  const deleteVendor = async (id) => {
    try {
      console.log(`[FRONTEND] Attempting to delete vendor with ID: ${id}`);
      const response = await axios.delete(`${API_BASE_URL}/vendors/${id}`);
      setVendors(prev => prev.filter(v => String(v.id) !== String(id) && String(v._id) !== String(id)));
      toast.success("Vendor deleted successfully");
      return true;
    } catch (error) {
      console.error("[FRONTEND] Delete Vendor Error:", error.response || error);
      toast.error(error.response?.data?.message || "Error deleting vendor");
      return false;
    }
  };

  const deleteProject = async (id) => {
    try {
      console.log(`[FRONTEND] Attempting to delete project with ID: ${id}`);
      const response = await axios.delete(`${API_BASE_URL}/projects/${id}`);
      setProjects(prev => prev.filter(p => String(p.id) !== String(id) && String(p._id) !== String(id)));
      toast.success("Project deleted successfully");
      return true;
    } catch (error) {
      console.error("[FRONTEND] Delete Project Error:", error.response || error);
      toast.error(error.response?.data?.message || "Error deleting project");
      return false;
    }
  };

  const deleteEnquiry = (id) => {
    setEnquiries(prev => prev.filter(e => e.id !== id));
    toast.success("Enquiry deleted successfully");
  };

  const deleteQuotation = (id) => {
    setQuotations(prev => prev.filter(q => q.id !== id));
    toast.success("Quotation deleted successfully");
  };

  const deletePurchaseOrder = (id) => {
    setPurchaseOrders(prev => prev.filter(p => p.id !== id));
    toast.success("Purchase Order deleted successfully");
  };

  const deleteGRN = (id) => {
    setGrns(prev => prev.filter(g => g.id !== id));
    toast.success("GRN deleted successfully");
  };

  const deleteIssue = (id) => {
    setIssues(prev => prev.filter(i => i.id !== id));
    toast.success("Material Issue deleted successfully");
  };

  const deleteTool = (id) => {
    setTools(prev => prev.filter(t => t.id !== id));
    toast.success("Tool deleted successfully");
  };

  return (
    <AppContext.Provider value={{
      user, login, logout,
      materials, setMaterials, addMaterial, updateMaterial, deleteMaterial,
      projects, setProjects, addProject, updateProject, deleteProject,
      vendors, setVendors, addVendor, updateVendor, deleteVendor,
      enquiries, setEnquiries, deleteEnquiry,
      quotations, setQuotations, deleteQuotation,
      purchaseOrders, setPurchaseOrders, deletePurchaseOrder,
      grns, setGrns, updateStockOnGRN, deleteGRN,
      issues, setIssues, deductStockOnIssue, deleteIssue,
      tools, setTools, deleteTool,
      loading,
      isAdmin: user?.role === 'admin',
      canEdit: user?.role === 'admin' || user?.role === 'staff',
      isViewer: user?.role === 'viewer'
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
