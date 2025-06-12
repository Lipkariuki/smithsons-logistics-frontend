import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Truck,
  Wallet,
  BarChart2,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Briefcase
} from "lucide-react";

const SidebarLayout = () => {
  const [showDropdown, setShowDropdown] = useState(false);

  const menuItems = [
    { name: "Revenue", icon: <Wallet size={18} />, path: "/admin/finance" },
    { name: "Orders", icon: <FileText size={18} />, path: "/admin/orders" },
    { name: "Trips", icon: <Truck size={18} />, path: "/admin/trips" },
    { name: "Expenses", icon: <BarChart2 size={18} />, path: "/admin/expenses" },
    { name: "Partner", icon: <Briefcase size={18} />, path: "/admin/owner" },
    { name: "Reports", icon: <LayoutDashboard size={18} />, path: "/admin/reports" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r p-4 shadow-sm flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-semibold text-purple-700 mb-4">Main Menu</h2>
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive ? "bg-purple-100 text-purple-700" : "text-gray-700 hover:bg-purple-50"
                  }`
                }
              >
                {item.icon}
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Settings + Profile Dropdown */}
        <div className="pt-4 border-t mt-4 relative">
          <div
            onClick={() => setShowDropdown((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-purple-50 cursor-pointer"
          >
            <User size={18} />
            Admin
            <ChevronDown size={14} />
          </div>

          {showDropdown && (
            <div className="absolute bottom-12 left-0 w-full bg-white shadow-md rounded-md overflow-hidden z-10">
              <NavLink
                to="/admin/settings"
                className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-purple-50 text-gray-700"
              >
                <Settings size={16} /> Settings
              </NavLink>
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.href = "/login";
                }}
                className="flex items-center w-full gap-2 px-4 py-2 text-sm hover:bg-purple-50 text-gray-700"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-white p-8 rounded-tl-3xl shadow-inner">
        <Outlet />
      </main>
    </div>
  );
};

export default SidebarLayout;
