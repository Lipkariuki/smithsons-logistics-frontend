import React, { useEffect, useMemo, useState } from "react";
import axios from "../../utils/axiosAuth";

const AdminFleetPage = () => {
  const [owners, setOwners] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

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
      };
    });
    if (!q) return list;
    const qq = q.toLowerCase();
    return list.filter(r =>
      r.plate?.toLowerCase().includes(qq) ||
      r.size?.toLowerCase().includes(qq) ||
      r.owner_name?.toLowerCase().includes(qq) ||
      r.owner_phone?.toLowerCase().includes(qq) ||
      r.owner_email?.toLowerCase().includes(qq)
    );
  }, [owners, vehicles, q]);

  if (loading) return <div className="p-6">Loading fleet…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-2 md:p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-purple-700">Fleet (Owners & Vehicles)</h1>
          <p className="text-sm text-gray-600">Search by plate, owner, phone, or size.</p>
        </div>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search fleet…"
          className="w-full md:w-72 border rounded px-3 py-2"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr className="text-left">
              <th className="px-4 py-2">Owner</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Vehicle Plate</th>
              <th className="px-4 py-2">Size</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`${r.plate}-${idx}`} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{r.owner_name || <span className="text-gray-400">—</span>}</td>
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
    </div>
  );
};

export default AdminFleetPage;

