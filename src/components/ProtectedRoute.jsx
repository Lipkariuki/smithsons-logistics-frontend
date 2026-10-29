import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import axiosAuth from "../utils/axiosAuth";

const homes = { admin: "/admin/dashboard", owner: "/partner/dashboard", driver: "/driver/home" };

export default function ProtectedRoute({ role }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const [state, setState] = useState({ token: null, user: null, error: false });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    if (!token) return;
    axiosAuth.get("/users/me").then(({ data }) => {
      if (active) setState({ token, user: data, error: false });
    }).catch(() => {
      if (active) setState({ token, user: null, error: true });
    });
    return () => { active = false; };
  }, [token, location.pathname, retry]);

  if (!token) return <Navigate to="/login" replace />;
  if (state.token !== token) return <p role="status">Checking access…</p>;
  if (state.error) return <div role="alert">Unable to verify access. <button onClick={() => { setState({ token: null, user: null, error: false }); setRetry(value => value + 1); }}>Retry</button></div>;
  if (!homes[state.user?.role]) return <p role="alert">Access denied.</p>;
  if (state.user.role !== role) return <Navigate to={homes[state.user.role]} replace />;
  return <Outlet />;
}
