import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../../utils/axiosAuth"; // ✅ custom axios with token

const PartnerOrdersDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await axios.get("/partner/orders");
        setOrders(res.data);
      } catch (err) {
        console.error("Error fetching partner orders:", err);
        setError("Could not load partner orders.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (loading) return <p className="p-4">Loading orders...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-6">
      {/* ✅ Header with Back Button and Settings */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-purple-700">My Orders</h1>
          <Link
            to="/partner/dashboard"
            className="bg-purple-100 text-purple-800 font-medium px-4 py-2 rounded hover:bg-purple-200"
          >
            🏠 Back to Home
          </Link>
        </div>

        {/* ✅ Settings Dropdown */}
        <div className="relative inline-block text-left">
          <button
            type="button"
            className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            ⚙️ Settings
          </button>
          <div className="absolute right-0 mt-2 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
            <div className="py-1">
              <button
                onClick={() => navigate("/partner/profile")}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                🧑 Profile Settings
              </button>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-100"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Table */}
      <div className="overflow-x-auto rounded border border-gray-300 shadow">
        <table className="min-w-full bg-white text-sm text-left">
          <thead className="bg-purple-700 text-white">
            <tr>
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Destination</th>
              <th className="px-4 py-2">Truck</th>
              <th className="px-4 py-2">Cases</th>
              <th className="px-4 py-2">Total (KES)</th>
              <th className="px-4 py-2">Dispatch Note</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{order.invoice_number}</td>
                <td className="px-4 py-2">{order.date?.slice(0, 10)}</td>
                <td className="px-4 py-2">{order.product_description}</td>
                <td className="px-4 py-2">{order.destination}</td>
                <td className="px-4 py-2">{order.truck_plate}</td>
                <td className="px-4 py-2">{order.cases}</td>
                <td className="px-4 py-2">{order.total_amount.toLocaleString()}</td>
                <td className="px-4 py-2">
                  {order.dispatch_note || <span className="italic text-gray-400">N/A</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PartnerOrdersDashboard;
