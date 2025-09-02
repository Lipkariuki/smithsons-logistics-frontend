import React, { useEffect, useState } from "react";
import axios from "../utils/axiosAuth"; // ✅ use the shared axios instance

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState("order"); // 'order' or 'trip'
  const [formData, setFormData] = useState({
    order_number: "",
    trip_id: "",
    amount: "",
    description: "",
  });
  const [orderOptions, setOrderOptions] = useState([]);
  const [orderQueryTimer, setOrderQueryTimer] = useState(null);
  const [searching, setSearching] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fetchExpenses = () => {
    axios
      .get("/expenses/")
      .then((res) => setExpenses(res.data))
      .catch((err) => console.error("Failed to fetch expenses:", err));
  };

  const fetchOrderOptions = async (q) => {
    try {
      setSearching(true);
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      params.set("limit", "50");
      const res = await axios.get(`/admin/orders?${params.toString()}`);
      const data = Array.isArray(res.data) ? res.data : [];
      setOrderOptions(data);
    } catch (err) {
      console.error("Failed to load order options:", err);
      setOrderOptions([]);
    } finally {
      setSearching(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitError("");
      const amountNum = Number(formData.amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        setSubmitError("Please enter a valid amount greater than 0.");
        return;
      }

      const payload = {
        amount: amountNum,
        description: formData.description || undefined,
      };
      if (mode === "order") {
        const on = formData.order_number?.trim();
        if (!on) {
          setSubmitError("Order number is required.");
          return;
        }
        payload.order_number = on;
      } else {
        const tid = formData.trip_id ? parseInt(formData.trip_id, 10) : NaN;
        if (!Number.isInteger(tid) || tid <= 0) {
          setSubmitError("Valid trip ID is required.");
          return;
        }
        payload.trip_id = tid;
      }
      await axios.post("/expenses/", payload);
      setFormData({ order_number: "", trip_id: "", amount: "", description: "" });
      setShowForm(false);
      fetchExpenses();
    } catch (err) {
      console.error("Failed to submit expense:", err);
      const reason = err.response?.data?.detail || err.message || "Unknown error";
      setSubmitError(`Failed to submit expense: ${reason}`);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    if (!(showForm && mode === "order")) return;
    const q = formData.order_number?.trim();
    if (!q || q.length < 2) {
      setOrderOptions([]);
      setSearching(false);
      return;
    }
    if (orderQueryTimer) clearTimeout(orderQueryTimer);
    const t = setTimeout(() => fetchOrderOptions(q), 250);
    setOrderQueryTimer(t);
    return () => clearTimeout(t);
  }, [showForm, mode, formData.order_number]);

  const normalizeOrderNumber = (input) => {
    if (!input) return "";
    return input.trim(); // gentle normalization; keep original pattern
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-purple-700">Trip Expenses</h1>
        <button
          className="bg-purple-700 text-white px-4 py-2 rounded"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "Add Expense"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleFormSubmit}
          className="bg-white rounded-lg shadow p-4 mb-6 space-y-4"
        >
          {submitError && (
            <div className="text-sm text-red-600">{submitError}</div>
          )}
          <div className="flex gap-4 items-center">
            <label className="text-sm text-gray-600">Add by:</label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="mode" value="order" checked={mode === "order"} onChange={() => setMode("order")} />
              DHL Order #
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="mode" value="trip" checked={mode === "trip"} onChange={() => setMode("trip")} />
              Trip ID
            </label>
          </div>
          {mode === "order" ? (
            <div>
              <label className="block text-sm text-gray-600">DHL Order Number</label>
              <div className="relative">
                <input
                  type="text"
                  list="orderNumbers"
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: normalizeOrderNumber(e.target.value) })}
                  required
                  className="w-full border rounded px-3 py-2 pr-9"
                  placeholder="e.g. ord-2025-102"
                />
                {searching && (
                  <svg className="animate-spin h-4 w-4 text-gray-500 absolute right-3 top-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                )}
              </div>
              <datalist id="orderNumbers">
                {orderOptions.slice(0, 50).map((o) => (
                  <option key={o.id} value={o.order_number}>
                    {o.order_number} — {o.destination || ""} {o.invoice_number ? `(Inv ${o.invoice_number})` : ""}
                  </option>
                ))}
              </datalist>
              <p className="text-xs text-gray-500 mt-1">Type to search recent orders or paste a full reference.</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-600">Trip ID</label>
              <input
                type="number"
                value={formData.trip_id}
                onChange={(e) => setFormData({ ...formData, trip_id: e.target.value })}
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600">Amount (KES)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="optional"
            />
          </div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
            Submit
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
        {expenses.length > 0 ? (
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-gray-100 text-left text-gray-600">
              <tr>
                <th className="py-2 px-4">Trip ID</th>
                <th className="py-2 px-4">Vehicle Plate</th>
                <th className="py-2 px-4">Destination</th>
                <th className="py-2 px-4">Amount (KES)</th>
                <th className="py-2 px-4">Description</th>
                <th className="py-2 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-t text-gray-700">
                  <td className="py-2 px-4">{exp.trip_id}</td>
                  <td className="py-2 px-4">{exp.vehicle_plate || "-"}</td>
                  <td className="py-2 px-4">{exp.destination || "-"}</td>
                  <td className="py-2 px-4">{exp.amount.toLocaleString()}</td>
                  <td className="py-2 px-4">{exp.description}</td>
                  <td className="py-2 px-4">
                    {new Date(exp.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 text-sm">No expenses found.</p>
        )}
      </div>
    </div>
  );
};

export default ExpensesPage;
