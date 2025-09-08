import React, { useEffect, useMemo, useState } from "react";
import axios from "../../utils/axiosAuth";
import { CSVLink } from "react-csv";

const normalizeKePhone = (phone) => {
  if (!phone) return "";
  let p = String(phone).trim().replace(/\s|-/g, "");
  if (p.startsWith("+254")) return p;
  if (p.startsWith("254")) return "+" + p;
  if (p.startsWith("0") && p.length === 10) return "+254" + p.slice(1);
  if (p.length === 9 && p.startsWith("7")) return "+254" + p;
  return p; // fallback
};

const AdminDriversPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/users/", { params: { role: "driver" } });
      setDrivers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setErr("Failed to load drivers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const rows = useMemo(() => {
    if (!q) return drivers;
    const qq = q.toLowerCase();
    return drivers.filter((d) =>
      (d.name || "").toLowerCase().includes(qq) ||
      (d.phone || "").toLowerCase().includes(qq) ||
      (d.email || "").toLowerCase().includes(qq)
    );
  }, [drivers, q]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setMessage("");
    const name = form.name?.trim();
    const phone = normalizeKePhone(form.phone);
    if (!name || !phone) {
      setErr("Name and phone are required.");
      return;
    }
    const payload = {
      name,
      phone,
      email: form.email?.trim() || undefined,
      password: (form.password || "driverpass123"),
      role: "driver",
    };
    try {
      await axios.post("/users/", payload);
      setMessage("Driver created.");
      setForm({ name: "", phone: "", email: "", password: "" });
      loadDrivers();
    } catch (e) {
      const reason = e.response?.data?.detail || e.message;
      setErr(`Failed to create driver: ${reason}`);
    }
  };

  const csvHeaders = [
    { label: "Name", key: "name" },
    { label: "Phone", key: "phone" },
    { label: "Email", key: "email" },
  ];

  if (loading) return <div className="p-6">Loading drivers…</div>;
  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-purple-700">Drivers</h1>
          <p className="text-sm text-gray-600">Add drivers and search existing ones. Assignment happens per trip.</p>
        </div>
        <div className="flex gap-2 items-center">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search drivers…" className="border rounded px-3 py-2" />
          <CSVLink data={rows} headers={csvHeaders} filename="drivers.csv" className="bg-blue-600 text-white px-3 py-2 rounded">Export CSV</CSVLink>
        </div>
      </div>

      {message && <div className="text-green-700 mb-2">{message}</div>}
      {err && <div className="text-red-600 mb-2">{err}</div>}

      <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded px-3 py-2" />
        <input placeholder="Phone (07… or +2547…)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border rounded px-3 py-2" />
        <input placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border rounded px-3 py-2" />
        <div className="flex gap-2">
          <input type="password" placeholder="Password (optional)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="border rounded px-3 py-2 flex-1" />
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Add</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr className="text-left">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{d.name}</td>
                <td className="px-4 py-2">{d.phone}</td>
                <td className="px-4 py-2">{d.email || ""}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-500">No drivers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDriversPage;

