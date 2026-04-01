import React, { useMemo, useState } from "react";
import axiosAuth from "../../utils/axiosAuth";

const currency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" });

const formatMoney = (value) => currency.format(Number(value || 0));

const DhlReconciliationPage = () => {
  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth(), 1);
    return base.toISOString().slice(0, 10);
  }, [today]);
  const defaultEnd = useMemo(() => today.toISOString().slice(0, 10), [today]);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosAuth.get("/dhl-reports/reconciliation", {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load reconciliation report");
    } finally {
      setLoading(false);
    }
  };

  const mismatchRows = report?.rows?.filter((row) => !row.matched) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">DHL Reconciliation</h1>
          <p className="text-sm text-gray-600">
            Compare internal records against DHL totals for the month and spot any differences quickly.
          </p>
        </div>
      </div>

      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
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
          <button
            onClick={fetchReport}
            className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900 transition"
            disabled={loading}
          >
            {loading ? "Loading..." : "Check Month"}
          </button>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </section>

      {report && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow p-5 border border-slate-100">
              <div className="text-xs uppercase tracking-wide text-gray-500">Internal Orders</div>
              <div className="mt-2 text-3xl font-semibold text-slate-800">{report.internal_order_count}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-5 border border-slate-100">
              <div className="text-xs uppercase tracking-wide text-gray-500">DHL Orders</div>
              <div className="mt-2 text-3xl font-semibold text-slate-800">{report.dhl_order_count}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-5 border border-slate-100">
              <div className="text-xs uppercase tracking-wide text-gray-500">Revenue Difference</div>
              <div
                className={`mt-2 text-2xl font-semibold ${
                  report.revenue_difference === 0 ? "text-green-700" : "text-amber-600"
                }`}
              >
                {formatMoney(report.revenue_difference)}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-5 border border-slate-100">
              <div className="text-xs uppercase tracking-wide text-gray-500">Mismatched Vehicles</div>
              <div
                className={`mt-2 text-3xl font-semibold ${
                  report.mismatched_vehicle_count === 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                {report.mismatched_vehicle_count}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-4 border-b bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800">Vehicle Comparison</h2>
              <p className="text-sm text-gray-600">
                {mismatchRows.length === 0
                  ? "Everything matches for the selected period."
                  : `${mismatchRows.length} vehicle${mismatchRows.length === 1 ? "" : "s"} need attention.`}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white text-gray-500">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left">Vehicle</th>
                    <th className="px-4 py-3 text-left">Owner</th>
                    <th className="px-4 py-3 text-right">Internal Orders</th>
                    <th className="px-4 py-3 text-right">DHL Orders</th>
                    <th className="px-4 py-3 text-right">Order Diff</th>
                    <th className="px-4 py-3 text-right">Internal Revenue</th>
                    <th className="px-4 py-3 text-right">DHL Revenue</th>
                    <th className="px-4 py-3 text-right">Revenue Diff</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={`${row.plate_number}-${row.vehicle_id || "na"}`} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.plate_number}</td>
                      <td className="px-4 py-3 text-gray-700">{row.owner_name || "—"}</td>
                      <td className="px-4 py-3 text-right">{row.internal_order_count}</td>
                      <td className="px-4 py-3 text-right">{row.dhl_order_count}</td>
                      <td className="px-4 py-3 text-right">{row.order_count_difference}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(row.internal_revenue)}</td>
                      <td className="px-4 py-3 text-right">{formatMoney(row.dhl_revenue)}</td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          row.matched ? "text-green-700" : "text-amber-600"
                        }`}
                      >
                        {formatMoney(row.revenue_difference)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            row.matched
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {row.matched ? "Matched" : "Review"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default DhlReconciliationPage;
