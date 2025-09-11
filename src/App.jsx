import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import SidebarLayout from "./layouts/SidebarLayout";

import AdminDashboard from "./pages/admin/AdminDashboard";
import OrdersDashboard from "./pages/orders/OrdersDashboard";
import OwnerDashboard from "./pages/partners/OwnerDashboard";
import AdminTripsPage from "./pages/admin/AdminTripsPage";
import AdminFleetPage from "./pages/admin/AdminFleetPage";

import DriverHomePage from "./pages/driver/DriverHomePage";
import DriverTripsPage from "./pages/driver/DriverTripsPage";
import DriverExpensesPage from "./pages/driver/DriverExpensesPage";

import ExpensesPage from "./pages/ExpensesPage";
import ReportsPage from "./pages/ReportsPage";
import RevenueDashboard from "./pages/revenue/RevenueDashboard";
import AdminEarningsDashboard from "./pages/AdminEarnings";
import PlatformEarningsComingSoon from "./pages/admin/PlatformEarningsComingSoon";
import PartnerOrdersDashboard from "./pages/partners/PartnerOrdersDashboard";
import CalculatorPage from "./pages/CalculatorPage";
import IdleLogout from "./components/IdleLogout";

const App = () => {
  return (
    <>
    <IdleLogout />
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Admin routes */}
      <Route path="/admin" element={<SidebarLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="home" element={<Navigate to="/admin/dashboard" />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="orders" element={<OrdersDashboard />} />
        <Route path="trips" element={<AdminTripsPage />} />
        <Route path="fleet" element={<AdminFleetPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="finance" element={<RevenueDashboard />} />
        <Route path="admin_earnings" element={<AdminEarningsDashboard />} />
        <Route path="platform-earnings" element={<PlatformEarningsComingSoon />} />
        <Route path="calculator" element={<CalculatorPage />} />
      </Route>

      {/* Partner/owner routes */}
      <Route path="/partner/dashboard" element={<OwnerDashboard />} />
      <Route path="/partner/orders" element={<PartnerOrdersDashboard />} />

      {/* Driver routes */}
      <Route path="/driver/home" element={<DriverHomePage />} />
      <Route path="/driver/trips" element={<DriverTripsPage />} />
      <Route path="/driver/expenses" element={<DriverExpensesPage />} />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </>
  );
};

export default App;
