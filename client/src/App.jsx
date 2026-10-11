import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Products from './pages/Products';
import ProductForm from './pages/ProductForm';
import Warehouses from './pages/Warehouses';
import WarehouseForm from './pages/WarehouseForm';
import StockOverview from './pages/StockOverview';
import Receipts from './pages/Receipts';
import ReceiptForm from './pages/ReceiptForm';
import Deliveries from './pages/Deliveries';
import DeliveryForm from './pages/DeliveryForm';
import Transfers from './pages/Transfers';
import TransferForm from './pages/TransferForm';
import Adjustments from './pages/Adjustments';
import AdjustmentForm from './pages/AdjustmentForm';
import Dashboard from './pages/Dashboard';
import StockLedger from './pages/StockLedger';
import StockAging from './pages/StockAging';
import StockForecasting from './pages/StockForecasting';
import InventoryValuation from './pages/InventoryValuation';
import Reservations from './pages/Reservations';
import TransferApprovals from './pages/TransferApprovals';
import AuditList from './pages/AuditList';
import AuditForm from './pages/AuditForm';
import AuditReview from './pages/AuditReview';
import IntelligenceDashboard from './pages/IntelligenceDashboard';
import CompanyOnboarding from './pages/CompanyOnboarding';
import TeamManagement from './pages/TeamManagement';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            {/* Standalone Onboarding Route for users without active company */}
            <Route path="/onboarding" element={<CompanyOnboarding />} />

            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              
              {/* User Profile & Enterprise Settings */}
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />

              {/* AI Inventory Intelligence */}
              <Route path="intelligence" element={<IntelligenceDashboard />} />

              {/* Team & Company Management */}
              <Route path="team" element={<TeamManagement />} />

              <Route path="products" element={<Products />} />
              <Route path="products/new" element={<ProductForm />} />
              <Route path="products/:id/edit" element={<ProductForm />} />
              
              <Route path="warehouses" element={<Warehouses />} />
              <Route path="warehouses/new" element={<WarehouseForm />} />
              <Route path="warehouses/:id/edit" element={<WarehouseForm />} />
              
              <Route path="stock-overview" element={<StockOverview />} />
              <Route path="ledger" element={<StockLedger />} />
              
              <Route path="receipts" element={<Receipts />} />
              <Route path="receipts/new" element={<ReceiptForm />} />
              <Route path="deliveries" element={<Deliveries />} />
              <Route path="deliveries/new" element={<DeliveryForm />} />
              <Route path="transfers" element={<Transfers />} />
              <Route path="transfers/new" element={<TransferForm />} />
              <Route path="adjustments" element={<Adjustments />} />
              <Route path="adjustments/new" element={<AdjustmentForm />} />
              
              {/* Advanced Features */}
              <Route path="aging" element={<StockAging />} />
              <Route path="forecasting" element={<StockForecasting />} />
              <Route path="valuation" element={<InventoryValuation />} />
              <Route path="reservations" element={<Reservations />} />
              <Route path="approvals" element={<TransferApprovals />} />
              <Route path="audits" element={<AuditList />} />
              <Route path="audits/new" element={<AuditForm />} />
              <Route path="audits/:id/count" element={<AuditForm />} />
              <Route path="audits/:id/review" element={<AuditReview />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
