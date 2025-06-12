// components/ProtectedRoute.jsx

import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  // ✅ DISABLE check if token is not required yet
  // const token = localStorage.getItem("token");
  // if (!token) return <Navigate to="/login" replace />;

  return <Outlet />;
};

export default ProtectedRoute;
