import React, { useEffect, useMemo, useRef, useState } from "react";
import axiosAuth from "../utils/axiosAuth";
import Pagination from "../components/Pagination";

const currency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" });

const formatMoney = (value) => currency.format(Number(value || 0));

const ReportsPage = () => {
  const normalizePhone = (phone) => {
    if (!phone) return "";
    const p = phone.replace(/\s|-/g, "");
    if (p.startsWith("+")) return p;
    if (p.startsWith("0") && p.length === 10) return `+254${p.slice(1)}`;
    if (p.startsWith("254") && p.length === 12) return `+${p}`;
    return p;
  };

  const ALLOWED_PHONE = "+254722760992";

  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth(), 1);
    return base.toISOString().slice(0, 10);
  }, [today]);
  const defaultEnd = useMemo(() => today.toISOString().slice(0, 10), [today]);

  const [owners, setOwners] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState("");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    axiosAuth
      .get("/users/me")
      .then((res) => {
        const allowed = normalizePhone(res.data?.phone) === ALLOWED_PHONE;
        setAuthorized(allowed);
        if (allowed) {
          axiosAuth
            .get("/users/", { params: { role: "owner" } })
            .then((resp) => setOwners(resp.data || []))
            .catch(() => {});
          fetchReports(true);
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setAuthorized(false);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReports = (skipAuthCheck = false) => {
    if (!skipAuthCheck && !authorized) return;
    const params = new URLSearchParams();
    if (selectedOwner) params.set("owner_id", selectedOwner);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    setLoading(true);
    setError("");
    axiosAuth
      .get(`/reports/summary?${params.toString()}`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setReports(list);
        setPage(1);
      })
      .catch((err) => setError(err.response?.data?.detail || "Failed to load reports"))
      .finally(() => setLoading(false));
  };

  const handleSendReport = (vehicleId) => {
    setError("");
    setMessage("");
    axiosAuth
      .post("/reports/send", {
        vehicle_id: vehicleId,
        start_date: startDate || null,
        end_date: endDate || null,
      })
      .then((res) => {
        const text = res.data?.message || "Report sent.";
        setMessage(text);
        setTimeout(() => setMessage(""), 5000);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || "Failed to send report");
        setTimeout(() => setError(""), 5000);
      });
  };

  const handleUpload = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const res = await axiosAuth.post("/reports/reconciliation/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { created = 0, updated = 0, skipped = 0 } = res.data || {};
      setMessage(`Upload complete. Created ${created}, updated ${updated}, skipped ${skipped}.`);
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to upload reconciliation file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => {
        setMessage("");
        setError("");
      }, 6000);
    }
  };

  const totals = useMemo(() => {
    return reports.reduce(
      (acc, row) => {
        acc.trips += row.trip_count || 0;
        acc.gross += row.gross_revenue || 0;
        acc.fuel += row.fuel_cost || 0;
        acc.other += row.other_expenses || 0;
        acc.extra += row.extra_expenses || 0;
        acc.commission += row.commission || 0;
        acc.net += row.net_profit || 0;
        acc.actual += row.actual_payment || 0;
        return acc;
      },
      { trips: 0, gross: 0, fuel: 0, other: 0, extra: 0, commission: 0, net: 0, actual: 0 }
    );
  }, [reports]);

  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return reports.slice(start, start + perPage);
  }, [reports, page, perPage]);

  const templateUrl = `${import.meta.env.VITE_API_BASE_URL}/reports/reconciliation/template`;

  if (authorized === null) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Checking access…</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-purple-700 mb-2">Reports</h1>
        <p className="text-sm text-gray-600">You do not have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-purple-700">Owner Performance Reports</h1>
          <p className="text-sm text-gray-600">
            Review per-vehicle earnings and send SMS summaries to partners.
          </p>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <a
            href={templateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-700 underline"
          >
            Download reconciliation template
          </a>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <span className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 transition">
              {uploading ? "Uploading..." : "Upload reconciliation CSV"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500">Owner</label>
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="">All owners</option>
              {owners
                .slice()
                .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                .map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name} {owner.phone ? `(${owner.phone})` : ""}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="flex gap-3 mt-2 lg:mt-0">
            <button
              onClick={fetchReports}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={() => {
                setSelectedOwner("");
                setStartDate(defaultStart);
                setEndDate(defaultEnd);
                setPage(1);
                fetchReports();
              }}
              className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
            >
              Reset
            </button>
          </div>
        </div>
        {message && <div className="text-sm text-green-600">{message}</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
      </section>

      <section className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Vehicle</th>
              <th className="px-4 py-2 text-left">Owner</th>
              <th className="px-4 py-2 text-right">Trips</th>
              <th className="px-4 py-2 text-right">Gross</th>
              <th className="px-4 py-2 text-right">Fuel</th>
              <th className="px-4 py-2 text-right">Expenses</th>
              <th className="px-4 py-2 text-right">Extra</th>
              <th className="px-4 py-2 text-right">Commission</th>
              <th className="px-4 py-2 text-right">Net</th>
              <th className="px-4 py-2 text-right">Actual</th>
              <th className="px-4 py-2 text-right">Balance</th>
              <th className="px-4 py-2 text-left">Notes</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => {
              return (
                <tr key={row.vehicle_id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-purple-700">{row.plate_number}</td>
                  <td className="px-4 py-2">{row.owner_name || "—"}</td>
                  <td className="px-4 py-2 text-right">{row.trip_count}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(row.gross_revenue)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(row.fuel_cost)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(row.other_expenses)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(row.extra_expenses)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(row.commission)}</td>
                  <td className="px-4 py-2 text-right text-green-700 font-semibold">
                    {formatMoney(row.net_profit)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {row.actual_payment != null ? formatMoney(row.actual_payment) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {row.variance != null ? formatMoney(row.variance) : "—"}
                  </td>
                  <td className="px-4 py-2">{row.notes || "—"}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleSendReport(row.vehicle_id)}
                      className="text-sm text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700"
                    >
                      Send report
                    </button>
                  </td>
                </tr>
              );
            })}
            {paged.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-6 text-center text-gray-500">
                  {loading ? "Loading..." : "No data available for the selected filters."}
                </td>
              </tr>
            )}
          </tbody>
          {reports.length > 0 && (
            <tfoot className="bg-gray-100 font-semibold">
              <tr>
                <td className="px-4 py-2">Totals</td>
                <td></td>
                <td className="px-4 py-2 text-right">{totals.trips}</td>
                <td className="px-4 py-2 text-right">{formatMoney(totals.gross)}</td>
                <td className="px-4 py-2 text-right">{formatMoney(totals.fuel)}</td>
                <td className="px-4 py-2 text-right">{formatMoney(totals.other)}</td>
                <td className="px-4 py-2 text-right">{formatMoney(totals.extra)}</td>
                <td className="px-4 py-2 text-right">{formatMoney(totals.commission)}</td>
                <td className="px-4 py-2 text-right">{formatMoney(totals.net)}</td>
                <td className="px-4 py-2 text-right">
                  {totals.actual ? formatMoney(totals.actual) : "—"}
                </td>
                <td className="px-4 py-2 text-right">—</td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
        <Pagination
          page={page}
          perPage={perPage}
          total={reports.length}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      </section>

      <section className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-900">
        <h2 className="font-semibold mb-2">How reconciliation works</h2>
        <p className="mb-2">
          Upload the reconciliation CSV with per-vehicle adjustments for the selected period. The
          system adds fuel, extra expenses, commission adjustments, and actual payments on top of the
          automatically tracked trips, expenses, and commissions. Net profit is calculated as Gross −
          Fuel − Expenses − Extra − Commission.
        </p>
        <p>
          After importing, use the Send Report button to deliver a summary SMS to the vehicle owner.
        </p>
      </section>
    </div>
  );
};

export default ReportsPage;
