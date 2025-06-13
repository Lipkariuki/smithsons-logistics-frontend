import React, { useEffect, useState } from "react";
import axios from "../../utils/axiosAuth"; // ✅ custom axios with token

const PartnerOrdersDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await axios.get("/partner/orders");
        setOrders(res.data);
      } catch (err) {
        console.error("Error fetching partner orders:", err);
        setError("Could not load partner orders.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) return <p className="p-4">Loading orders...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-purple-700 mb-6">My Orders</h1>
      <div className="overflow-x-auto rounded border border-gray-300 shadow">
        <table className="min-w-full bg-white text-sm text-left">
          <thead className="bg-purple-700 text-white">
            <tr>
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Destination</th>
              <th className="px-4 py-2">Truck</th>
              <th className="px-4 py-2">Cases</th>
              <th className="px-4 py-2">Total (KES)</th>
              <th className="px-4 py-2">Dispatch Note</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="px-4 py-2">{order.invoice_number}</td>
                <td className="px-4 py-2">{order.date?.slice(0, 10)}</td>
                <td className="px-4 py-2">{order.product_description}</td>
                <td className="px-4 py-2">{order.destination}</td>
                <td className="px-4 py-2">{order.truck_plate}</td>
                <td className="px-4 py-2">{order.cases}</td>
                <td className="px-4 py-2">{order.total_amount.toLocaleString()}</td>
                <td className="px-4 py-2">{order.dispatch_note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PartnerOrdersDashboard;
