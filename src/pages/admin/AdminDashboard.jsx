import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axiosAuth from "../../utils/axiosAuth"; // ✅ correct import
import Pagination from "../../components/Pagination";

const FUEL_TYPES = [
  { label: "Diesel", value: "diesel" },
  { label: "Petrol", value: "petrol" },
];
const DEFAULT_FUEL_PRICE = 171.0;
const CURRENT_MONTH_KEY = new Date().toISOString().slice(0, 7);

const getMonthKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const formatMonthLabel = (monthKey) => {
  if (!monthKey) return "All time";
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
};

const getMonthBounds = (monthKey) => {
  if (!monthKey) return { start: "", end: "" };
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const toIso = (value) => value.toISOString().slice(0, 10);
  return { start: toIso(start), end: toIso(end) };
};

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
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH_KEY);
  const [fuelSummaryTotal, setFuelSummaryTotal] = useState(0);
  const [expenseSummaryTotal, setExpenseSummaryTotal] = useState(0);

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

  const availableMonths = useMemo(() => {
    const values = Array.from(new Set(orders.map((order) => getMonthKey(order.date)).filter(Boolean)));
    const sorted = values.sort((a, b) => b.localeCompare(a));
    if (!sorted.includes(CURRENT_MONTH_KEY)) {
      sorted.unshift(CURRENT_MONTH_KEY);
    }
    return sorted;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    if (!selectedMonth) return orders;
    return orders.filter((order) => getMonthKey(order.date) === selectedMonth);
  }, [orders, selectedMonth]);

  const pagedOrders = useMemo(() => {
    const start = (page - 1) * perPage;
    return visibleOrders.slice(start, start + perPage);
  }, [visibleOrders, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [selectedMonth]);

  useEffect(() => {
    let mounted = true;
    const periodParams = { page: 1, per_page: 1 };
    if (selectedMonth) {
      const { start, end } = getMonthBounds(selectedMonth);
      periodParams.start_date = start;
      periodParams.end_date = end;
    }

    Promise.all([
      axiosAuth.get("/expenses/", { params: { ...periodParams, kind: "fuel" } }),
      axiosAuth.get("/expenses/", { params: { ...periodParams, kind: "other" } }),
    ])
      .then(([fuelRes, expenseRes]) => {
        if (!mounted) return;
        setFuelSummaryTotal(Number(fuelRes.data?.total_amount || 0));
        setExpenseSummaryTotal(Number(expenseRes.data?.total_amount || 0));
      })
      .catch(() => {
        if (!mounted) return;
        setFuelSummaryTotal(0);
        setExpenseSummaryTotal(0);
      });

    return () => {
      mounted = false;
    };
  }, [selectedMonth]);

  const summary = useMemo(() => {
    const totals = visibleOrders.reduce(
      (acc, order) => {
        acc.tripRevenue += Number(order.total_amount || 0);
        acc.commission += Number(order.commission || 0);
        return acc;
      },
      { tripRevenue: 0, commission: 0 }
    );
    totals.netRevenue =
      totals.tripRevenue - expenseSummaryTotal - totals.commission - fuelSummaryTotal;
    return totals;
  }, [visibleOrders, expenseSummaryTotal, fuelSummaryTotal]);

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
    <div className="app-page">
      <section className="app-hero">
        <h1 className="app-title">Admin Dashboard</h1>
        <p className="app-subtitle">Overview of orders, fuel, expenses, and financial performance.</p>
      </section>

      <section className="app-card-soft p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-violet-500">Period</div>
            <div className="mt-2 text-2xl font-semibold text-violet-950">
              {selectedMonth ? formatMonthLabel(selectedMonth) : "All Time"}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-xs font-medium text-violet-700">View</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="app-select min-w-[15rem]"
            >
              <option value="">All time</option>
              {availableMonths.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {formatMonthLabel(monthKey)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <main className="space-y-6">
        {message && (
          <div className="app-alert-success">
            {message}
          </div>
        )}
        {error && (
          <div className="app-alert-error">
            {error}
          </div>
        )}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="app-stat-card">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
            <h3 className="app-stat-label">Trip Revenue</h3>
            <p className="text-2xl font-semibold text-violet-800">{summary.tripRevenue.toLocaleString()} KES</p>
          </div>
          <div className="app-stat-card">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-rose-400 to-rose-500" />
            <h3 className="app-stat-label">Expenses</h3>
            <p className="text-2xl font-semibold text-red-600">{expenseSummaryTotal.toLocaleString()} KES</p>
          </div>
          <div className="app-stat-card">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
            <h3 className="app-stat-label">Fuel Expense</h3>
            <p className="text-2xl font-semibold text-orange-500">
              {fuelSummaryTotal.toLocaleString()} KES
            </p>
          </div>
          <div className="app-stat-card">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-400 to-green-500" />
            <h3 className="app-stat-label">Net Revenue</h3>
            <p className="text-2xl font-semibold text-green-600">
              {summary.netRevenue.toLocaleString()} KES
            </p>
            <p className="mt-1 text-xs text-violet-500">
              After expenses, commissions, and fuel deductions.
            </p>
          </div>
        </section>

        {editingOrder && (
          <section className="app-card p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div>
                <h2 className="app-section-title">Fuel Calculator</h2>
                <p className="text-sm text-violet-600">
                  Capture fuel spend for this trip. Litres update in real time from the amount and price.
                </p>
              </div>
              <div className="self-start rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-1 text-sm text-violet-600">
                Trip #{editingOrder.trip_id || "—"} · Order {editingOrder.order_number || editingOrder.id}
              </div>
            </div>
            {fuelState.error && (
              <div className="app-alert-error">
                {fuelState.error}
              </div>
            )}
            {fuelState.success && (
              <div className="app-alert-success">
                {fuelState.success}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-violet-600 uppercase mb-1">
                  Fuel type
                </label>
                <select
                  className="app-select text-sm"
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
                <label className="text-xs font-semibold text-violet-600 uppercase mb-1">
                  Price per litre (KES)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className="app-input text-sm"
                  value={fuelState.price_per_litre}
                  onChange={(e) => handleFuelFieldChange("price_per_litre", e.target.value)}
                  disabled={fuelState.loading}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-violet-600 uppercase mb-1">
                  Fuel amount (KES)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  className="app-input text-sm"
                  value={fuelState.amount}
                  onChange={(e) => handleFuelFieldChange("amount", e.target.value)}
                  disabled={fuelState.loading}
                  placeholder="e.g. 6,500"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-violet-600 uppercase mb-1">
                  Litres (calculated)
                </label>
                <div className="flex items-baseline justify-between rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2">
                  <span className="text-lg font-semibold text-violet-950">
                    {fuelState.litres
                      ? Number(fuelState.litres).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 3,
                        })
                      : "0.000"}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-violet-500">L</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
              <button
                type="button"
                onClick={persistFuelExpense}
                disabled={fuelState.loading}
                className="app-button-primary disabled:opacity-60"
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
                  className="app-button-danger disabled:opacity-60"
                >
                  Remove fuel expense
                </button>
              )}
              <div className="text-sm text-violet-600 sm:ml-auto">
                Net revenue impact:{" "}
                <span className="font-semibold text-red-600">
                  -KES {currentFuelAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/admin/finance" className="app-card block px-6 py-4 transition hover:shadow-[0_18px_40px_-20px_rgba(88,28,135,0.55)]">
            <h3 className="text-lg font-bold text-violet-950">Financial Dashboard</h3>
            <p className="text-sm text-violet-600">View revenue, commissions, and expense summaries.</p>
          </Link>
          <Link to="/admin/orders" className="app-card block px-6 py-4 transition hover:shadow-[0_18px_40px_-20px_rgba(88,28,135,0.55)]">
            <h3 className="text-lg font-bold text-violet-950">Orders Dashboard</h3>
            <p className="text-sm text-violet-600">Browse all raw orders, truck assignments, and trip statuses.</p>
          </Link>
          <Link to="/admin/fleet" className="app-card block px-6 py-4 transition hover:shadow-[0_18px_40px_-20px_rgba(88,28,135,0.55)]">
            <h3 className="text-lg font-bold text-violet-950">Fleet</h3>
            <p className="text-sm text-violet-600">Owners and vehicles with search, filters, and export.</p>
          </Link>
        </section>

        {/* Orders Table */}
        <section className="app-card p-4 overflow-x-auto">
          <h2 className="app-section-title mb-4">Orders</h2>
          <div className="min-w-[1200px] max-h-[70vh] overflow-auto">
          <table className="app-table w-full table-auto">
          <thead className="sticky top-0 z-10">
          <tr className="text-left border-b border-violet-100">
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
                  <tr key={order.id} className="text-slate-700">
                    <td className="py-2 px-4">{order.id}</td>
                    <td className="py-2 px-4 font-bold text-violet-700">{order.order_number}</td>

                    <td className="py-2 px-4">{order.invoice_number}</td>
                    <td className="py-2 px-4">
                      {isEditing ? (
                        <input
                          value={editFormData.product_description}
                          onChange={(e) => setEditFormData({ ...editFormData, product_description: e.target.value })}
                          className="app-input w-full p-1"
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
                          className="app-input w-full p-1"
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
                          className="app-select w-full p-1"
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
                          className="app-select w-full p-1"
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
                          className="app-input w-40 px-3 py-1"
                        />
                      ) : (
                        (order.total_amount || 0).toLocaleString()
                      )}
                    </td>
                    <td className="py-2 px-4">
                      {isEditing ? (
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                          <div className="flex-1 min-w-[12rem]">
                            <label className="mb-1 block text-xs text-violet-500">Expense amount (KES)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="e.g. 3,500"
                              value={editFormData.expense_amount}
                              onChange={(e) => setEditFormData({ ...editFormData, expense_amount: e.target.value })}
                              className="app-input w-full text-sm md:text-base"
                            />
                          </div>
                          <div className="flex-[2] min-w-[16rem]">
                            <label className="mb-1 block text-xs text-violet-500">Description</label>
                            <input
                              type="text"
                              placeholder="e.g. Fuel, tolls, maintenance..."
                              value={editFormData.expense_description}
                              onChange={(e) => setEditFormData({ ...editFormData, expense_description: e.target.value })}
                              className="app-input w-full text-sm md:text-base"
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
                          className="app-input w-full p-1"
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
                            className="app-button-primary px-2 py-1 text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelClick}
                            className="app-button-secondary px-2 py-1 text-xs"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEditClick(order)}
                          className="font-medium text-violet-700 hover:text-violet-900"
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
            total={visibleOrders.length}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
