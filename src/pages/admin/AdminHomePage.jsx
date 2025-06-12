import React from "react";
import { useNavigate } from "react-router-dom";

const AdminHomePage = () => {
  const navigate = useNavigate();

  const dashboards = [
    {
      name: "Financial Dashboard",
      description: "View revenue, commissions, and expense summaries.",
      path: "/admin/finance", // 
    },
    {
      name: "Orders Dashboard",
      description: "Browse all raw orders, truck assignments, and trip statuses.",
      path: "/admin/orders", // 
    },
  ];
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">Admin Dashboards</h1>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
        {dashboards.map((dashboard) => (
          <div
            key={dashboard.name}
            onClick={() => navigate(dashboard.path)}
            className="cursor-pointer bg-white shadow-md rounded-2xl p-6 hover:shadow-lg transition duration-300 border-l-4 border-purple-500"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{dashboard.name}</h2>
            <p className="text-gray-600 text-sm">{dashboard.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminHomePage;
