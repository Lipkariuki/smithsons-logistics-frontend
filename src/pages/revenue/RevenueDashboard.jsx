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
  const [filter, setFilter] = useState({ month: "", product: "", driver: "", partner: "" });
  const [drivers, setDrivers] = useState([]);
  const [partners, setPartners] = useState([]);
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    axios.get("/admin/orders").then((res) => {
      setOrders(res.data);
      setFiltered(res.data);
    });

    axios.get("/users/?role=driver").then((res) => setDrivers(res.data));
    axios.get("/users/?role=partner").then((res) => setPartners(res.data));
  }, []);

  useEffect(() => {
    let data = orders;
    if (filter.month) {
      data = data.filter(order => new Date(order.date).getMonth() + 1 === parseInt(filter.month));
    }
    if (filter.product) {
      data = data.filter(order => order.product_description.toLowerCase().includes(filter.product.toLowerCase()));
    }
    if (filter.driver) {
      data = data.filter(order => order.driver_id == filter.driver);
    }
    if (filter.partner) {
      data = data.filter(order => order.owner_id == filter.partner);
    }
    setFiltered(data);
    setPage(1);
  }, [filter, orders]);

  const totalAmount = filtered.reduce((sum, o) => sum + o.total_amount, 0);
  const totalExpenses = filtered.reduce((sum, o) => sum + o.expenses, 0);
  const totalCommission = filtered.reduce((sum, o) => sum + o.commission, 0);
  const totalRevenue = totalAmount - totalExpenses - totalCommission;

  const chartData = {
    labels: filtered.map(o => `Order ${o.id}`),
    datasets: [{
      label: "Revenue",
      data: filtered.map(o => o.total_amount - o.expenses - o.commission),
      backgroundColor: "#10b981",
    }],
  };

  const headers = [
    { label: "Order ID", key: "id" },
    { label: "Product", key: "product_description" },
    { label: "Total", key: "total_amount" },
    { label: "Expenses", key: "expenses" },
    { label: "Commission", key: "commission" },
    { label: "Revenue", key: "revenue" },
  ];

  const dataForExport = filtered.map(order => ({
    ...order,
    revenue: order.total_amount - order.expenses - order.commission,
  }));

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-8 p-6">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-sm text-gray-500">Total Collected</h2>
          <p className="text-xl font-semibold text-gray-700">{totalAmount.toLocaleString()} KES</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-sm text-gray-500">Total Expenses</h2>
          <p className="text-xl font-semibold text-red-600">{totalExpenses.toLocaleString()} KES</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-sm text-gray-500">Total Commission</h2>
          <p className="text-xl font-semibold text-yellow-600">{totalCommission.toLocaleString()} KES</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-sm text-gray-500">Net Revenue</h2>
          <p className="text-xl font-bold text-green-600">{totalRevenue.toLocaleString()} KES</p>
        </div>
      </section>

      <div className="flex gap-4 items-center mb-4 flex-wrap">
        <select onChange={(e) => setFilter({ ...filter, month: e.target.value })} className="border p-2 rounded">
          <option value="">All Months</option>
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter by product"
          onChange={(e) => setFilter({ ...filter, product: e.target.value })}
          className="border p-2 rounded"
        />
        <select onChange={(e) => setFilter({ ...filter, driver: e.target.value })} className="border p-2 rounded">
          <option value="">All Drivers</option>
          {drivers.map(driver => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
        </select>
        <select onChange={(e) => setFilter({ ...filter, partner: e.target.value })} className="border p-2 rounded">
          <option value="">All Partners</option>
          {partners.map(partner => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
        </select>
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
            {paginated.map(order => {
              const revenue = order.total_amount - order.expenses - order.commission;
              return (
                <tr key={order.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4">{order.id}</td>
                  <td className="py-2 px-4">{order.product_description}</td>
                  <td className="py-2 px-4">{order.total_amount.toLocaleString()} KES</td>
                  <td className="py-2 px-4 text-red-600">{order.expenses.toLocaleString()} KES</td>
                  <td className="py-2 px-4 text-yellow-600">{order.commission.toLocaleString()} KES</td>
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
        <div className="mt-4 flex justify-end gap-2">
          {Array.from({ length: Math.ceil(filtered.length / perPage) }).map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded ${page === i + 1 ? "bg-purple-700 text-white" : "border"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-purple-700">Monthly Revenue Chart</h2>
        <Bar data={chartData} />
      </section>
    </div>
  );
};

export default RevenueDashboard;
