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

  const fetchExpenses = () => {
    axios
      .get("/expenses/")
      .then((res) => setExpenses(res.data))
      .catch((err) => console.error("Failed to fetch expenses:", err));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
      };
      if (mode === "order") {
        payload.order_number = formData.order_number?.trim();
      } else {
        payload.trip_id = formData.trip_id ? parseInt(formData.trip_id) : undefined;
      }
      await axios.post("/expenses/", payload);
      setFormData({ order_number: "", trip_id: "", amount: "", description: "" });
      setShowForm(false);
      fetchExpenses();
    } catch (err) {
      console.error("Failed to submit expense:", err);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

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
              <input
                type="text"
                value={formData.order_number}
                onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                required
                className="w-full border rounded px-3 py-2"
                placeholder="e.g. ord-2025-102"
              />
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
