import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // ✅ add this

const OwnerDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:8000/partner-dashboard/", {
      headers: {
        Authorization: `Bearer ${token}`, // ✅ ensures auth
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`API responded with ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setMetrics(data);
      })
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
      <h1 className="text-2xl font-bold text-purple-700 mb-6">Partner Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Net Earnings</h3>
          <p className="text-xl font-semibold text-green-600">
            KES {metrics.netEarnings.toLocaleString()}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Total Expenses</h3>
          <p className="text-xl font-semibold text-red-500">
            KES {metrics.expensesTotal.toLocaleString()}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Total Commission</h3>
          <p className="text-xl font-semibold text-blue-500">
            KES {metrics.commissionTotal.toLocaleString()}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Revenue This Month</h3>
          <p className="text-xl font-semibold text-purple-600">
            KES {metrics.monthRevenue.toLocaleString()}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Total Revenue</h3>
          <p className="text-xl font-semibold text-gray-800">
            KES {metrics.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-sm text-gray-500">Pending Orders</h3>
          <p className="text-xl font-semibold text-orange-500">
            KES {metrics.pending.toLocaleString()}
          </p>
        </div>

        {/* ✅ New Orders Navigation Card */}
        <Link
          to="/partner/orders"
          className="p-4 bg-blue-100 hover:bg-blue-200 transition rounded-lg shadow flex flex-col justify-center"
        >
          <h3 className="text-sm text-gray-600">📦 View Your Orders</h3>
          <p className="text-base font-semibold text-blue-800 mt-2">
            Go to Orders Dashboard
          </p>
        </Link>
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
        <h3 className="text-lg font-semibold mb-3 text-purple-600">Monthly Revenue Trend</h3>
        <ul className="text-sm space-y-1">
          {metrics.revenueTrend.map((m) => (
            <li key={m.month}>
              <span className="font-medium">Month {m.month}:</span>{" "}
              KES {m.revenue.toLocaleString()}
            </li>
          ))}
        </ul>
      </div>

      {/* Driver Performance */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-3 text-purple-600">Driver Performance</h3>
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
