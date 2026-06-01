import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { useApp } from './context/AppContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Enquiry from './pages/Enquiry';
import Quotations from './pages/Quotations';
import PurchaseOrders from './pages/PurchaseOrders';
import StoreGRN from './pages/StoreGRN';
import IssueMaterial from './pages/IssueMaterial';
import Inventory from './pages/Inventory';
import Tools from './pages/Tools';
import Projects from './pages/Projects';
import Vendors from './pages/Vendors';
import MaterialMaster from './pages/MaterialMaster';
import Reports from './pages/Reports';
import EmergencyDC from './pages/EmergencyDC';

function App() {
  const { user, loading } = useApp();

  if (!user) {
    return <Login />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/enquiry" element={<Enquiry />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/store" element={<StoreGRN />} />
          <Route path="/issue" element={<IssueMaterial />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/material-master" element={<MaterialMaster />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/emergency-dc" element={<EmergencyDC />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
