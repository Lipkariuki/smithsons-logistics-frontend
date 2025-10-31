import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axiosAuth from "../../utils/axiosAuth"; // ✅ correct import
import Pagination from "../../components/Pagination";

const FUEL_TYPES = [
  { label: "Diesel", value: "diesel" },
  { label: "Petrol", value: "petrol" },
];
const DEFAULT_FUEL_PRICE = 198.75;

const AdminDashboard = () => {
  const createInitialFuelState = () => ({
    tripId: null,
    fuel_type: "diesel",
    price_per_litre: DEFAULT_FUEL_PRICE.toString(),
    amount: "",
    litres: 0,
    loading: false,
    error: "",
    success: "",
    hasExisting: false,
  });

  const [orders, setOrders] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [editRowId, setEditRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [fuelState, setFuelState] = useState(createInitialFuelState);

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
        setPage(1);
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

  const computeLitres = (amount, price) => {
    if (!Number.isFinite(amount) || !Number.isFinite(price) || price <= 0) {
      return 0;
    }
    return Number((amount / price).toFixed(3));
  };

  const loadFuelExpense = async (tripId) => {
    if (!tripId) {
      setFuelState(createInitialFuelState());
      return;
    }
    const base = createInitialFuelState();
    setFuelState({ ...base, tripId, loading: true });
    try {
      const res = await axiosAuth.get(`/trips/${tripId}/fuel`);
      const data = res.data || {};
      setFuelState({
        tripId,
        fuel_type: data.fuel_type || "diesel",
        price_per_litre:
          data.price_per_litre !== undefined && data.price_per_litre !== null
            ? String(data.price_per_litre)
            : DEFAULT_FUEL_PRICE.toString(),
        amount:
          data.amount !== undefined && data.amount !== null ? String(data.amount) : "",
        litres: Number(data.litres || 0),
        loading: false,
        error: "",
        success: "",
        hasExisting: true,
      });
    } catch (err) {
      if (err?.response?.status === 404) {
        setFuelState({ ...base, tripId });
      } else {
        const reason = err?.response?.data?.detail || err.message || "Unable to load fuel expense.";
        setFuelState({ ...base, tripId, error: reason });
      }
    }
  };

  const handleFuelFieldChange = (field, value) => {
    setFuelState((prev) => {
      const next = { ...prev, [field]: value, success: "", error: "" };
      const amount = parseFloat(field === "amount" ? value : prev.amount);
      const price = parseFloat(field === "price_per_litre" ? value : prev.price_per_litre);
      if (field === "amount" || field === "price_per_litre") {
        const litres = computeLitres(amount, price);
        next.litres = litres;
      }
      return next;
    });
  };

  const persistFuelExpense = async () => {
    const { tripId, fuel_type, amount, price_per_litre } = fuelState;
    if (!tripId) return;

    const amountNum = parseFloat(String(amount).replace(/,/g, ""));
    const priceNum = parseFloat(String(price_per_litre).replace(/,/g, ""));

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setFuelState((prev) => ({ ...prev, error: "Enter a valid fuel amount in KES." }));
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setFuelState((prev) => ({ ...prev, error: "Enter a valid price per litre." }));
      return;
    }

    const litres = computeLitres(amountNum, priceNum);

    setFuelState((prev) => ({ ...prev, loading: true, error: "", success: "" }));
    try {
      const res = await axiosAuth.post(`/trips/${tripId}/fuel`, {
        fuel_type,
        price_per_litre: priceNum,
        amount: amountNum,
        litres,
      });
      const data = res.data || {};
      setFuelState({
        tripId,
        fuel_type: data.fuel_type || fuel_type,
        price_per_litre:
          data.price_per_litre !== undefined && data.price_per_litre !== null
            ? String(data.price_per_litre)
            : String(priceNum),
        amount:
          data.amount !== undefined && data.amount !== null
            ? String(data.amount)
            : String(amountNum),
        litres: Number(data.litres ?? litres),
        loading: false,
        error: "",
        success: "Fuel expense saved.",
        hasExisting: true,
      });
      setOrders((prev) =>
        prev.map((order) =>
          order.trip_id === tripId
            ? {
                ...order,
                fuel_amount: data.amount ?? amountNum,
                fuel_price_per_litre: data.price_per_litre ?? priceNum,
                fuel_type: data.fuel_type ?? fuel_type,
                fuel_litres: data.litres ?? litres,
              }
            : order
        )
      );
      setEditFormData((prev) =>
        prev && prev.trip_id === tripId ? { ...prev, fuel_litres: data.litres ?? litres } : prev
      );
    } catch (err) {
      const reason = err?.response?.data?.detail || err.message || "Failed to save fuel expense.";
      setFuelState((prev) => ({ ...prev, loading: false, error: reason }));
    }
  };

  const deleteFuelExpense = async () => {
    const { tripId } = fuelState;
    if (!tripId) return;

    setFuelState((prev) => ({ ...prev, loading: true, error: "", success: "" }));
    try {
      await axiosAuth.delete(`/trips/${tripId}/fuel`);
      const base = createInitialFuelState();
      setFuelState({
        ...base,
        tripId,
        success: "Fuel expense removed.",
      });
      setOrders((prev) =>
        prev.map((order) =>
          order.trip_id === tripId
            ? {
                ...order,
                fuel_amount: 0,
                fuel_price_per_litre: null,
                fuel_type: null,
                fuel_litres: 0,
              }
            : order
        )
      );
      setEditFormData((prev) =>
        prev && prev.trip_id === tripId ? { ...prev, fuel_litres: "" } : prev
      );
    } catch (err) {
      const reason =
        err?.response?.data?.detail || err.message || "Failed to remove fuel expense.";
      setFuelState((prev) => ({ ...prev, loading: false, error: reason }));
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDrivers();
    fetchVehicles();
  }, []);

  const pagedOrders = useMemo(() => {
    const start = (page - 1) * perPage;
    return orders.slice(start, start + perPage);
  }, [orders, page, perPage]);

  const summary = useMemo(() => {
    const totals = orders.reduce(
      (acc, order) => {
        acc.tripRevenue += Number(order.total_amount || 0);
        acc.expenses += Number(order.expenses || 0);
        acc.commission += Number(order.commission || 0);
        acc.fuelTotal += Number(order.fuel_amount || 0);
        acc.fuelLitres += Number(order.fuel_litres || 0);
        return acc;
      },
      { tripRevenue: 0, expenses: 0, commission: 0, fuelTotal: 0, fuelLitres: 0 }
    );
    totals.netRevenue =
      totals.tripRevenue - totals.expenses - totals.commission - totals.fuelTotal;
    return totals;
  }, [orders]);

  const editingOrder = useMemo(
    () => (editRowId ? orders.find((o) => o.id === editRowId) : null),
    [editRowId, orders]
  );

  const currentFuelAmount = useMemo(() => {
    const parsed = parseFloat(String(fuelState.amount || "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }, [fuelState.amount]);

  const handleSaveClick = async (orderId) => {
    try {
      setError("");
      // Find the original order to compare values (e.g., revenue)
      const original = orders.find((o) => o.id === orderId) || {};

      // 1) Assign driver first (so revenue endpoint issues won't block assignment)
      if (editFormData.driver_id) {
        await axiosAuth.put(`/orders/${orderId}/assign-driver?driver_id=${editFormData.driver_id}`);
      }

      // 2) Assign vehicle next
      if (editFormData.vehicle_id) {
        await axiosAuth.put(`/orders/${orderId}/assign-vehicle?vehicle_id=${editFormData.vehicle_id}`);
      }

      // 3) Update revenue only if changed; do not block other updates if this fails
      const cleanedRevenue =
        typeof editFormData.revenue_amount === 'number'
          ? editFormData.revenue_amount
          : parseFloat(String(editFormData.revenue_amount || '').replace(/,/g, ''));
      const originalRevenue = Number(original.total_amount ?? NaN);
      const revenueChanged =
        editFormData.trip_id &&
        !Number.isNaN(cleanedRevenue) &&
        !Number.isNaN(originalRevenue) &&
        cleanedRevenue !== originalRevenue;

      if (revenueChanged) {
        try {
          await axiosAuth.patch(`/trips/${editFormData.trip_id}/revenue`, {
            revenue: cleanedRevenue,
            reason: 'Admin manual adjustment',
          });
        } catch (e) {
          // Fallback if backend does not allow PATCH on this route
          if (e?.response?.status === 405) {
            try {
              await axiosAuth.put(`/trips/${editFormData.trip_id}/revenue`, {
                revenue: cleanedRevenue,
                reason: 'Admin manual adjustment',
              });
            } catch (e2) {
              console.warn('Revenue update failed (PUT fallback):', e2);
              // Do not throw; continue with the rest to avoid blocking assignments
            }
          } else {
            console.warn('Revenue update failed (PATCH):', e);
            // Do not throw; continue with the rest to avoid blocking assignments
          }
        }
      }

      // 4) Add expense (optional)
      if (editFormData.expense_amount && editFormData.trip_id) {
        const amt = parseFloat(String(editFormData.expense_amount).replace(/,/g, ''));
        if (Number.isFinite(amt) && amt > 0) {
          await axiosAuth.post("/expenses/", {
            trip_id: editFormData.trip_id,
            amount: amt,
            description: editFormData.expense_description,
          });
        } else {
          console.warn('Skipped expense: invalid amount', editFormData.expense_amount);
        }
      }

      // 5) Update commission rate (optional)
      if (
        editFormData.commission_rate !== undefined &&
        editFormData.trip_id &&
        String(editFormData.commission_rate).trim() !== ""
      ) {
        const rate = parseFloat(String(editFormData.commission_rate));
        if (Number.isFinite(rate)) {
          // Try PATCH body first
          let updated = false;
          try {
            await axiosAuth.patch(`/commissions/${editFormData.trip_id}`, { rate_percent: rate });
            updated = true;
          } catch (e1) {
            if (e1?.response?.status === 405 || e1?.response?.status === 404) {
              try {
                // Fallback to PUT with params (previous behavior)
                await axiosAuth.put(`/commissions/${editFormData.trip_id}`, null, {
                  params: { rate_percent: rate },
                });
                updated = true;
              } catch (e2) {
                try {
                  // Final fallback: trip-scoped endpoint
                  await axiosAuth.put(`/trips/${editFormData.trip_id}/commission`, { rate_percent: rate });
                  updated = true;
                } catch (e3) {
                  console.warn('Commission update failed (all attempts):', e1, e2, e3);
                }
              }
            } else {
              console.warn('Commission update failed (PATCH):', e1);
            }
          }
          if (!updated) {
            // Non-blocking warning; proceed
          }
        } else {
          console.warn('Skipped commission update: invalid rate', editFormData.commission_rate);
        }
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
      commission_rate: "",
      trip_id: order.trip_id,
      revenue_amount: order.total_amount ?? "",
      fuel_litres: order.fuel_litres ?? "",
    });
    loadFuelExpense(order.trip_id);
  };

  const handleCancelClick = () => {
    setEditRowId(null);
    setEditFormData({});
    setFuelState(createInitialFuelState());
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-purple-700">Admin Dashboards</h1>
            <p className="text-sm text-gray-500">Overview of orders and financial performance</p>
          </div>
          <div className="text-right">
            <div className="text-base font-semibold text-purple-700">Smithsons Logistics</div>
            <div className="text-xs text-gray-500">Powering Every Trip. Empowering Every Partner.</div>
          </div>
        </div>
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
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-xl border-l-4 border-purple-500 shadow px-6 py-4">
            <h3 className="text-sm text-gray-500">Trip Revenue</h3>
            <p className="text-2xl font-semibold text-purple-700">{summary.tripRevenue.toLocaleString()} KES</p>
          </div>
          <div className="bg-white rounded-xl border-l-4 border-purple-500 shadow px-6 py-4">
            <h3 className="text-sm text-gray-500">Expenses</h3>
            <p className="text-2xl font-semibold text-red-600">{summary.expenses.toLocaleString()} KES</p>
          </div>
          <div className="bg-white rounded-xl border-l-4 border-purple-500 shadow px-6 py-4">
            <h3 className="text-sm text-gray-500">Fuel Expense</h3>
            <p className="text-2xl font-semibold text-orange-500">
              {summary.fuelTotal.toLocaleString()} KES
            </p>
          </div>
          <div className="bg-white rounded-xl border-l-4 border-purple-500 shadow px-6 py-4">
            <h3 className="text-sm text-gray-500">Net Revenue</h3>
            <p className="text-2xl font-semibold text-green-600">
              {summary.netRevenue.toLocaleString()} KES
            </p>
            <p className="text-xs text-gray-500 mt-1">
              After expenses, commissions, and fuel deductions.
            </p>
          </div>
          <div className="bg-white rounded-xl border-l-4 border-purple-500 shadow px-6 py-4">
            <h3 className="text-sm text-gray-500">Fuel Allocation</h3>
            <p className="text-2xl font-semibold text-blue-600">{summary.fuelLitres.toLocaleString()} L</p>
          </div>
        </section>

        {editingOrder && (
          <section className="bg-white rounded-xl border border-purple-100 shadow px-6 py-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-purple-700">Fuel Calculator</h2>
                <p className="text-sm text-gray-500">
                  Capture fuel spend for this trip. Litres update in real time from the amount and price.
                </p>
              </div>
              <div className="text-sm text-gray-500 bg-purple-50 border border-purple-100 px-3 py-1 rounded-md self-start">
                Trip #{editingOrder.trip_id || "—"} · Order {editingOrder.order_number || editingOrder.id}
              </div>
            </div>
            {fuelState.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
                {fuelState.error}
              </div>
            )}
            {fuelState.success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded">
                {fuelState.success}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Fuel type
                </label>
                <select
                  className="border rounded px-3 py-2 text-sm"
                  value={fuelState.fuel_type}
                  onChange={(e) => handleFuelFieldChange("fuel_type", e.target.value)}
                  disabled={fuelState.loading}
                >
                  {FUEL_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Price per litre (KES)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className="border rounded px-3 py-2 text-sm"
                  value={fuelState.price_per_litre}
                  onChange={(e) => handleFuelFieldChange("price_per_litre", e.target.value)}
                  disabled={fuelState.loading}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Fuel amount (KES)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className="border rounded px-3 py-2 text-sm"
                  value={fuelState.amount}
                  onChange={(e) => handleFuelFieldChange("amount", e.target.value)}
                  disabled={fuelState.loading}
                  placeholder="e.g. 6,500"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Litres (calculated)
                </label>
                <div className="border rounded px-3 py-2 bg-gray-50 flex items-baseline justify-between">
                  <span className="text-lg font-semibold text-gray-800">
                    {fuelState.litres
                      ? Number(fuelState.litres).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 3,
                        })
                      : "0.000"}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-gray-500">L</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
              <button
                type="button"
                onClick={persistFuelExpense}
                disabled={fuelState.loading}
                className="inline-flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded"
              >
                {fuelState.loading
                  ? "Saving…"
                  : fuelState.hasExisting
                  ? "Update fuel expense"
                  : "Save fuel expense"}
              </button>
              {fuelState.hasExisting && (
                <button
                  type="button"
                  onClick={deleteFuelExpense}
                  disabled={fuelState.loading}
                  className="inline-flex items-center justify-center border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-60 text-sm font-medium px-4 py-2 rounded"
                >
                  Remove fuel expense
                </button>
              )}
              <div className="text-sm text-gray-500 sm:ml-auto">
                Net revenue impact:{" "}
                <span className="font-semibold text-red-600">
                  -KES {currentFuelAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </section>
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
          <div className="min-w-[1200px] max-h-[70vh] overflow-auto">
          <table className="w-full table-auto text-sm">
          <thead className="sticky top-0 z-10 bg-white">
          <tr className="text-left border-b bg-gray-100 text-gray-600">
            <th className="py-2 px-4">Order ID</th>
            <th className="py-2 px-4">DHL Order #</th>
            <th className="py-2 px-4">Invoice</th>
            <th className="py-2 px-4">Product</th>
            <th className="py-2 px-4">Destination</th>
            <th className="py-2 px-4">Fuel (L)</th>
            <th className="py-2 px-4">Fuel Expense</th>
            <th className="py-2 px-4">Fuel Type</th>
            <th className="py-2 px-4">Driver</th>
            <th className="py-2 px-4">Vehicle</th>
            <th className="py-2 px-4">Trip Revenue</th>
            <th className="py-2 px-4">Expenses</th>
            <th className="py-2 px-4">Commission</th>
            <th className="py-2 px-4">Revenue</th>
            <th className="py-2 px-4">Actions</th>
          </tr>
        </thead>

            <tbody>
              {pagedOrders.map((order) => {
                const fuelAmount = Number(order.fuel_amount || 0);
                const revenue =
                  Number(order.total_amount || 0) -
                  Number(order.expenses || 0) -
                  Number(order.commission || 0) -
                  fuelAmount;
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
                      {Number(order.fuel_litres || 0).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2 px-4">
                      {Number(order.fuel_amount || 0) > 0
                        ? `${Number(order.fuel_amount || 0).toLocaleString()} KES`
                        : "—"}
                    </td>
                    <td className="py-2 px-4 uppercase text-xs">
                      {order.fuel_type ? order.fuel_type : "—"}
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
                    <td className="py-2 px-4">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Trip revenue (KES)"
                          value={editFormData.revenue_amount ?? ""}
                          onChange={(e) => setEditFormData({ ...editFormData, revenue_amount: e.target.value })}
                          className="border rounded px-3 py-1 w-40"
                        />
                      ) : (
                        (order.total_amount || 0).toLocaleString()
                      )}
                    </td>
                    <td className="py-2 px-4">
                      {isEditing ? (
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                          <div className="flex-1 min-w-[12rem]">
                            <label className="block text-xs text-gray-500 mb-1">Expense amount (KES)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="e.g. 3,500"
                              value={editFormData.expense_amount}
                              onChange={(e) => setEditFormData({ ...editFormData, expense_amount: e.target.value })}
                              className="border rounded px-3 py-2 w-full text-sm md:text-base"
                            />
                          </div>
                          <div className="flex-[2] min-w-[16rem]">
                            <label className="block text-xs text-gray-500 mb-1">Description</label>
                            <input
                              type="text"
                              placeholder="e.g. Fuel, tolls, maintenance..."
                              value={editFormData.expense_description}
                              onChange={(e) => setEditFormData({ ...editFormData, expense_description: e.target.value })}
                              className="border rounded px-3 py-2 w-full text-sm md:text-base"
                            />
                          </div>
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
                        order.commission.toLocaleString()
                      )}
                    </td>
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
          </div>
          <Pagination
            page={page}
            perPage={perPage}
            total={orders.length}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
