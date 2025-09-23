import React, { useEffect, useMemo, useState } from "react";
import axios from "../../utils/axiosAuth";
import { CSVLink } from "react-csv";
import Pagination from "../../components/Pagination";

const AdminFleetPage = () => {
  const [owners, setOwners] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [view, setView] = useState("table"); // 'table' | 'grouped'
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [ownersRes, vehiclesRes] = await Promise.all([
          axios.get("/users/", { params: { role: "owner" } }),
          axios.get("/vehicles/")
        ]);
        setOwners(Array.isArray(ownersRes.data) ? ownersRes.data : []);
        setVehicles(Array.isArray(vehiclesRes.data) ? vehiclesRes.data : []);
      } catch (e) {
        console.error("Failed to load fleet:", e);
        setError("Could not load owners or vehicles.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const rows = useMemo(() => {
    const ownersById = new Map(owners.map(o => [o.id, o]));
    const list = vehicles.map(v => {
      const o = ownersById.get(v.owner_id) || {};
      return {
        plate: v.plate_number,
        size: v.size || "",
        owner_name: o.name || "",
        owner_phone: o.phone || "",
        owner_email: o.email || "",
        owner_id: o.id || null,
      };
    });
    let filtered = list;
    if (ownerFilter) {
      filtered = filtered.filter(r => String(r.owner_id) === String(ownerFilter));
    }
    if (!q) return filtered;
    const qq = q.toLowerCase();
    return filtered.filter(r =>
      r.plate?.toLowerCase().includes(qq) ||
      r.size?.toLowerCase().includes(qq) ||
      r.owner_name?.toLowerCase().includes(qq) ||
      r.owner_phone?.toLowerCase().includes(qq) ||
      r.owner_email?.toLowerCase().includes(qq)
    );
  }, [owners, vehicles, q, ownerFilter]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * perPage;
    return rows.slice(start, start + perPage);
  }, [rows, page, perPage]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = r.owner_id || `unknown-${r.owner_name}-${r.owner_phone}`;
      if (!map.has(key)) {
        map.set(key, {
          owner_id: r.owner_id,
          owner_name: r.owner_name,
          owner_phone: r.owner_phone,
          owner_email: r.owner_email,
          vehicles: [],
        });
      }
      map.get(key).vehicles.push({ plate: r.plate, size: r.size });
    }
    return Array.from(map.values()).sort((a, b) => (a.owner_name || "").localeCompare(b.owner_name || ""));
  }, [rows]);

  const csvHeaders = [
    { label: "Owner", key: "owner_name" },
    { label: "Phone", key: "owner_phone" },
    { label: "Email", key: "owner_email" },
    { label: "Vehicle Plate", key: "plate" },
    { label: "Size", key: "size" },
  ];

  if (loading) return <div className="p-6">Loading fleet…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-2 md:p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-purple-700">Fleet (Owners & Vehicles)</h1>
          <p className="text-sm text-gray-600">Search by plate, owner, phone, or size.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <select
            value={ownerFilter}
            onChange={e => setOwnerFilter(e.target.value)}
            className="border rounded px-3 py-2 w-full md:w-56"
          >
            <option value="">All owners</option>
            {owners
              .slice()
              .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
              .map(o => (
                <option key={o.id} value={o.id}>
                  {o.name} {o.phone ? `(${o.phone})` : ""}
                </option>
              ))}
          </select>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search fleet…"
            className="w-full md:w-64 border rounded px-3 py-2"
          />
          <button
            type="button"
            onClick={() => { setQ(""); setOwnerFilter(""); }}
            className="border rounded px-3 py-2 hover:bg-gray-50"
          >
            Reset
          </button>
          <div>
            <CSVLink
              data={rows}
              headers={csvHeaders}
              filename="fleet_export.csv"
              className="bg-blue-600 text-white px-3 py-2 rounded inline-block"
            >
              Export CSV
            </CSVLink>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm text-gray-600">View:</span>
        <button
          className={`px-3 py-1.5 rounded border ${view === 'table' ? 'bg-purple-600 text-white border-purple-600' : 'hover:bg-gray-50'}`}
          onClick={() => setView('table')}
        >
          Flat list
        </button>
        <button
          className={`px-3 py-1.5 rounded border ${view === 'grouped' ? 'bg-purple-600 text-white border-purple-600' : 'hover:bg-gray-50'}`}
          onClick={() => setView('grouped')}
        >
          Grouped by owner
        </button>
      </div>

      {view === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white text-gray-600">
              <tr className="text-left">
                <th className="px-4 py-2">Owner</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Vehicle Plate</th>
                <th className="px-4 py-2">Size</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((r, idx) => (
                <tr key={`${r.plate}-${idx}`} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <button onClick={() => setOwnerFilter(r.owner_id || "")} className="text-purple-700 hover:underline">
                      {r.owner_name || <span className="text-gray-400">—</span>}
                    </button>
                  </td>
                  <td className="px-4 py-2">{r.owner_phone || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-2">{r.owner_email || <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-2 font-medium">{r.plate}</td>
                  <td className="px-4 py-2">{r.size}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>No results.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          <Pagination
            page={page}
            perPage={perPage}
            total={rows.length}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm">
          <ul className="divide-y">
            {grouped.map((g, i) => (
              <li key={i} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="font-medium text-gray-800">{g.owner_name || '—'}</div>
                    <div className="text-sm text-gray-600">{g.owner_phone || '—'}{g.owner_email ? ` · ${g.owner_email}` : ''}</div>
                  </div>
                  <div className="text-sm text-gray-600">{g.vehicles.length} vehicle(s)</div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {g.vehicles.map((v, idx) => (
                    <div key={idx} className="border rounded px-3 py-2 bg-gray-50">
                      <div className="font-medium">{v.plate}</div>
                      <div className="text-xs text-gray-600">{v.size}</div>
                    </div>
                  ))}
                </div>
              </li>
            ))}
            {grouped.length === 0 && (
              <li className="p-6 text-center text-gray-500">No results.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AdminFleetPage;
