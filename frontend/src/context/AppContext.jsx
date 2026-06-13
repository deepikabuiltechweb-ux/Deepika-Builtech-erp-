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
  const [toolIssues, setToolIssues] = useState([]);
  const [tools, setTools] = useState([]);
  const [emergencyDCs, setEmergencyDCs] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Request interceptor: attach access token to every request ──
  useEffect(() => {
    const reqInterceptor = axios.interceptors.request.use(config => {
      const token = localStorage.getItem('erp_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // ── Response interceptor: silently refresh on 401 and retry ──
    let isRefreshing = false;
    let failedQueue = [];

    const processQueue = (error, token = null) => {
      failedQueue.forEach(prom => {
        if (error) prom.reject(error);
        else prom.resolve(token);
      });
      failedQueue = [];
    };

    const resInterceptor = axios.interceptors.response.use(
      res => res,
      async error => {
        const originalRequest = error.config;
        // Only attempt refresh on 401, skip auth routes to avoid loops
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/')
        ) {
          if (isRefreshing) {
            // Queue requests while refresh is in progress
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return axios(originalRequest);
            }).catch(err => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          const refreshToken = localStorage.getItem('erp_refresh_token');
          if (!refreshToken) {
            isRefreshing = false;
            logout();
            return Promise.reject(error);
          }

          try {
            const { data } = await axios.post(
              `${API_BASE_URL}/auth/refresh`,
              {},
              { headers: { Authorization: `Bearer ${refreshToken}` } }
            );
            const newToken = data.token;
            localStorage.setItem('erp_token', newToken);
            if (data.refreshToken) {
              localStorage.setItem('erp_refresh_token', data.refreshToken);
            }
            axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);
            logout();
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(resInterceptor);
    };
  }, []);

  // Auth Functions
  const login = async (email, password) => {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      const safeUserData = { ...data };
      setUser(safeUserData);
      localStorage.setItem('erp_user', JSON.stringify(safeUserData));
      localStorage.setItem('erp_token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('erp_refresh_token', data.refreshToken);
      }
      toast.success(`Welcome back, ${data.name}!`);
      fetchData();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('erp_user');
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_refresh_token');
    setMaterials([]);
    setProjects([]);
    setVendors([]);
    setEnquiries([]);
    setQuotations([]);
    setPurchaseOrders([]);
    setGrns([]);
    setIssues([]);
    setTools([]);
    setToolIssues([]);
    setEmergencyDCs([]);
    toast.success("Logged out successfully");
  };

  const updateProfile = async (profileData) => {
    try {
      const { data } = await axios.put(`${API_BASE_URL}/auth/profile`, profileData);
      setUser(data);
      localStorage.setItem('erp_user', JSON.stringify(data));
      toast.success("Profile updated successfully!");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating profile");
      return false;
    }
  };

  // Fetch all data from Backend
  const fetchData = async () => {
    const storedUser = localStorage.getItem('erp_user');
    if (!storedUser) {
      setLoading(false);
      return;
    }

    try {
      const [mats, projs, vends, enqs, quts, pos, grnList, issList, toolList, toolIssList, dcList] = await Promise.all([
        axios.get(`${API_BASE_URL}/materials`),
        axios.get(`${API_BASE_URL}/projects`),
        axios.get(`${API_BASE_URL}/vendors`),
        axios.get(`${API_BASE_URL}/enquiries`),
        axios.get(`${API_BASE_URL}/quotations`),
        axios.get(`${API_BASE_URL}/purchaseorders`),
        axios.get(`${API_BASE_URL}/grns`),
        axios.get(`${API_BASE_URL}/issues`),
        axios.get(`${API_BASE_URL}/tools`),
        axios.get(`${API_BASE_URL}/toolissues`),
        axios.get(`${API_BASE_URL}/emergencydcs`)
      ]);

      setMaterials(mats.data.data || mats.data);
      setProjects(projs.data.data || projs.data);
      setVendors(vends.data.data || vends.data);
      setEnquiries(enqs.data.data || enqs.data);
      setQuotations(quts.data.data || quts.data);
      setPurchaseOrders(pos.data.data || pos.data);
      setGrns(grnList.data.data || grnList.data);
      setIssues(issList.data.data || issList.data);
      setTools(toolList.data.data || toolList.data);
      setToolIssues(toolIssList.data.data || toolIssList.data);
      setEmergencyDCs(dcList.data.data || dcList.data);
      
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
      const response = await axios.post(`${API_BASE_URL}/materials`, material);
      const savedMaterial = response.data.data || response.data;
      
      // Fallback in case backend pre-validate hook didn't set id (unlikely)
      if (!savedMaterial.id) {
        const maxIdNum = materials.reduce((max, m) => {
          const num = parseInt(m.id?.replace(/\D/g, '') || 0);
          return num > max ? num : max;
        }, 0);
        const materialId = `MAT${String(maxIdNum + 1).padStart(3, '0')}`;
        savedMaterial.id = materialId;
        await axios.put(`${API_BASE_URL}/materials/${savedMaterial._id || savedMaterial.id}`, { id: materialId });
      }

      setMaterials([...materials, savedMaterial]);
      toast.success("Material added successfully");
      return savedMaterial;
    } catch (error) {
      toast.error(error.response?.data?.message || "Error adding material");
      return false;
    }
  };

  const updateStockOnGRN = async (grnItems) => {
    try {
      await axios.post(`${API_BASE_URL}/grn`, { items: grnItems });
      const mats = await axios.get(`${API_BASE_URL}/materials`);
      setMaterials(mats.data.data || mats.data);
    } catch (error) {
      toast.error("Failed to update stock on backend");
    }
  };

  const deductStockOnIssue = async (issueItems) => {
    try {
      await axios.post(`${API_BASE_URL}/issue`, { items: issueItems });
      const mats = await axios.get(`${API_BASE_URL}/materials`);
      setMaterials(mats.data.data || mats.data);
    } catch (error) {
      toast.error("Failed to update stock on backend");
    }
  };

  // --- Vendor Functions ---
  const addVendor = async (vendor) => {
    try {
      const maxIdNum = vendors.reduce((max, v) => {
        const num = parseInt(v.id?.replace(/\D/g, '') || 0);
        return num > max ? num : max;
      }, 0);
      const vendorId = `VND${String(maxIdNum + 1).padStart(3, '0')}`;
      const newVendor = { ...vendor, id: vendorId };
      const response = await axios.post(`${API_BASE_URL}/vendors`, newVendor);
      setVendors([...vendors, response.data.data || response.data]);
      toast.success("Vendor added successfully");
      return response.data.data || response.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Error adding vendor");
      return false;
    }
  };

  // --- Project Functions ---
  const addProject = async (project) => {
    try {
      const maxIdNum = projects.reduce((max, p) => {
        const num = parseInt(p.id?.replace(/\D/g, '') || 0);
        return num > max ? num : max;
      }, 0);
      const projectId = `PRJ${String(maxIdNum + 1).padStart(3, '0')}`;
      const newProject = { ...project, id: projectId };
      const response = await axios.post(`${API_BASE_URL}/projects`, newProject);
      setProjects([...projects, response.data.data || response.data]);
      toast.success("Project added successfully");
      return response.data.data || response.data;
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
      const existing = materials.find(m => m.id === id || m._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      await axios.delete(`${API_BASE_URL}/materials/${dbId}`);
      setMaterials(prev => prev.filter(m => String(m.id) !== String(id) && String(m._id) !== String(id)));
      toast.success("Material deleted successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting material");
      return false;
    }
  };

  const deleteVendor = async (id) => {
    try {
      const existing = vendors.find(v => v.id === id || v._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      await axios.delete(`${API_BASE_URL}/vendors/${dbId}`);
      setVendors(prev => prev.filter(v => String(v.id) !== String(id) && String(v._id) !== String(id)));
      toast.success("Vendor deleted successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting vendor");
      return false;
    }
  };

  const deleteProject = async (id) => {
    try {
      const existing = projects.find(p => p.id === id || p._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      await axios.delete(`${API_BASE_URL}/projects/${dbId}`);
      setProjects(prev => prev.filter(p => String(p.id) !== String(id) && String(p._id) !== String(id)));
      toast.success("Project deleted successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting project");
      return false;
    }
  };

  // --- Enquiry Functions ---
  const addEnquiry = async (enquiry) => {
    try {
      const maxIdNum = enquiries.reduce((max, e) => {
        const num = parseInt(e.id?.replace(/\D/g, '') || 0);
        return num > max ? num : max;
      }, 0);
      const enqId = `ENQ-${String(maxIdNum + 1).padStart(3, '0')}`;
      const newEnq = { ...enquiry, id: enqId, date: new Date().toISOString(), status: 'Open' };
      const response = await axios.post(`${API_BASE_URL}/enquiries`, newEnq);
      setEnquiries(prev => [...prev, response.data.data || response.data]);
      toast.success("Enquiry created successfully!");
      return response.data.data || response.data;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to create enquiry");
      return false;
    }
  };

  const updateEnquiry = async (id, updatedFields) => {
    try {
      const existing = enquiries.find(e => e.id === id || e._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      const response = await axios.put(`${API_BASE_URL}/enquiries/${dbId}`, { ...existing, ...updatedFields });
      setEnquiries(prev => prev.map(e => (e.id === id || e._id === id) ? (response.data.data || response.data) : e));
      return response.data.data || response.data;
    } catch (e) {
      console.error("Error updating enquiry", e);
    }
  };

  const deleteEnquiry = async (id) => {
    try {
      const existing = enquiries.find(e => e.id === id || e._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      await axios.delete(`${API_BASE_URL}/enquiries/${dbId}`);
      setEnquiries(prev => prev.filter(e => e.id !== id && e._id !== id));
      toast.success("Enquiry deleted successfully");
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete enquiry");
      return false;
    }
  };

  // --- Quotation Functions ---
  const addQuotation = async (quotation) => {
    try {
      const maxIdNum = quotations.reduce((max, q) => {
        const num = parseInt(q.id?.replace(/\D/g, '') || 0);
        return num > max ? num : max;
      }, 0);
      const quoteId = `QUO-${String(maxIdNum + 1).padStart(3, '0')}`;
      const newQuote = { ...quotation, id: quoteId };
      const response = await axios.post(`${API_BASE_URL}/quotations`, newQuote);
      setQuotations(prev => [...prev, response.data.data || response.data]);
      toast.success("Quotation recorded successfully!");
      return response.data.data || response.data;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to record quotation");
      return false;
    }
  };

  const updateQuotation = async (id, updatedFields) => {
    try {
      const existing = quotations.find(q => q.id === id || q._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      const response = await axios.put(`${API_BASE_URL}/quotations/${dbId}`, { ...existing, ...updatedFields });
      setQuotations(prev => prev.map(q => (q.id === id || q._id === id) ? (response.data.data || response.data) : q));
      return response.data.data || response.data;
    } catch (e) {
      console.error("Error updating quotation", e);
    }
  };

  const deleteQuotation = async (id) => {
    try {
      const existing = quotations.find(q => q.id === id || q._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      await axios.delete(`${API_BASE_URL}/quotations/${dbId}`);
      setQuotations(prev => prev.filter(q => q.id !== id && q._id !== id));
      toast.success("Quotation deleted successfully");
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete quotation");
      return false;
    }
  };

  // --- Purchase Order Functions ---
  const addPurchaseOrder = async (po) => {
    try {
      const maxIdNum = purchaseOrders.reduce((max, p) => {
        const num = parseInt(p.id?.replace(/\D/g, '') || 0);
        return num > max ? num : max;
      }, 22); // Starts from 22 so first PO becomes PO-023
      const poId = `PO-${String(maxIdNum + 1).padStart(3, '0')}`;
      const newPO = { ...po, id: poId };
      const response = await axios.post(`${API_BASE_URL}/purchaseorders`, newPO);
      setPurchaseOrders(prev => [...prev, response.data.data || response.data]);
      toast.success(`PO ${poId} generated successfully!`);
      return response.data.data || response.data;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to generate Purchase Order");
      return false;
    }
  };

  const updatePurchaseOrder = async (id, updatedFields) => {
    try {
      const existing = purchaseOrders.find(p => p.id === id || p._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      const response = await axios.put(`${API_BASE_URL}/purchaseorders/${dbId}`, { ...existing, ...updatedFields });
      setPurchaseOrders(prev => prev.map(p => (p.id === id || p._id === id) ? (response.data.data || response.data) : p));
      return response.data.data || response.data;
    } catch (e) {
      console.error("Error updating Purchase Order", e);
    }
  };

  const deletePurchaseOrder = async (id) => {
    try {
      const existing = purchaseOrders.find(p => p.id === id || p._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      await axios.delete(`${API_BASE_URL}/purchaseorders/${dbId}`);
      setPurchaseOrders(prev => prev.filter(p => p.id !== id && p._id !== id));
      toast.success("Purchase Order deleted successfully");
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete Purchase Order");
      return false;
    }
  };

  // --- GRN Functions ---
  const addGRN = async (grn) => {
    try {
      const dateStr = grn.grnDate || '';
      let year = new Date().getFullYear();
      const yearMatch = dateStr.match(/^(\d{4})-\d{2}-\d{2}/) || dateStr.match(/\b(20\d{2})\b/);
      if (yearMatch) year = parseInt(yearMatch[1], 10);

      const maxIdNum = grns.reduce((max, g) => {
        if (g.id) {
          const regex = new RegExp(`^GRN-${year}-(\\d+)$`);
          const match = g.id.match(regex);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num < 100000) {
              return num > max ? num : max;
            }
          }
        }
        return max;
      }, 0);
      const grnId = `GRN-${year}-${String(maxIdNum + 1).padStart(3, '0')}`;
      const newGRN = { ...grn, id: grnId };
      const response = await axios.post(`${API_BASE_URL}/grns`, newGRN);
      setGrns(prev => [...prev, response.data.data || response.data]);
      toast.success("GRN registered successfully!");
      return response.data.data || response.data;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to record GRN");
      return false;
    }
  };

  const updateGRN = async (id, updatedFields) => {
    try {
      const existing = grns.find(g => g.id === id || g._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      const response = await axios.put(`${API_BASE_URL}/grns/${dbId}`, { ...existing, ...updatedFields });
      setGrns(prev => prev.map(g => (g.id === id || g._id === id) ? (response.data.data || response.data) : g));
      return response.data.data || response.data;
    } catch (e) {
      console.error("Error updating GRN", e);
    }
  };

  const deleteGRN = async (id) => {
    try {
      const existing = grns.find(g => g.id === id || g._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      await axios.delete(`${API_BASE_URL}/grns/${dbId}`);
      setGrns(prev => prev.filter(g => g.id !== id && g._id !== id));
      toast.success("GRN record deleted");
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete GRN");
      return false;
    }
  };

  // --- Material Issue Functions ---
  const addIssue = async (issue) => {
    try {
      const dateStr = issue.issueDate || '';
      let year = new Date().getFullYear();
      const yearMatch = dateStr.match(/^(\d{4})-\d{2}-\d{2}/) || dateStr.match(/\b(20\d{2})\b/);
      if (yearMatch) year = parseInt(yearMatch[1], 10);

      const maxIdNum = issues.reduce((max, i) => {
        if (i.id) {
          const regex = new RegExp(`^ISS-${year}-(\\d+)$`);
          const match = i.id.match(regex);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num < 100000) {
              return num > max ? num : max;
            }
          }
        }
        return max;
      }, 0);
      const issueId = `ISS-${year}-${String(maxIdNum + 1).padStart(3, '0')}`;
      const newIssue = { ...issue, id: issueId };
      const response = await axios.post(`${API_BASE_URL}/issues`, newIssue);
      setIssues(prev => [...prev, response.data.data || response.data]);
      toast.success("Material issued successfully!");
      return response.data.data || response.data;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to issue material");
      return false;
    }
  };

  const updateIssue = async (id, updatedFields) => {
    try {
      const existing = issues.find(i => i.id === id || i._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      const response = await axios.put(`${API_BASE_URL}/issues/${dbId}`, { ...existing, ...updatedFields });
      setIssues(prev => prev.map(i => (i.id === id || i._id === id) ? (response.data.data || response.data) : i));
      return response.data.data || response.data;
    } catch (e) {
      console.error("Error updating issue record", e);
    }
  };

  const deleteIssue = async (id) => {
    try {
      const existing = issues.find(i => i.id === id || i._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      await axios.delete(`${API_BASE_URL}/issues/${dbId}`);
      setIssues(prev => prev.filter(i => i.id !== id && i._id !== id));
      toast.success("Material Issue record deleted");
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete issue");
      return false;
    }
  };

  // --- Tool Functions ---
  const addTool = async (tool) => {
    try {
      const maxIdNum = tools.reduce((max, t) => {
        const num = parseInt(t.id?.replace(/\D/g, '') || 0);
        return num > max ? num : max;
      }, 0);
      const toolId = `TOL${String(maxIdNum + 1).padStart(3, '0')}`;
      const total = parseInt(tool.totalQty) || 0;
      const repair = parseInt(tool.repairQty) || 0;
      const available = total - repair;
      const newTool = {
        id: toolId,
        name: tool.name,
        category: tool.category,
        totalQty: total,
        availableQty: available,
        repairQty: repair
      };
      const response = await axios.post(`${API_BASE_URL}/tools`, newTool);
      setTools(prev => [...prev, response.data.data || response.data]);
      toast.success("Tool registered successfully");
      return response.data.data || response.data;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to register tool");
      return false;
    }
  };

  const updateTool = async (id, updatedTool) => {
    try {
      const existing = tools.find(t => t.id === id || t._id === id);
      if (!existing) return;
      
      const total = parseInt(updatedTool.totalQty !== undefined ? updatedTool.totalQty : existing.totalQty) || 0;
      const repair = parseInt(updatedTool.repairQty !== undefined ? updatedTool.repairQty : existing.repairQty) || 0;
      const issued = existing.totalQty - existing.availableQty - existing.repairQty;
      const available = total - repair - (updatedTool.availableQty !== undefined ? 0 : issued);
      
      const toSend = {
        ...existing,
        ...updatedTool,
        totalQty: total,
        repairQty: repair,
        availableQty: updatedTool.availableQty !== undefined ? updatedTool.availableQty : available
      };
      
      const dbId = existing._id || existing.id;
      const response = await axios.put(`${API_BASE_URL}/tools/${dbId}`, toSend);
      setTools(prev => prev.map(t => (t.id === id || t._id === id) ? (response.data.data || response.data) : t));
      return response.data.data || response.data;
    } catch (e) {
      console.error("Failed to update tool", e);
    }
  };

  const deleteTool = async (id) => {
    try {
      const existing = tools.find(t => t.id === id || t._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      await axios.delete(`${API_BASE_URL}/tools/${dbId}`);
      setTools(prev => prev.filter(t => t.id !== id && t._id !== id));
      toast.success("Tool deleted successfully");
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete tool");
      return false;
    }
  };

  // --- Emergency DC Functions ---
  const addEmergencyDC = async (dc) => {
    try {
      const maxIdNum = emergencyDCs.reduce((max, d) => {
        const num = parseInt(d.id?.replace(/\D/g, '') || 0);
        return num > max ? num : max;
      }, 0);
      const dcId = `EDC-${String(maxIdNum + 1).padStart(4, '0')}`;
      const newDC = { ...dc, id: dcId, status: 'Pending Approval' };
      const response = await axios.post(`${API_BASE_URL}/emergencydcs`, newDC);
      setEmergencyDCs(prev => [response.data.data || response.data, ...prev]);
      toast.success(`Emergency DC ${dcId} created!`);
      return response.data.data || response.data;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to create Emergency DC");
      return false;
    }
  };

  const updateEmergencyDCStatus = async (id, status) => {
    try {
      const existing = emergencyDCs.find(d => d.id === id || d._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      const response = await axios.patch(`${API_BASE_URL}/emergencydcs/${dbId}/status`, { status });
      setEmergencyDCs(prev => prev.map(d => (d.id === id || d._id === id) ? (response.data.data || response.data) : d));
      toast.success(`DC ${status}`);
      return response.data.data || response.data;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to update DC status");
      return false;
    }
  };

  const deleteEmergencyDC = async (id) => {
    try {
      const existing = emergencyDCs.find(d => d.id === id || d._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      await axios.delete(`${API_BASE_URL}/emergencydcs/${dbId}`);
      setEmergencyDCs(prev => prev.filter(d => d.id !== id && d._id !== id));
      toast.success("Emergency DC deleted");
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete Emergency DC");
      return false;
    }
  };

  // --- Tool Issue Functions ---
  const addToolIssue = async (toolIssue) => {
    try {
      const maxIdNum = toolIssues.reduce((max, t) => {
        const num = parseInt(t.id?.replace(/\D/g, '') || 0);
        return num > max ? num : max;
      }, 0);
      const issueId = `TLI-${String(maxIdNum + 1).padStart(3, '0')}`;
      const newIssue = { ...toolIssue, id: issueId, status: 'Issued' };
      const response = await axios.post(`${API_BASE_URL}/toolissues`, newIssue);
      setToolIssues(prev => [response.data.data || response.data, ...prev]);
      return response.data.data || response.data;
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to issue tool");
      return false;
    }
  };

  const updateToolIssue = async (id, updatedFields) => {
    try {
      const existing = toolIssues.find(i => i.id === id || i._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      const response = await axios.put(`${API_BASE_URL}/toolissues/${dbId}`, { ...existing, ...updatedFields });
      setToolIssues(prev => prev.map(i => (i.id === id || i._id === id) ? (response.data.data || response.data) : i));
      return response.data.data || response.data;
    } catch (e) {
      console.error("Failed to update tool issue log", e);
    }
  };

  const deleteToolIssue = async (id) => {
    try {
      const existing = toolIssues.find(i => i.id === id || i._id === id);
      if (!existing) return;
      const dbId = existing._id || existing.id;
      await axios.delete(`${API_BASE_URL}/toolissues/${dbId}`);
      setToolIssues(prev => prev.filter(i => i.id !== id && i._id !== id));
      return true;
    } catch (e) {
      console.error("Failed to delete tool issue log", e);
    }
  };

  return (
    <AppContext.Provider value={{
      user, login, logout, updateProfile,
      materials, setMaterials, addMaterial, updateMaterial, deleteMaterial,
      projects, setProjects, addProject, updateProject, deleteProject,
      vendors, setVendors, addVendor, updateVendor, deleteVendor,
      enquiries, setEnquiries, addEnquiry, updateEnquiry, deleteEnquiry,
      quotations, setQuotations, addQuotation, updateQuotation, deleteQuotation,
      purchaseOrders, setPurchaseOrders, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
      grns, setGrns, addGRN, updateGRN, deleteGRN, updateStockOnGRN,
      issues, setIssues, addIssue, updateIssue, deleteIssue, deductStockOnIssue,
      tools, setTools, addTool, updateTool, deleteTool,
      toolIssues, setToolIssues, addToolIssue, updateToolIssue, deleteToolIssue,
      emergencyDCs, setEmergencyDCs, addEmergencyDC, updateEmergencyDCStatus, deleteEmergencyDC,
      loading,
      isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
      isStoreTeam: user?.role === 'store_team' || user?.role === 'admin' || user?.role === 'superadmin',
      isPurchaseTeam: user?.role === 'purchase_team' || user?.role === 'admin' || user?.role === 'superadmin',
      canEdit: user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'store_team' || user?.role === 'purchase_team' || user?.role === 'staff',
      isViewer: user?.role === 'viewer'
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
