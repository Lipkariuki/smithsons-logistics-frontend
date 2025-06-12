import React, { useEffect, useState } from "react";
import axios from "axios";

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [editRowId, setEditRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const fetchOrders = () => {
    axios.get("http://localhost:8000/admin/orders")
      .then((res) => setOrders(res.data))
      .catch((err) => console.error("Fetch orders failed:", err));
  };

  const fetchDrivers = () => {
    axios.get("http://localhost:8000/users/?role=driver")
      .then((res) => setAvailableDrivers(res.data))
      .catch((err) => console.error("Fetch drivers failed:", err));
  };

  const fetchVehicles = () => {
    axios.get("http://localhost:8000/vehicles")
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
      if (editFormData.driver_id) {
        await axios.put(`http://localhost:8000/orders/${orderId}/assign-driver?driver_id=${editFormData.driver_id}`);
      }
      if (editFormData.vehicle_id) {
        await axios.put(`http://localhost:8000/orders/${orderId}/assign-vehicle?vehicle_id=${editFormData.vehicle_id}`);
      }
      if (editFormData.expense_amount && editFormData.trip_id) {
        await axios.post("http://localhost:8000/expenses/", {
          trip_id: editFormData.trip_id,
          amount: parseFloat(editFormData.expense_amount),
          description: editFormData.expense_description,
        });
      }
      if (editFormData.commission_rate && editFormData.trip_id) {
        await axios.put(
          `http://localhost:8000/commissions/${editFormData.trip_id}`,
          null,
          {
            params: {
              rate_percent: parseFloat(editFormData.commission_rate),
            },
          }
        );
      }

      setEditRowId(null);
      setEditFormData({});
      fetchOrders();
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const handleEditClick = (order) => {
    setEditRowId(order.id);
    setEditFormData({
      driver_id: "",
      vehicle_id: "",
      expense_amount: "",
      expense_description: "",
      commission_rate: "",
      trip_id: order.trip_id,
    });
  };

  const handleCancelClick = () => {
    setEditRowId(null);
    setEditFormData({});
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">Admin Orders</h1>
      <div className="overflow-x-auto rounded border border-gray-300 shadow">
        <table className="min-w-full bg-white text-sm text-left">
          <thead className="bg-gray-100 text-gray-700 text-center">
            <tr>
              <th className="px-4 py-2">Order ID</th>
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Driver</th>
              <th className="px-4 py-2">Vehicle</th>
              <th className="px-4 py-2">Expenses</th>
              <th className="px-4 py-2">Commission</th>
              <th className="px-4 py-2">Revenue</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const revenue = order.total_amount - order.expenses - order.commission;
              const isEditing = editRowId === order.id;

              return (
                <tr key={order.id} className="border-t text-center">
                  <td className="px-4 py-2">{order.id}</td>
                  <td className="px-4 py-2">{order.invoice_number}</td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <select
                        value={editFormData.driver_id}
                        onChange={(e) => setEditFormData({ ...editFormData, driver_id: e.target.value })}
                        className="border rounded p-1"
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
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <select
                        value={editFormData.vehicle_id}
                        onChange={(e) => setEditFormData({ ...editFormData, vehicle_id: e.target.value })}
                        className="border rounded p-1"
                      >
                        <option value="">Assign Vehicle</option>
                        {availableVehicles.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>{vehicle.plate_number}</option>
                        ))}
                      </select>
                    ) : (
                      <span>{order.truck_plate}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input
                        type="number"
                        placeholder="Amount"
                        value={editFormData.expense_amount}
                        onChange={(e) => setEditFormData({ ...editFormData, expense_amount: e.target.value })}
                        className="border rounded p-1"
                      />
                    ) : (
                      `${order.expenses.toLocaleString()} KES`
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <input
                        type="number"
                        placeholder="Rate %"
                        value={editFormData.commission_rate}
                        onChange={(e) => setEditFormData({ ...editFormData, commission_rate: e.target.value })}
                        className="border rounded p-1"
                      />
                    ) : (
                      `${order.commission.toLocaleString()} KES`
                    )}
                  </td>
                  <td className="px-4 py-2 text-green-600 font-semibold">
                    {revenue.toLocaleString()} KES
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveClick(order.id)}
                          className="bg-green-600 text-white px-2 py-1 rounded text-xs mr-2"
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
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrdersPage;
