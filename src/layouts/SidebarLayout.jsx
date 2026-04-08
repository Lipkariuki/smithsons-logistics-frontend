import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
  import {
    Home,
    FileText,
    Truck,
    Wallet,
    BarChart2,
    Settings,
    LogOut,
    User,
    ChevronDown,
    LayoutDashboard,
    Users
  } from "lucide-react";
import { Calculator as CalculatorIcon } from "lucide-react";
import axiosAuth from "../utils/axiosAuth";

const SidebarLayout = () => {
  const [showReportsMenu, setShowReportsMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    axiosAuth
      .get("/users/me")
      .then((res) => {
        if (mounted) setCurrentUser(res.data);
      })
      .catch(() => {
        if (mounted) setCurrentUser(null);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (location.pathname.startsWith("/admin/reports")) {
      setShowReportsMenu(true);
    }
  }, [location.pathname]);

  const menuItems = useMemo(
    () => [
      { name: "Revenue", icon: <Wallet size={18} />, path: "/admin/finance" },
      { name: "Platform Earnings", icon: <Wallet size={18} />, path: "/admin/platform-earnings" },
      { name: "Orders", icon: <FileText size={18} />, path: "/admin/orders" },
      { name: "Trips", icon: <Truck size={18} />, path: "/admin/trips" },
      { name: "Fleet", icon: <Users size={18} />, path: "/admin/fleet" },
      { name: "Expenses", icon: <BarChart2 size={18} />, path: "/admin/expenses" },
      // { name: "Calculator", icon: <CalculatorIcon size={18} />, path: "/admin/calculator" },
    ],
    []
  );

  return (
    <div className="flex min-h-screen bg-transparent text-[15px]">
      {/* Sidebar */}
      <aside className="w-72 xl:w-80 border-r border-violet-100 bg-white/90 p-5 shadow-[0_18px_40px_-24px_rgba(88,28,135,0.25)] backdrop-blur-sm flex flex-col sticky top-0 h-screen overflow-y-auto flex-shrink-0">
        {/* Brand */}
        <div className="mb-5">
          <div className="flex items-center gap-3">
            {/* Brand logo from /public/logo.svg */}
            <img
              src="/logo.svg"
              alt="Smithsons Logistics"
              className="h-8 w-8 object-contain select-none"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div>
              <h1 className="text-xl font-semibold text-violet-800 leading-tight">Smithsons Logistics</h1>
              <p className="text-xs text-violet-500">Powering Every Trip. Empowering Every Partner.</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="space-y-1">
          {/* Home link */}
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-base transition ${
                isActive ? "bg-violet-100 text-violet-800" : "text-slate-700 hover:bg-violet-50"
              }`
            }
          >
            <Home size={18} />
            Home
          </NavLink>

          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-base transition ${
                  isActive ? "bg-violet-100 text-violet-800" : "text-slate-700 hover:bg-violet-50"
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}

          <div className="mt-2">
            <button
              onClick={() => setShowReportsMenu((prev) => !prev)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-base transition ${
                location.pathname.startsWith("/admin/reports")
                  ? "bg-violet-100 text-violet-800"
                  : "text-slate-700 hover:bg-violet-50"
              }`}
              type="button"
            >
              <LayoutDashboard size={18} />
              <span className="flex-1 text-left">Reports</span>
              <ChevronDown
                size={16}
                className={`transition-transform ${showReportsMenu ? "rotate-180" : ""}`}
              />
            </button>

            {showReportsMenu && (
              <div className="mt-1 ml-6 space-y-1">
                <NavLink
                  to="/admin/reports/internal"
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-sm transition ${
                      isActive ? "bg-violet-50 text-violet-800" : "text-slate-600 hover:bg-violet-50"
                    }`
                  }
                >
                  Internal Reports
                </NavLink>
                <NavLink
                  to="/admin/reports/dhl"
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-sm transition ${
                      isActive ? "bg-violet-50 text-violet-800" : "text-slate-600 hover:bg-violet-50"
                    }`
                  }
                >
                  DHL Payouts
                </NavLink>
                <NavLink
                  to="/admin/reports/dhl-reconciliation"
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-sm transition ${
                      isActive ? "bg-violet-50 text-violet-800" : "text-slate-600 hover:bg-violet-50"
                    }`
                  }
                >
                  DHL Reconciliation
                </NavLink>
              </div>
            )}
          </div>
        </nav>

        {/* User actions */}
        <div className="mt-auto pt-4 border-t">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700">
              <User size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-violet-950">{currentUser?.name || "Admin"}</p>
              <p className="text-xs text-violet-500">{currentUser?.role || "Logged in"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2">
            <NavLink
              to="/admin/settings"
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md hover:bg-violet-50 text-slate-700"
            >
              <Settings size={16} /> Settings
            </NavLink>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                window.location.href = "/login";
              }}
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md hover:bg-red-50 text-red-600"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <div className="max-w-screen-2xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SidebarLayout;
