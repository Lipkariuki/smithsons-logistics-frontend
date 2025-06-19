import React, { useEffect, useState } from "react";
import axios from "../../utils/axiosAuth";

const DriverExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const fetchExpenses = async () => {
    try {
      const res = await axios.get("/driver/expenses");
      setExpenses(res.data);
    } catch (err) {
      console.error("Error fetching expenses:", err);
      setError("Could not load your expenses.");
    }
  };

  const fetchMyTrips = async () => {
    try {
      const res = await axios.get("/driver/trips");
      setTrips(res.data);
    } catch (err) {
      console.error("Error fetching trips:", err);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const payload = {
        trip_id: parseInt(tripId),
        amount: parseFloat(amount),
        description,
      };

      await axios.post("/driver/expenses", payload);
      setSuccess("Expense added successfully.");
      setTripId("");
      setAmount("");
      setDescription("");
      setShowForm(false);
      fetchExpenses();
    } catch (err) {
      console.error("Error submitting expense:", err);
      setError("Failed to add expense. Check your inputs.");
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchMyTrips();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-purple-700">Trip Expenses</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          {showForm ? "Cancel" : "Add Expense"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddExpense} className="bg-white shadow p-4 rounded mb-6 space-y-3">
          <select
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          >
            <option value="">Select Trip</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                #{trip.id} - {trip.destination}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
          <input
            type="text"
            placeholder="Description (e.g., fuel, toll)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Submit
          </button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
        </form>
      )}

      <div className="bg-white shadow rounded p-4">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">Trip ID</th>
              <th className="px-4 py-2">Vehicle Plate</th>
              <th className="px-4 py-2">Destination</th>
              <th className="px-4 py-2">Amount (KES)</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id} className="border-t">
                <td className="px-4 py-2">{exp.trip_id}</td>
                <td className="px-4 py-2">{exp.vehicle_plate || "-"}</td>
                <td className="px-4 py-2">{exp.destination || "-"}</td>
                <td className="px-4 py-2">{exp.amount}</td>
                <td className="px-4 py-2">{exp.description}</td>
                <td className="px-4 py-2">
                  {exp.timestamp ? new Date(exp.timestamp).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-500">
                  No expenses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DriverExpensesPage;
