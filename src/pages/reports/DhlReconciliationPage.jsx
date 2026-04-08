import React, { useMemo, useState } from "react";
import axiosAuth from "../../utils/axiosAuth";

const currency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" });

const formatMoney = (value) => currency.format(Number(value || 0));
const MAX_REFERENCE_PREVIEW = 12;

const summaryCardStyles = [
  {
    title: "Internal Orders",
    valueClassName: "text-violet-950",
    accentClassName: "from-violet-500 to-fuchsia-500",
  },
  {
    title: "DHL Orders",
    valueClassName: "text-violet-950",
    accentClassName: "from-fuchsia-500 to-purple-500",
  },
  {
    title: "Revenue Difference",
    valueClassName: "",
    accentClassName: "from-amber-400 to-orange-500",
  },
  {
    title: "Mismatched Vehicles",
    valueClassName: "",
    accentClassName: "from-violet-700 to-purple-900",
  },
];

const getRowKey = (row) => `${row.plate_number}-${row.vehicle_id || "na"}`;

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
  const [selectedRowKey, setSelectedRowKey] = useState("");

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
      setSelectedRowKey("");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load reconciliation report");
    } finally {
      setLoading(false);
    }
  };

  const mismatchRows = report?.rows?.filter((row) => !row.matched) || [];
  const selectedRow =
    report?.rows?.find((row) => getRowKey(row) === selectedRowKey) || mismatchRows[0] || null;
  const selectedInternalOnly = selectedRow?.internal_only_order_numbers || [];
  const selectedDhlOnly = selectedRow?.dhl_only_order_numbers || [];
  const hasSelectedMismatch = selectedInternalOnly.length > 0 || selectedDhlOnly.length > 0;

  return (
    <div className="app-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="app-title">DHL Reconciliation</h1>
          <p className="app-subtitle">
            Compare internal records against DHL totals for the month and spot any differences quickly.
          </p>
        </div>
      </div>

      <section className="app-card-soft p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-violet-700">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="app-input"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-violet-700">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="app-input"
            />
          </div>
          <button
            onClick={fetchReport}
            className="app-button-primary"
            disabled={loading}
          >
            {loading ? "Loading..." : "Check Month"}
          </button>
        </div>
        {error && <div className="app-alert-error">{error}</div>}
      </section>

      {report && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {summaryCardStyles.map((card, index) => {
              const values = [
                report.internal_order_count,
                report.dhl_order_count,
                formatMoney(report.revenue_difference),
                report.mismatched_vehicle_count,
              ];
              const valueClassNames = [
                "text-violet-950",
                "text-violet-950",
                report.revenue_difference === 0 ? "text-emerald-700" : "text-amber-600",
                report.mismatched_vehicle_count === 0 ? "text-emerald-700" : "text-rose-600",
              ];
              return (
                <div
                  key={card.title}
                  className="relative overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_18px_40px_-24px_rgba(88,28,135,0.45)] p-5"
                >
                  <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.accentClassName}`} />
                  <div className="text-xs uppercase tracking-[0.24em] text-violet-500">{card.title}</div>
                  <div className={`mt-3 text-3xl font-semibold ${valueClassNames[index]}`}>{values[index]}</div>
                </div>
              );
            })}
          </section>

          {selectedRow && (
            <section className="rounded-2xl border border-violet-100 bg-white shadow-[0_18px_40px_-24px_rgba(88,28,135,0.45)] overflow-hidden">
              <div className="border-b border-violet-100 bg-gradient-to-r from-violet-950 via-violet-900 to-fuchsia-800 px-5 py-4 text-white">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Review Mismatch</h2>
                    <p className="text-sm text-violet-100">
                      {selectedRow.plate_number} {selectedRow.owner_name ? `· ${selectedRow.owner_name}` : ""}
                    </p>
                  </div>
                  <div className="text-sm text-violet-100">
                    {hasSelectedMismatch
                      ? "Order numbers below are present on one side only."
                      : "Counts or revenue differ, but order numbers currently line up."}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2">
                <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-violet-950">Internal only</h3>
                      <p className="text-xs text-violet-600">Present internally but missing from DHL.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700">
                      {selectedInternalOnly.length}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedInternalOnly.length ? (
                      selectedInternalOnly.slice(0, MAX_REFERENCE_PREVIEW).map((value) => (
                        <span
                          key={`internal-${value}`}
                          className="rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-800 shadow-sm"
                        >
                          {value}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-violet-500">No missing internal order numbers.</span>
                    )}
                  </div>
                  {selectedInternalOnly.length > MAX_REFERENCE_PREVIEW && (
                    <div className="mt-3 text-xs text-violet-500">
                      +{selectedInternalOnly.length - MAX_REFERENCE_PREVIEW} more internal order numbers
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-fuchsia-950">DHL only</h3>
                      <p className="text-xs text-fuchsia-700">Present in DHL but missing internally.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-fuchsia-700">
                      {selectedDhlOnly.length}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedDhlOnly.length ? (
                      selectedDhlOnly.slice(0, MAX_REFERENCE_PREVIEW).map((value) => (
                        <span
                          key={`dhl-${value}`}
                          className="rounded-full bg-white px-3 py-1 text-xs font-medium text-fuchsia-800 shadow-sm"
                        >
                          {value}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-fuchsia-500">No missing DHL order numbers.</span>
                    )}
                  </div>
                  {selectedDhlOnly.length > MAX_REFERENCE_PREVIEW && (
                    <div className="mt-3 text-xs text-fuchsia-500">
                      +{selectedDhlOnly.length - MAX_REFERENCE_PREVIEW} more DHL order numbers
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-violet-100 bg-white shadow-[0_18px_40px_-24px_rgba(88,28,135,0.45)] overflow-hidden">
            <div className="px-4 py-4 border-b border-violet-100 bg-violet-50/70">
              <h2 className="text-lg font-semibold text-violet-950">Vehicle Comparison</h2>
              <p className="text-sm text-violet-700/80">
                {mismatchRows.length === 0
                  ? "Everything matches for the selected period."
                  : `${mismatchRows.length} vehicle${mismatchRows.length === 1 ? "" : "s"} need attention.`}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white text-violet-600">
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
                    <th className="px-4 py-3 text-center">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr
                      key={getRowKey(row)}
                      className={`border-b last:border-b-0 ${
                        selectedRowKey === getRowKey(row) ? "bg-violet-50/70" : "bg-white"
                      }`}
                    >
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
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {row.matched ? "Matched" : "Review"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.matched ? (
                          <span className="text-xs text-violet-300">—</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedRowKey(getRowKey(row))}
                            className="rounded-full border border-violet-200 px-3 py-1 text-xs font-medium text-violet-700 transition hover:border-violet-400 hover:bg-violet-50"
                          >
                            Review
                          </button>
                        )}
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
