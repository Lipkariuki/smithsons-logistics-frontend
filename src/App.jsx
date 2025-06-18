// import React from "react";
// import { Routes, Route, Navigate } from "react-router-dom";

// import LoginPage from "./pages/LoginPage";
// import SidebarLayout from "./layouts/SidebarLayout";

// import AdminHomePage from "./pages/admin/AdminHomePage";
// import AdminDashboard from "./pages/admin/AdminDashboard";
// import OrdersDashboard from "./pages/orders/OrdersDashboard";
// import OwnerDashboard from "./pages/partners/OwnerDashboard"; // ✅ RELOCATED
// import TripsPage from "./pages/driver/TripsPage";
// import ExpensesPage from "./pages/ExpensesPage";
// import ReportsPage from "./pages/ReportsPage";
// import RevenueDashboard from "./pages/revenue/RevenueDashboard";
// import AdminEarningsDashboard from "./pages/AdminEarnings";
// import PartnerOrdersDashboard from "./pages/partners/PartnerOrdersDashboard";

// const App = () => {
//   return (
//     <Routes>
//       <Route path="/login" element={<LoginPage />} />

//       {/* Admin routes */}
//       <Route path="/admin" element={<SidebarLayout />}>
//         <Route index element={<AdminHomePage />} />
//         <Route path="home" element={<AdminHomePage />} />
//         <Route path="dashboard" element={<AdminDashboard />} />
//         <Route path="orders" element={<OrdersDashboard />} />
//         <Route path="owner" element={<TripsPage />} />
//         <Route path="trips" element={<TripsPage />} />
//         <Route path="expenses" element={<ExpensesPage />} />
//         <Route path="reports" element={<ReportsPage />} />
//         <Route path="finance" element={<RevenueDashboard />} />
//         <Route path="admin_earnings" element={<AdminEarningsDashboard />} />
//       </Route>

//       {/* Partner/owner routes */}
//       <Route path="/partner/dashboard" element={<OwnerDashboard />} /> {/* ✅ owner view */}
//       <Route path="/partner/orders" element={<PartnerOrdersDashboard />} />

//       <Route path="*" element={<Navigate to="/login" replace />} />
//     </Routes>
//   );
// };
// console.log("BASE URL:", import.meta.env.VITE_API_BASE_URL);
// console.log("Rebuild trigger test");



// export default App;

function App() {
  console.log("✅ App is rendering");

  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold text-green-600">🚚 Logistics App Live</h1>
      <p className="mt-4">If you see this message, React + Tailwind are working.</p>
    </div>
  );
}

export default App;
