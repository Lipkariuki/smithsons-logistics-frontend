import React, { useEffect, useMemo, useState } from "react";
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
  const [filterDraft, setFilterDraft] = useState({ month: "", product: "", owner: "", vehicle: "" });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quickRange, setQuickRange] = useState("");
  const [owners, setOwners] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const safeArray = Array.isArray(filtered) ? filtered : [];
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return safeArray.slice(start, start + perPage);
  }, [safeArray, page, perPage]);

  const applyFilters = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filterDraft.month) queryParams.append("month", filterDraft.month);
      const res = await axios.get(`/admin/orders?${queryParams.toString()}`);

      let data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.orders)
        ? res.data.orders
        : [];

      const fmt = (d) => (d ? new Date(d).toISOString().slice(0,10) : "");

      if (filterDraft.product) {
        data = data.filter((o) =>
          o.product_description?.toLowerCase().includes(filterDraft.product.toLowerCase())
        );
      }
      if (startDate) {
        data = data.filter((o) => fmt(o.date) >= startDate);
      }
      if (endDate) {
        data = data.filter((o) => fmt(o.date) <= endDate);
      }
      if (filterDraft.owner) {
        data = data.filter((o) => String(o.owner_id) === String(filterDraft.owner));
      }
      if (filterDraft.vehicle) {
        // prefer matching by vehicle_id when present; fallback to plate
        data = data.filter((o) => {
          if (o.vehicle_id) return String(o.vehicle_id) === String(filterDraft.vehicle);
          return (o.truck_plate || "") === (vehicles.find(v => String(v.id) === String(filterDraft.vehicle))?.plate_number || "");
        });
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
      setFilterDraft({ month: "", product: "", owner: "", vehicle: "" });
      setStartDate("");
      setEndDate("");
      setQuickRange("");
      const res = await axios.get("/admin/orders");
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
    axios.get("/users/?role=owner").then((res) => setOwners(res.data)).catch(() => {});
    axios.get("/vehicles/").then((res) => setVehicles(res.data)).catch(() => {});
  }, []);

  const totalAmount = safeArray.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalExpenses = safeArray.reduce((sum, o) => sum + (o.expenses || 0), 0);
  const totalCommission = safeArray.reduce((sum, o) => sum + (o.commission || 0), 0);
  const totalRevenue = totalAmount - totalExpenses - totalCommission;

  const chartData = {
    labels: safeArray.map((o) => o.order_number || `ORD-${o.id}`),
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
    { label: "Order #", key: "order_number" },
    { label: "Date", key: "date_fmt" },
    { label: "Product", key: "product_description" },
    { label: "Destination", key: "destination" },
    { label: "Vehicle", key: "truck_plate" },
    { label: "Driver", key: "driver_name" },
    { label: "Total", key: "total_amount" },
    { label: "Expenses", key: "expenses" },
    { label: "Commission", key: "commission" },
    { label: "Revenue", key: "revenue" },
  ];

  const dataForExport = (() => {
    const rows = safeArray.map((o) => ({
      ...o,
      date_fmt: o.date ? new Date(o.date).toISOString().slice(0, 10) : "",
      revenue: (o.total_amount || 0) - (o.expenses || 0) - (o.commission || 0),
    }));
    // Append a totals row matching the current filtered set
    rows.push({
      order_number: "Totals",
      date_fmt: "",
      product_description: "",
      destination: "",
      truck_plate: "",
      driver_name: "",
      total_amount: rows.reduce((s, r) => s + (r.total_amount || 0), 0),
      expenses: rows.reduce((s, r) => s + (r.expenses || 0), 0),
      commission: rows.reduce((s, r) => s + (r.commission || 0), 0),
      revenue: rows.reduce((s, r) => s + ((r.total_amount || 0) - (r.expenses || 0) - (r.commission || 0)), 0),
    });
    return rows;
  })();

  return (
    <div className="space-y-8 p-6">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Collected" value={totalAmount} color="gray-700" />
        <SummaryCard label="Total Expenses" value={totalExpenses} color="red-600" />
        <SummaryCard label="Total Commission" value={totalCommission} color="yellow-600" />
        <SummaryCard label="Net Revenue" value={totalRevenue} color="green-600" bold />
      </section>

      <div className="flex flex-wrap gap-4 items-center mb-4">
        <select
          value={quickRange}
          onChange={(e) => {
            const v = e.target.value;
            setQuickRange(v);
            const today = new Date();
            const toISO = (d) => d.toISOString().slice(0,10);
            if (v === "today") {
              const d = new Date(today);
              setStartDate(toISO(d));
              setEndDate(toISO(d));
            } else if (v === "last7") {
              const d = new Date(today);
              const s = new Date(d);
              s.setDate(d.getDate() - 6);
              setStartDate(toISO(s));
              setEndDate(toISO(d));
            } else if (v === "thisMonth") {
              const d = new Date(today);
              const first = new Date(d.getFullYear(), d.getMonth(), 1);
              const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
              setStartDate(toISO(first));
              setEndDate(toISO(last));
            } else if (v === "lastMonth") {
              const d = new Date(today);
              const first = new Date(d.getFullYear(), d.getMonth() - 1, 1);
              const last = new Date(d.getFullYear(), d.getMonth(), 0);
              setStartDate(toISO(first));
              setEndDate(toISO(last));
            } else {
              setStartDate("");
              setEndDate("");
            }
          }}
          className="border p-2 rounded"
        >
          <option value="">All dates</option>
          <option value="today">Today</option>
          <option value="last7">Last 7 days</option>
          <option value="thisMonth">This month</option>
          <option value="lastMonth">Last month</option>
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border p-2 rounded" />
        <span className="text-gray-500">to</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border p-2 rounded" />
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
        <select value={filterDraft.vehicle} onChange={(e) => setFilterDraft({ ...filterDraft, vehicle: e.target.value })} className="border p-2 rounded">
          <option value="">All Trucks/Vans</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.plate_number}</option>
          ))}
        </select>
        <select value={filterDraft.owner} onChange={(e) => setFilterDraft({ ...filterDraft, owner: e.target.value })} className="border p-2 rounded">
          <option value="">All Owners</option>
          {owners.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button onClick={applyFilters} className="bg-green-600 text-white px-4 py-2 rounded">Apply Filters</button>
        <button onClick={resetFilters} className="bg-gray-500 text-white px-4 py-2 rounded">Reset</button>
        <CSVLink data={dataForExport} headers={headers} filename="revenue_data.csv" className="bg-blue-600 text-white px-3 py-2 rounded"
          target="_blank"
        >
          Export CSV
        </CSVLink>
      </div>

      {filterDraft.owner && (
        <div className="bg-purple-50 border border-purple-200 text-purple-800 rounded-lg px-4 py-3 mb-4 text-sm">
          Showing results for owner ID {filterDraft.owner}: {safeArray.length} order(s). Net revenue {totalRevenue.toLocaleString()} KES.
        </div>
      )}

      <section className="bg-white shadow rounded-lg p-6 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4 text-purple-700">Order Revenue Breakdown</h2>
        <div className="max-h-[70vh] overflow-auto">
        <table className="min-w-full table-auto text-sm text-center">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="text-gray-600 border-b">
              <th className="py-2 px-4">Order #</th>
              <th className="py-2 px-4">Date</th>
              <th className="py-2 px-4">Product</th>
              <th className="py-2 px-4">Destination</th>
              <th className="py-2 px-4">Vehicle</th>
              <th className="py-2 px-4">Driver</th>
              <th className="py-2 px-4">Total</th>
              <th className="py-2 px-4">Expenses</th>
              <th className="py-2 px-4">Commission</th>
              <th className="py-2 px-4">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((order) => {
              const revenue = (order.total_amount || 0) - (order.expenses || 0) - (order.commission || 0);
              return (
                <tr key={order.id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4 font-medium text-purple-700">{order.order_number || `ORD-${order.id}`}</td>
                  <td className="py-2 px-4">{order.date ? new Date(order.date).toISOString().slice(0,10) : ""}</td>
                  <td className="py-2 px-4">{order.product_description}</td>
                  <td className="py-2 px-4">{order.destination}</td>
                  <td className="py-2 px-4">{order.truck_plate || "-"}</td>
                  <td className="py-2 px-4">{order.driver_name || "Unassigned"}</td>
                  <td className="py-2 px-4">{(order.total_amount || 0).toLocaleString()} KES</td>
                  <td className="py-2 px-4 text-red-600">{(order.expenses || 0).toLocaleString()} KES</td>
                  <td className="py-2 px-4 text-yellow-600">{(order.commission || 0).toLocaleString()} KES</td>
                  <td className="py-2 px-4 text-green-600 font-semibold">{revenue.toLocaleString()} KES</td>
                </tr>
              );
            })}
            <tr className="font-bold border-t bg-gray-100">
              <td colSpan="6">Totals</td>
              <td>{totalAmount.toLocaleString()} KES</td>
              <td className="text-red-600">{totalExpenses.toLocaleString()} KES</td>
              <td className="text-yellow-600">{totalCommission.toLocaleString()} KES</td>
              <td className="text-green-600">{totalRevenue.toLocaleString()} KES</td>
            </tr>
          </tbody>
        </table>
        </div>
        <Pagination
          page={page}
          perPage={perPage}
          total={safeArray.length}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
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
    <p className={`text-xl ${bold ? "font-bold" : "font-semibold"} text-${color}`}>
      {value.toLocaleString()} KES
    </p>
  </div>
);

export default RevenueDashboard;
import Pagination from "../../components/Pagination";
