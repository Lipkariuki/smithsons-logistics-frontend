import React, { useEffect, useState } from "react";
import axiosAuth from "../../utils/axiosAuth";

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [editRowId, setEditRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    order_number: "",
    invoice_number: "",
    purchase_order_number: "",
    dispatch_note_number: "",
    date: "",
    product_type: "",
    product_description: "",
    truck_plate: "",
    destination: "",
    cases: "",
    price_per_case: "",
    total_amount: "",
  });

  useEffect(() => {
    fetchOrders();
    fetchDrivers();
    fetchVehicles();
    fetchDropdownMetadata();
  }, []);

  const fetchOrders = () => {
    axiosAuth.get("/admin/orders")
      .then((res) => setOrders(res.data))
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
      const res = await axiosAuth.get("/metadata"); // Adjust this endpoint if needed
      setProductTypes(res.data.product_types || []);
      setDestinations(res.data.destinations || []);
    } catch (err) {
      console.error("Failed to load metadata:", err);
    }
  };

  const handleCreateChange = (e) => {
    setCreateForm({ ...createForm, [e.target.name]: e.target.value });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...createForm,
        date: createForm.date || null,
        cases: createForm.cases ? parseInt(createForm.cases) : 0,
        price_per_case: createForm.price_per_case ? parseFloat(createForm.price_per_case) : 0,
        total_amount: createForm.total_amount ? parseFloat(createForm.total_amount) : 0,
      };

      await axiosAuth.post("/orders/", payload);
      setCreateForm({
        order_number: "",
        invoice_number: "",
        purchase_order_number: "",
        dispatch_note_number: "",
        date: "",
        product_type: "",
        product_description: "",
        truck_plate: "",
        destination: "",
        cases: "",
        price_per_case: "",
        total_amount: "",
      });
      setShowCreateForm(false);
      fetchOrders();
    } catch (err) {
      console.error("Create order failed:", err.response?.data || err.message);
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
      if (
        editFormData.expense_amount &&
        editFormData.trip_id !== null &&
        editFormData.trip_id !== undefined
      ) {
        await axiosAuth.post("/expenses/", {
          trip_id: editFormData.trip_id,
          amount: parseFloat(editFormData.expense_amount),
          description: editFormData.expense_description,
        });
      }
      if (
        editFormData.commission_rate &&
        editFormData.trip_id !== null &&
        editFormData.trip_id !== undefined
      ) {
        await axiosAuth.put(
          `/commissions/${editFormData.trip_id}`,
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

      <button
        onClick={() => setShowCreateForm(!showCreateForm)}
        className="mb-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
      >
        {showCreateForm ? "Close Order Form" : "Create New Order"}
      </button>

      {showCreateForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded border"
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
            name="invoice_number"
            placeholder="INVOICE NUMBER"
            value={createForm.invoice_number}
            onChange={handleCreateChange}
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
          <input
            name="total_amount"
            placeholder="TOTAL AMOUNT"
            value={createForm.total_amount}
            onChange={handleCreateChange}
            className="p-2 border rounded"
          />
          <select
            name="truck_plate"
            value={createForm.truck_plate}
            onChange={handleCreateChange}
            className="p-2 border rounded"
          >
            <option value="">Select Truck</option>
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

      {/* The rest of your table code remains unchanged */}
    </div>
  );
};

export default AdminOrdersPage;
