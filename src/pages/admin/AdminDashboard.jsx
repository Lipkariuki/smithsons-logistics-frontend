import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosAuth from "../../utils/axiosAuth"; // ✅ correct import

const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [editRowId, setEditRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchOrders = () => {
    axiosAuth.get("/admin/orders")
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        const sorted = data.slice().sort((a, b) => {
          const ad = a.date ? new Date(a.date) : null;
          const bd = b.date ? new Date(b.date) : null;
          if (ad && bd) return bd - ad; // newest first
          if (bd && !ad) return 1;
          if (ad && !bd) return -1;
          return (b.id || 0) - (a.id || 0);
        });
        setOrders(sorted);
      })
      .catch((err) => {
        console.error("Fetch orders failed:", err);
      });
  };

  const fetchDrivers = () => {
    axiosAuth.get("/users/?role=driver")
      .then((res) => setAvailableDrivers(res.data))
      .catch((err) => console.error("Fetch drivers failed:", err));
  };

  const fetchVehicles = () => {
    axiosAuth.get("/vehicles/")
      .then((res) => setAvailableVehicles(res.data))
      .catch((err) => console.error("Fetch vehicles failed:", err));
  };

  useEffect(() => {
    fetchOrders();
    fetchDrivers();
    fetchVehicles();
  }, []);

  const handleSaveClick = async (orderId) => {
    try {
      setError("");
      if (editFormData.driver_id) {
        await axiosAuth.put(`/orders/${orderId}/assign-driver?driver_id=${editFormData.driver_id}`);
      }
      if (editFormData.vehicle_id) {
        await axiosAuth.put(`/orders/${orderId}/assign-vehicle?vehicle_id=${editFormData.vehicle_id}`);
      }
      if (editFormData.expense_amount && editFormData.trip_id) {
        await axiosAuth.post("/expenses/", {
          trip_id: editFormData.trip_id,
          amount: parseFloat(editFormData.expense_amount),
          description: editFormData.expense_description,
        });
      }
      setEditRowId(null);
      setEditFormData({});
      fetchOrders();
      setMessage("Record updated successfully.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Save failed:", err);
      const reason = err.response?.data?.detail || err.message;
      setError(`Update failed: ${reason}`);
      setTimeout(() => setError(""), 4000);
    }
  };

  const handleEditClick = (order) => {
    setEditRowId(order.id);
    setEditFormData({
      product_description: order.product_description,
      destination: order.destination,
      driver_id: "",
      vehicle_id: "",
      expense_amount: "",
      expense_description: "",
      trip_id: order.trip_id,
    });
  };

  const handleCancelClick = () => {
    setEditRowId(null);
    setEditFormData({});
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md px-6 py-4">
        <h1 className="text-2xl font-bold text-purple-700">Admin Dashboards</h1>
        <p className="text-sm text-gray-500">Overview of orders and financial performance</p>
      </header>

      <main className="p-6 space-y-6">
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
            {error}
          </div>
        )}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/admin/finance" className="block bg-white rounded-xl border-l-4 border-purple-500 shadow px-6 py-4 hover:shadow-md transition">
            <h3 className="text-lg font-bold text-gray-800">Financial Dashboard</h3>
            <p className="text-sm text-gray-600">View revenue, commissions, and expense summaries.</p>
          </Link>
          <Link to="/admin/orders" className="block bg-white rounded-xl border-l-4 border-purple-500 shadow px-6 py-4 hover:shadow-md transition">
            <h3 className="text-lg font-bold text-gray-800">Orders Dashboard</h3>
            <p className="text-sm text-gray-600">Browse all raw orders, truck assignments, and trip statuses.</p>
          </Link>
          <Link to="/admin/fleet" className="block bg-white rounded-xl border-l-4 border-purple-500 shadow px-6 py-4 hover:shadow-md transition">
            <h3 className="text-lg font-bold text-gray-800">Fleet</h3>
            <p className="text-sm text-gray-600">Owners and vehicles with search, filters, and export.</p>
          </Link>
        </section>

        {/* Orders Table */}
        <section className="bg-white shadow rounded-lg p-4 overflow-x-auto">
          <h2 className="text-xl font-semibold mb-4">Orders</h2>
          <table className="min-w-full table-auto text-sm">
          <thead>
          <tr className="text-left border-b bg-gray-100 text-gray-600">
            <th className="py-2 px-4">Order ID</th>
            <th className="py-2 px-4">DHL Order #</th>
            <th className="py-2 px-4">Invoice</th>
            <th className="py-2 px-4">Product</th>
            <th className="py-2 px-4">Destination</th>
            <th className="py-2 px-4">Driver</th>
            <th className="py-2 px-4">Vehicle</th>
            <th className="py-2 px-4">Total Paid</th>
            <th className="py-2 px-4">Expenses</th>
            <th className="py-2 px-4">Commission</th>
            <th className="py-2 px-4">Revenue</th>
            <th className="py-2 px-4">Actions</th>
          </tr>
        </thead>

            <tbody>
              {orders.map((order) => {
                const revenue = order.total_amount - order.expenses - order.commission;
                const isEditing = editRowId === order.id;

                return (
                  <tr key={order.id} className="border-t hover:bg-gray-50 text-gray-700">
                    <td className="py-2 px-4">{order.id}</td>
                    <td className="py-2 px-4 font-bold text-purple-700">{order.order_number}</td>

                    <td className="py-2 px-4">{order.invoice_number}</td>
                    <td className="py-2 px-4">
                      {isEditing ? (
                        <input
                          value={editFormData.product_description}
                          onChange={(e) => setEditFormData({ ...editFormData, product_description: e.target.value })}
                          className="w-full p-1 border rounded"
                        />
                      ) : (
                        order.product_description
                      )}
                    </td>
                    <td className="py-2 px-4">
                      {isEditing ? (
                        <input
                          value={editFormData.destination}
                          onChange={(e) => setEditFormData({ ...editFormData, destination: e.target.value })}
                          className="w-full p-1 border rounded"
                        />
                      ) : (
                        order.destination
                      )}
                    </td>
                    <td className="py-2 px-4">
                      {isEditing ? (
                        <select
                          value={editFormData.driver_id}
                          onChange={(e) => setEditFormData({ ...editFormData, driver_id: e.target.value })}
                          className="w-full border rounded p-1"
                        >
                          <option value="">Assign Driver</option>
                          {availableDrivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>{driver.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={order.driver_name === "Unassigned" ? "text-red-600" : ""}>
                          {order.driver_name}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      {isEditing ? (
                        <select
                          value={editFormData.vehicle_id}
                          onChange={(e) => setEditFormData({ ...editFormData, vehicle_id: e.target.value })}
                          className="w-full border rounded p-1"
                        >
                          <option value="">Assign Vehicle</option>
                          {availableVehicles.map((vehicle) => (
                            <option key={vehicle.id} value={vehicle.id}>{vehicle.plate_number}</option>
                          ))}
                        </select>
                      ) : (
                        order.truck_plate ?? <span className="text-red-600">Unassigned</span>
                      )}
                    </td>
                    <td className="py-2 px-4">{order.total_amount.toLocaleString()}</td>
                    <td className="py-2 px-4">
                      {isEditing ? (
                        <div className="flex flex-col gap-1 md:flex-row md:items-center">
                          <input
                            type="number"
                            placeholder="Amount"
                            value={editFormData.expense_amount}
                            onChange={(e) => setEditFormData({ ...editFormData, expense_amount: e.target.value })}
                            className="w-full p-1 border rounded"
                          />
                          <input
                            type="text"
                            placeholder="Description"
                            value={editFormData.expense_description}
                            onChange={(e) => setEditFormData({ ...editFormData, expense_description: e.target.value })}
                            className="w-full p-1 border rounded"
                          />
                        </div>
                      ) : (
                        `${order.expenses.toLocaleString()} KES`
                      )}
                    </td>
                    <td className="py-2 px-4">{order.commission.toLocaleString()}</td>
                    <td className="py-2 px-4 text-green-600 font-semibold">{revenue.toLocaleString()}</td>
                    <td className="py-2 px-4 space-x-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveClick(order.id)}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelClick}
                            className="border px-2 py-1 rounded text-xs"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEditClick(order)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ✏️
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
