import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import SidebarLayout from "./layouts/SidebarLayout";

import AdminHomePage from "./pages/admin/AdminHomePage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import OrdersDashboard from "./pages/orders/OrdersDashboard";
import OwnerDashboard from "./pages/partners/OwnerDashboard";
import AdminTripsPage from "./pages/admin/AdminTripsPage"; // ✅ create this

import DriverHomePage from "./pages/driver/DriverHomePage";
import DriverTripsPage from "./pages/driver/DriverTripsPage";
import DriverExpensesPage from "./pages/driver/DriverExpensesPage";

import ExpensesPage from "./pages/ExpensesPage";
import ReportsPage from "./pages/ReportsPage";
import RevenueDashboard from "./pages/revenue/RevenueDashboard";
import AdminEarningsDashboard from "./pages/AdminEarnings";
import PartnerOrdersDashboard from "./pages/partners/PartnerOrdersDashboard";

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Admin routes */}
      <Route path="/admin" element={<SidebarLayout />}>
        <Route index element={<AdminHomePage />} />
        <Route path="home" element={<AdminHomePage />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="orders" element={<OrdersDashboard />} />
        <Route path="trips" element={<AdminTripsPage />} /> {/* ✅ new */}
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="finance" element={<RevenueDashboard />} />
        <Route path="admin_earnings" element={<AdminEarningsDashboard />} />
      </Route>

      {/* Partner/owner routes */}
      <Route path="/partner/dashboard" element={<OwnerDashboard />} />
      <Route path="/partner/orders" element={<PartnerOrdersDashboard />} />

      {/* ✅ Driver routes */}
      <Route path="/driver/home" element={<DriverHomePage />} />
      <Route path="/driver/trips" element={<DriverTripsPage />} />
      <Route path="/driver/expenses" element={<DriverExpensesPage />} />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
