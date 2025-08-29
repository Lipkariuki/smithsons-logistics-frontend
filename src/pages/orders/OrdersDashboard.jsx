import React, { useEffect, useState } from "react";
import axiosAuth from "../../utils/axiosAuth";

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [editRowId, setEditRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [createForm, setCreateForm] = useState({
    order_number: "",
    purchase_order_number: "",
    dispatch_note_number: "",
    date: "",
    product_type: "",
    product_description: "",
    truck_plate: "",
    destination: "",
    cases: "",
    price_per_case: ""
  });

  const fetchOrders = () => {
    axiosAuth.get("/admin/orders")
      .then((res) => {
        const sortedOrders = res.data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setOrders(sortedOrders);
        setFilteredOrders(sortedOrders);
      })
      .catch((err) => console.error("Fetch orders failed:", err));
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

  const fetchDropdownMetadata = async () => {
    try {
      const res = await axiosAuth.get("/metadata");
      setProductTypes(res.data.product_types || []);
      setDestinations(res.data.destinations || []);
    } catch (err) {
      console.error("Failed to load metadata:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDrivers();
    fetchVehicles();
    fetchDropdownMetadata();
  }, []);

  const handleCreateChange = (e) => {
    setCreateForm({ ...createForm, [e.target.name]: e.target.value });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const payload = {
        ...createForm,
        date: createForm.date || null,
        cases: createForm.cases ? parseInt(createForm.cases) : 0,
        price_per_case: createForm.price_per_case ? parseFloat(createForm.price_per_case) : 0
      };

      await axiosAuth.post("/orders/", payload);
      setCreateForm({
        order_number: "",
        purchase_order_number: "",
        dispatch_note_number: "",
        date: "",
        product_type: "",
        product_description: "",
        truck_plate: "",
        destination: "",
        cases: "",
        price_per_case: ""
      });
      setShowCreateForm(false);
      fetchOrders();
      setMessage("Order created successfully.");
    } catch (err) {
      const reason = err.response?.data?.detail || err.message;
      setError(`Failed to create order: ${reason}`);
    }
  };

  const handleSaveClick = async (orderId) => {
    try {
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
          description: editFormData.expense_description
        });
      }
      if (editFormData.commission_rate && editFormData.trip_id) {
        await axiosAuth.put(`/commissions/${editFormData.trip_id}`, null, {
          params: {
            rate_percent: parseFloat(editFormData.commission_rate)
          }
        });
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
      product_description: order.product_description,
      destination: order.destination,
      driver_id: "",
      vehicle_id: "",
      expense_amount: "",
      expense_description: "",
      commission_rate: "",
      trip_id: order.trip_id
    });
  };

  const handleCancelClick = () => {
    setEditRowId(null);
    setEditFormData({});
  };

  const handleDateFilterChange = (e) => {
    const selectedDate = e.target.value;
    setDateFilter(selectedDate);
    if (selectedDate) {
      const filtered = orders.filter((order) =>
        order.date === selectedDate
      );
      setFilteredOrders(filtered);
    } else {
      setFilteredOrders(orders);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Order ID",
      "DHL Order #",
      "Product",
      "Destination",
      "Driver",
      "Vehicle",
      "Expenses",
      "Commission"
    ];
    const rows = filteredOrders.map((order) => [
      order.date,
      order.id,
      order.order_number,
      order.product_description,
      order.destination,
      order.driver_name || "Unassigned",
      order.truck_plate || "Unassigned",
      `${order.expenses.toLocaleString()} KES`,
      `${order.commission.toLocaleString()} KES`
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "orders_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">Admin Orders</h1>
      {message && <div className="text-green-600 mb-2">{message}</div>}
      {error && <div className="text-red-600 mb-2">{error}</div>}

      <button
        onClick={() => setShowCreateForm(!showCreateForm)}
        className="mb-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
      >
        {showCreateForm ? "Close Order Form" : "Create New Order"}
      </button>

      {showCreateForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-white p-4 rounded border"
        >
          <input
            name="order_number"
            placeholder="ORDER NUMBER"
            value={createForm.order_number}
            onChange={handleCreateChange}
            required
            className="p-2 border rounded"
          />
          <input
            name="purchase_order_number"
            placeholder="PO NUMBER"
            value={createForm.purchase_order_number}
            onChange={handleCreateChange}
            className="p-2 border rounded"
          />
          <input
            name="dispatch_note_number"
            placeholder="DISPATCH NOTE"
            value={createForm.dispatch_note_number}
            onChange={handleCreateChange}
            className="p-2 border rounded"
          />
          <input
            type="date"
            name="date"
            value={createForm.date}
            onChange={handleCreateChange}
            className="p-2 border rounded"
          />
          <select
            name="product_type"
            value={createForm.product_type}
            onChange={handleCreateChange}
            className="p-2 border rounded"
          >
            <option value="">Select Product Type</option>
            {productTypes.map((type, idx) => (
              <option key={idx} value={type}>{type}</option>
            ))}
          </select>
          <input
            name="product_description"
            placeholder="PRODUCT DESCRIPTION"
            value={createForm.product_description}
            onChange={handleCreateChange}
            className="p-2 border rounded"
          />
          <select
            name="destination"
            value={createForm.destination}
            onChange={handleCreateChange}
            className="p-2 border rounded"
          >
            <option value="">Select Destination</option>
            {destinations.map((dest, idx) => (
              <option key={idx} value={dest}>{dest}</option>
            ))}
          </select>
          <input
            name="cases"
            placeholder="CASES"
            value={createForm.cases}
            onChange={handleCreateChange}
            className="p-2 border rounded"
          />
          <input
            name="price_per_case"
            placeholder="PRICE PER CASE"
            value={createForm.price_per_case}
            onChange={handleCreateChange}
            className="p-2 border rounded"
          />
          <select
            name="truck_plate"
            value={createForm.truck_plate}
            onChange={handleCreateChange}
            className="p-2 border rounded"
          >
            <option value="">Select Truck/Van</option>
            {availableVehicles.map((v) => (
              <option key={v.id} value={v.plate_number}>{v.plate_number}</option>
            ))}
          </select>
          <button
            type="submit"
            className="col-span-1 md:col-span-2 bg-green-600 text-white p-2 rounded hover:bg-green-700"
          >
            Submit Order
          </button>
        </form>
      )}

      <div className="mb-4 flex items-center gap-4">
        <input
          type="date"
          value={dateFilter}
          onChange={handleDateFilterChange}
          className="p-2 border rounded"
          placeholder="Filter by Date"
        />
        <button
          onClick={exportToCSV}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Export to CSV
        </button>
      </div>

      <section className="bg-white shadow rounded-lg p-4 overflow-x-auto">
        <table className="min-w-full table-auto text-sm">
          <thead>
            <tr className="text-left border-b bg-gray-100 text-gray-600">
              <th className="py-2 px-4">Date</th>
              <th className="py-2 px-4">Order ID</th>
              <th className="py-2 px-4">DHL Order #</th>
              <th className="py-2 px-4">Product</th>
              <th className="py-2 px-4">Destination</th>
              <th className="py-2 px-4">Driver</th>
              <th className="py-2 px-4">Vehicle</th>
              <th className="py-2 px-4">Expenses</th>
              <th className="py-2 px-4">Commission</th>
              <th className="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const isEditing = editRowId === order.id;

              return (
                <tr key={order.id} className="border-t hover:bg-gray-50 text-gray-700">
                  <td className="py-2 px-4">{order.date}</td>
                  <td className="py-2 px-4">{order.id}</td>
                  <td className="py-2 px-4 font-bold text-purple-700">{order.order_number}</td>
                  <td className="py-2 px-4">{order.product_description}</td>
                  <td className="py-2 px-4">{order.destination}</td>
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
                  <td className="py-2 px-4">
                    {isEditing ? (
                      <input
                        type="number"
                        placeholder="%"
                        value={editFormData.commission_rate}
                        onChange={(e) => setEditFormData({ ...editFormData, commission_rate: e.target.value })}
                        className="w-full p-1 border rounded"
                      />
                    ) : (
                      `${order.commission.toLocaleString()} KES`
                    )}
                  </td>
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
    </div>
  );
};

export default AdminOrdersPage;