import React, { useEffect, useState } from "react";
import axios from "../../utils/axiosAuth";
import { CSVLink } from "react-csv";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const RevenueDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filterDraft, setFilterDraft] = useState({ month: "", product: "", driver: "", partner: "" });
  const [drivers, setDrivers] = useState([]);
  const [partners, setPartners] = useState([]);

  const safeArray = Array.isArray(filtered) ? filtered : [];

  const applyFilters = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filterDraft.month) queryParams.append("month", filterDraft.month);
      const res = await axios.get(`/orders?${queryParams.toString()}`);

      let data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.orders)
        ? res.data.orders
        : [];

      if (filterDraft.product) {
        data = data.filter((o) =>
          o.product_description?.toLowerCase().includes(filterDraft.product.toLowerCase())
        );
      }
      if (filterDraft.driver) {
        data = data.filter((o) => o.driver_id == filterDraft.driver);
      }
      if (filterDraft.partner) {
        data = data.filter((o) => o.owner_id == filterDraft.partner);
      }

      setOrders(data);
      setFiltered(data);
    } catch (err) {
      console.error("Error fetching filtered orders:", err);
      setOrders([]);
      setFiltered([]);
    }
  };

  const resetFilters = async () => {
    try {
      setFilterDraft({ month: "", product: "", driver: "", partner: "" });
      const res = await axios.get("/orders");
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.orders)
        ? res.data.orders
        : [];
      setOrders(data);
      setFiltered(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setOrders([]);
      setFiltered([]);
    }
  };

  useEffect(() => {
    resetFilters();
    axios.get("/users/?role=driver").then((res) => setDrivers(res.data)).catch(() => {});
    axios.get("/users/?role=partner").then((res) => setPartners(res.data)).catch(() => {});
  }, []);

  const totalAmount = safeArray.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalExpenses = safeArray.reduce((sum, o) => sum + (o.expenses || 0), 0);
  const totalCommission = safeArray.reduce((sum, o) => sum + (o.commission || 0), 0);
  const totalRevenue = totalAmount - totalExpenses - totalCommission;

  const chartData = {
    labels: safeArray.map((o) => `Order ${o.id}`),
    datasets: [
      {
        label: "Revenue",
        data: safeArray.map(
          (o) => (o.total_amount || 0) - (o.expenses || 0) - (o.commission || 0)
        ),
        backgroundColor: "#10b981",
      },
    ],
  };

  const headers = [
    { label: "Order ID", key: "id" },
    { label: "Product", key: "product_description" },
    { label: "Total", key: "total_amount" },
    { label: "Expenses", key: "expenses" },
    { label: "Commission", key: "commission" },
    { label: "Revenue", key: "revenue" },
  ];

  const dataForExport = safeArray.map((order) => ({
    ...order,
    revenue: (order.total_amount || 0) - (order.expenses || 0) - (order.commission || 0),
  }));

  return (
    <div className="space-y-8 p-6">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Collected" value={totalAmount} color="gray-700" />
        <SummaryCard label="Total Expenses" value={totalExpenses} color="red-600" />
        <SummaryCard label="Total Commission" value={totalCommission} color="yellow-600" />
        <SummaryCard label="Net Revenue" value={totalRevenue} color="green-600" bold />
      </section>

      <div className="flex flex-wrap gap-4 items-center mb-4">
        <select value={filterDraft.month} onChange={(e) => setFilterDraft({ ...filterDraft, month: e.target.value })} className="border p-2 rounded">
          <option value="">All Months</option>
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter by product"
          value={filterDraft.product}
          onChange={(e) => setFilterDraft({ ...filterDraft, product: e.target.value })}
          className="border p-2 rounded"
        />
        <select value={filterDraft.driver} onChange={(e) => setFilterDraft({ ...filterDraft, driver: e.target.value })} className="border p-2 rounded">
          <option value="">All Drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select value={filterDraft.partner} onChange={(e) => setFilterDraft({ ...filterDraft, partner: e.target.value })} className="border p-2 rounded">
          <option value="">All Partners</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button onClick={applyFilters} className="bg-green-600 text-white px-4 py-2 rounded">Apply Filters</button>
        <button onClick={resetFilters} className="bg-gray-500 text-white px-4 py-2 rounded">Reset</button>
        <CSVLink data={dataForExport} headers={headers} filename="revenue_data.csv" className="bg-blue-600 text-white px-3 py-2 rounded">
          Export CSV
        </CSVLink>
      </div>

      <section className="bg-white shadow rounded-lg p-6 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4 text-purple-700">Order Revenue Breakdown</h2>
        <table className="min-w-full table-auto text-sm text-center">
          <thead>
            <tr className="text-gray-600 border-b">
              <th className="py-2 px-4">Order ID</th>
              <th className="py-2 px-4">Product</th>
              <th className="py-2 px-4">Total</th>
              <th className="py-2 px-4">Expenses</th>
              <th className="py-2 px-4">Commission</th>
              <th className="py-2 px-4">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {safeArray.map((order) => {
              const revenue = (order.total_amount || 0) - (order.expenses || 0) - (order.commission || 0);
              return (
                <tr key={order.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4">{order.id}</td>
                  <td className="py-2 px-4">{order.product_description}</td>
                  <td className="py-2 px-4">{(order.total_amount || 0).toLocaleString()} KES</td>
                  <td className="py-2 px-4 text-red-600">{(order.expenses || 0).toLocaleString()} KES</td>
                  <td className="py-2 px-4 text-yellow-600">{(order.commission || 0).toLocaleString()} KES</td>
                  <td className="py-2 px-4 text-green-600 font-semibold">{revenue.toLocaleString()} KES</td>
                </tr>
              );
            })}
            <tr className="font-bold border-t bg-gray-100">
              <td colSpan="2">Totals</td>
              <td>{totalAmount.toLocaleString()} KES</td>
              <td className="text-red-600">{totalExpenses.toLocaleString()} KES</td>
              <td className="text-yellow-600">{totalCommission.toLocaleString()} KES</td>
              <td className="text-green-600">{totalRevenue.toLocaleString()} KES</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-purple-700">Monthly Revenue Chart</h2>
        <Bar data={chartData} />
      </section>
    </div>
  );
};

const SummaryCard = ({ label, value, color, bold }) => (
  <div className="bg-white p-4 rounded-lg shadow">
    <h2 className="text-sm text-gray-500">{label}</h2>
    <p className={`text-xl font-${bold ? "bold" : "semibold"} text-${color}`}>
      {value.toLocaleString()} KES
    </p>
  </div>
);

export default RevenueDashboard;
