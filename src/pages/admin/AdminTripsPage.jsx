// src/pages/admin/AdminTripsPage.jsx

import React, { useEffect, useState } from "react";
import axios from "../../utils/axiosAuth";

const AdminTripsPage = () => {
  const [trips, setTrips] = useState([]);
  const [expensesMap, setExpensesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTrips = async () => {
    try {
      const res = await axios.get("/trips/");
      setTrips(res.data);

      // Fetch expenses per trip in parallel
      const expensesData = await Promise.all(
        res.data.map((trip) =>
          axios
            .get(`/trips/${trip.id}/with-expenses`)
            .then((r) => ({ id: trip.id, total: r.data.total_expenses }))
            .catch(() => ({ id: trip.id, total: 0 }))
        )
      );

      const map = {};
      expensesData.forEach((e) => {
        map[e.id] = e.total;
      });
      setExpensesMap(map);
    } catch (err) {
      console.error("Error loading trips:", err);
      setError("Could not load trips or expenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  if (loading) return <p className="p-4">Loading trips...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-purple-700 mb-6">All Trips (Admin)</h1>

      <div className="overflow-x-auto bg-white rounded-xl shadow-sm">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-purple-50 text-xs text-gray-600 uppercase">
            <tr>
              <th className="px-4 py-3">Trip ID</th>
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reimbursement</th>
              <th className="px-4 py-3">Dispatch Note</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Total Expense</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {trips.map((trip) => (
              <tr key={trip.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{trip.id}</td>
                <td className="px-4 py-3">{trip.order_number || '-'}</td>
                <td className="px-4 py-3">{trip.status}</td>
                <td className="px-4 py-3">{trip.reimbursement_status}</td>
                <td className="px-4 py-3">
                  {trip.dispatch_note || <span className="italic text-gray-400">N/A</span>}
                </td>
                <td className="px-4 py-3">
                  {trip.vehicle_plate || <span className="text-red-500">Unassigned</span>}
                </td>
                <td className="px-4 py-3">
                  {trip.driver_name || <span className="text-red-500">Unassigned</span>}
                </td>
                <td className="px-4 py-3">
                  {trip.destination || <span className="italic text-gray-400">N/A</span>}
                </td>
                <td className="px-4 py-3 font-semibold text-blue-600">
                  KES {expensesMap[trip.id]?.toFixed(2) || "0.00"}
                </td>
                <td className="px-4 py-3">
                  {trip.created_at ? new Date(trip.created_at).toLocaleString() : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTripsPage;
