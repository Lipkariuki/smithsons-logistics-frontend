import React, { useEffect, useState } from "react";
import axios from "../../utils/axiosAuth";

const DriverTripsPage = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get("/driver/trips")
      .then((res) => {
        setTrips(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching driver trips:", err);
        setError("Could not load your assigned trips.");
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="p-4">Loading trips...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-purple-700 mb-6">My Trips</h1>

      <div className="overflow-x-auto bg-white rounded-xl shadow-sm">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-purple-50 text-xs text-gray-600 uppercase">
            <tr>
              <th className="px-4 py-3">Trip ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reimbursement</th>
              <th className="px-4 py-3">Dispatch Note</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {trips.map((trip) => (
              <tr key={trip.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{trip.id}</td>
                <td className="px-4 py-3">{trip.status}</td>
                <td className="px-4 py-3">{trip.reimbursement_status}</td>
                <td className="px-4 py-3">
                  {trip.dispatch_note || <span className="italic text-gray-400">N/A</span>}
                </td>
                <td className="px-4 py-3">
                  {trip.vehicle_plate || <span className="text-red-500">Unassigned</span>}
                </td>
                <td className="px-4 py-3">
                  {trip.destination || <span className="italic text-gray-400">N/A</span>}
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

export default DriverTripsPage;
