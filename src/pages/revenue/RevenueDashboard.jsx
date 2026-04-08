import React, { useEffect, useMemo, useState } from "react";
import axios from "../../utils/axiosAuth";
import { CSVLink } from "react-csv";
import { Bar } from "react-chartjs-2";
import Pagination from "../../components/Pagination";
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
    <div className="app-page">
      <section className="app-hero">
        <h1 className="app-title">Revenue Dashboard</h1>
        <p className="app-subtitle">
          Review collected revenue, costs, and export filtered order performance in one place.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Collected" value={totalAmount} color="gray-700" />
        <SummaryCard label="Total Expenses" value={totalExpenses} color="red-600" />
        <SummaryCard label="Total Commission" value={totalCommission} color="yellow-600" />
        <SummaryCard label="Net Revenue" value={totalRevenue} color="green-600" bold />
      </section>

      <section className="app-card-soft p-5">
      <div className="flex flex-wrap gap-4 items-center">
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
          className="app-select min-w-[11rem]"
        >
          <option value="">All dates</option>
          <option value="today">Today</option>
          <option value="last7">Last 7 days</option>
          <option value="thisMonth">This month</option>
          <option value="lastMonth">Last month</option>
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="app-input min-w-[11rem]" />
        <span className="text-violet-500">to</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="app-input min-w-[11rem]" />
        <select value={filterDraft.month} onChange={(e) => setFilterDraft({ ...filterDraft, month: e.target.value })} className="app-select min-w-[11rem]">
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
          className="app-input min-w-[14rem]"
        />
        <select value={filterDraft.vehicle} onChange={(e) => setFilterDraft({ ...filterDraft, vehicle: e.target.value })} className="app-select min-w-[14rem]">
          <option value="">All Trucks/Vans</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.plate_number}</option>
          ))}
        </select>
        <select value={filterDraft.owner} onChange={(e) => setFilterDraft({ ...filterDraft, owner: e.target.value })} className="app-select min-w-[14rem]">
          <option value="">All Owners</option>
          {owners.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button onClick={applyFilters} className="app-button-primary">Apply Filters</button>
        <button onClick={resetFilters} className="app-button-secondary">Reset</button>
        <CSVLink data={dataForExport} headers={headers} filename="revenue_data.csv" className="app-button-secondary"
          target="_blank"
        >
          Export CSV
        </CSVLink>
      </div>
      </section>

      {filterDraft.owner && (
        <div className="app-card-soft border-violet-200 px-4 py-3 text-sm text-violet-800">
          Showing results for owner ID {filterDraft.owner}: {safeArray.length} order(s). Net revenue {totalRevenue.toLocaleString()} KES.
        </div>
      )}

      <section className="app-card p-6 overflow-x-auto">
        <h2 className="app-section-title mb-4">Order Revenue Breakdown</h2>
        <div className="max-h-[70vh] overflow-auto">
        <table className="app-table table-auto text-center">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-violet-100">
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
                <tr key={order.id}>
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
            <tr className="font-bold border-t bg-violet-50/70">
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

      <section className="app-card p-6">
        <h2 className="app-section-title mb-4">Monthly Revenue Chart</h2>
        <Bar data={chartData} />
      </section>
    </div>
  );
};

const SummaryCard = ({ label, value, color, bold }) => (
  <div className="app-stat-card">
    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-purple-500" />
    <h2 className="app-stat-label">{label}</h2>
    <p
      className={`text-xl ${bold ? "font-bold" : "font-semibold"} ${
        {
          "gray-700": "text-violet-950",
          "red-600": "text-rose-600",
          "yellow-600": "text-amber-600",
          "green-600": "text-emerald-600",
        }[color] || "text-violet-950"
      }`}
    >
      {value.toLocaleString()} KES
    </p>
  </div>
);

export default RevenueDashboard;
