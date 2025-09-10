import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
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

const SidebarLayout = () => {
  const [showDropdown, setShowDropdown] = useState(false);

  const menuItems = [
    { name: "Revenue", icon: <Wallet size={18} />, path: "/admin/finance" },
    { name: "Platform Earnings", icon: <Wallet size={18} />, path: "/admin/platform-earnings" },
    { name: "Orders", icon: <FileText size={18} />, path: "/admin/orders" },
    { name: "Trips", icon: <Truck size={18} />, path: "/admin/trips" },
    { name: "Fleet", icon: <Users size={18} />, path: "/admin/fleet" },
    { name: "Expenses", icon: <BarChart2 size={18} />, path: "/admin/expenses" },
    { name: "Reports", icon: <LayoutDashboard size={18} />, path: "/admin/reports" },
    { name: "Calculator", icon: <CalculatorIcon size={18} />, path: "/admin/calculator" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100 text-[15px]">
      {/* Sidebar */}
      <aside className="w-72 xl:w-80 bg-white border-r p-5 shadow-sm flex flex-col sticky top-0 h-screen overflow-y-auto flex-shrink-0">
        {/* Brand */}
        <div className="mb-5">
          <div className="flex items-center gap-2">
            <Truck size={20} className="text-purple-700" />
            <div>
              <h1 className="text-xl font-semibold text-purple-700 leading-tight">Smithsons Logistics</h1>
              <p className="text-xs text-gray-500">Powering Every Trip. Empowering Every Partner.</p>
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
                isActive ? "bg-purple-100 text-purple-700" : "text-gray-700 hover:bg-purple-50"
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
                  isActive ? "bg-purple-100 text-purple-700" : "text-gray-700 hover:bg-purple-50"
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* User actions */}
        <div className="mt-auto pt-4 border-t">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700">
              <User size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Admin</p>
              <p className="text-xs text-gray-500">Logged in</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2">
            <NavLink
              to="/admin/settings"
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md hover:bg-purple-50 text-gray-700"
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
