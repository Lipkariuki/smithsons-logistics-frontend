import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../../utils/axiosAuth";

const OwnerDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get("/partner-dashboard/")
      .then((res) => setMetrics(res.data))
      .catch((err) => {
        console.error("Failed to load metrics:", err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  if (!metrics) {
    return <div className="p-4">Loading partner dashboard...</div>;
  }

  return (
    <div className="p-6">
      {/* ✅ Welcome + Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-purple-700">
          👋 Welcome back, {metrics.ownerName || "Partner"}!
        </h1>
        <div className="mt-4 md:mt-0 flex gap-4">
          <Link to="/partner/dashboard" className="bg-purple-100 text-purple-800 font-medium px-4 py-2 rounded hover:bg-purple-200">
            🏠 Home
          </Link>
          <Link to="/partner/orders" className="bg-blue-100 text-blue-800 font-medium px-4 py-2 rounded hover:bg-blue-200">
            📦 View Orders
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Net Earnings</h3>
          <p className="text-xl font-semibold text-green-600">KES {metrics.netEarnings.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Total Expenses</h3>
          <p className="text-xl font-semibold text-red-500">KES {metrics.expensesTotal.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Total Commission</h3>
          <p className="text-xl font-semibold text-blue-500">KES {metrics.commissionTotal.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Revenue This Month</h3>
          <p className="text-xl font-semibold text-purple-600">KES {metrics.monthRevenue.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Total Revenue</h3>
          <p className="text-xl font-semibold text-gray-800">KES {metrics.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Pending Orders</h3>
          <p className="text-xl font-semibold text-orange-500">KES {metrics.pending.toLocaleString()}</p>
        </div>
      </div>

      {/* Trips Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Trips Completed</h3>
          <p className="text-2xl font-bold text-green-700">{metrics.tripsCompleted}</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Trips Ongoing</h3>
          <p className="text-2xl font-bold text-yellow-600">{metrics.tripsOngoing}</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Idle Vehicles</h3>
          <p className="text-2xl font-bold text-gray-700">{metrics.idleVehicles}</p>
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-3 text-purple-600">📈 Monthly Revenue Trend</h3>
        <ul className="text-sm space-y-1">
          {metrics.revenueTrend.map((m) => (
            <li key={m.month}>
              <span className="font-medium">Month {m.month}:</span> KES {m.revenue.toLocaleString()}
            </li>
          ))}
        </ul>
      </div>

      {/* Driver Performance */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3 text-purple-600">🚚 Driver Performance</h3>
        <ul className="text-sm space-y-1">
          {metrics.drivers.map((d) => (
            <li key={d.id}>
              <span className="font-medium">{d.name}:</span> {d.trips} trips
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default OwnerDashboard;
