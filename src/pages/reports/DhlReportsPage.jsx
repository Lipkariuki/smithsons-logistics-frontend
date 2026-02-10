import React, { useEffect, useMemo, useState } from "react";
import axiosAuth from "../../utils/axiosAuth";

const currency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" });

const formatMoney = (value) => currency.format(Number(value || 0));

const DhlReportsPage = () => {
  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth(), 1);
    return base.toISOString().slice(0, 10);
  }, [today]);
  const defaultEnd = useMemo(() => today.toISOString().slice(0, 10), [today]);

  const [owners, setOwners] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [ownerId, setOwnerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const [payslipVehicleId, setPayslipVehicleId] = useState("");
  const [commissionRate, setCommissionRate] = useState(0.07);
  const [expenses, setExpenses] = useState([
    { name: "Fuel", amount: "" },
    { name: "Trip Expenses", amount: "" },
  ]);
  const [payslip, setPayslip] = useState(null);
  const [savingPayslip, setSavingPayslip] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      axiosAuth.get("/users/", { params: { role: "owner,admin" } }).catch(() => ({ data: [] })),
      axiosAuth.get("/vehicles/").catch(() => ({ data: [] })),
    ]).then(([ownersResp, vehiclesResp]) => {
      if (!mounted) return;
      setOwners(Array.isArray(ownersResp.data) ? ownersResp.data : []);
      setVehicles(Array.isArray(vehiclesResp.data) ? vehiclesResp.data : []);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const fetchSummary = () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (ownerId) params.set("owner_id", ownerId);
    if (vehicleId) params.set("vehicle_id", vehicleId);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    axiosAuth
      .get(`/dhl-reports/summary?${params.toString()}`)
      .then((res) => {
        setSummary(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => setError(err.response?.data?.detail || "Failed to load DHL summary"))
      .finally(() => setLoading(false));
  };

  const handleUpload = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setMessage("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axiosAuth.post("/dhl-reports/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(`Uploaded. Inserted ${res.data.inserted}. Unmatched vehicles ${res.data.unmatched_vehicles}.`);
      fetchSummary();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to upload DHL report");
    } finally {
      setUploading(false);
      evt.target.value = "";
    }
  };

  const loadPayslip = async () => {
    if (!payslipVehicleId || !startDate || !endDate) return;
    try {
      const res = await axiosAuth.get("/dhl-reports/payslips", {
        params: {
          vehicle_id: payslipVehicleId,
          start_date: startDate,
          end_date: endDate,
        },
      });
      const match = Array.isArray(res.data) ? res.data[0] : null;
      if (match) {
        setPayslip(match);
        setCommissionRate(match.commission_rate ?? 0.07);
        setExpenses(match.expenses?.length ? match.expenses : []);
      } else {
        setPayslip(null);
        setExpenses([
          { name: "Fuel", amount: "" },
          { name: "Trip Expenses", amount: "" },
        ]);
      }
    } catch {
      setPayslip(null);
    }
  };

  useEffect(() => {
    loadPayslip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payslipVehicleId, startDate, endDate]);

  const updateExpense = (idx, field, value) => {
    setExpenses((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const addExpense = () => {
    setExpenses((prev) => [...prev, { name: "", amount: "" }]);
  };

  const removeExpense = (idx) => {
    setExpenses((prev) => prev.filter((_, i) => i !== idx));
  };

  const savePayslip = async () => {
    if (!payslipVehicleId) {
      setError("Select a vehicle to generate a payslip.");
      return;
    }
    setSavingPayslip(true);
    setError("");
    const payloadExpenses = expenses
      .filter((item) => item.name && item.amount !== "")
      .map((item) => ({ name: item.name, amount: Number(item.amount) || 0 }));
    try {
      let res;
      if (payslip) {
        res = await axiosAuth.put(`/dhl-reports/payslips/${payslip.id}`, {
          commission_rate: Number(commissionRate),
          expenses: payloadExpenses,
        });
      } else {
        res = await axiosAuth.post("/dhl-reports/payslips", {
          vehicle_id: Number(payslipVehicleId),
          period_start: startDate,
          period_end: endDate,
          commission_rate: Number(commissionRate),
          expenses: payloadExpenses,
        });
      }
      setPayslip(res.data);
      setMessage("Payslip saved.");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save payslip");
    } finally {
      setSavingPayslip(false);
    }
  };

  const sendPayslip = async () => {
    if (!payslip) return;
    try {
      await axiosAuth.post(`/dhl-reports/payslips/${payslip.id}/send`);
      setMessage("Payslip stored and marked as sent.");
      loadPayslip();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send payslip");
    }
  };

  const downloadPayslip = async () => {
    if (!payslip) return;
    try {
      const res = await axiosAuth.get(`/dhl-reports/payslips/${payslip.id}/pdf`, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to download payslip PDF");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">DHL Payout Reports</h1>
          <p className="text-sm text-gray-600">
            Upload DHL monthly files, review revenue, and generate partner payslips.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <span className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition">
            {uploading ? "Uploading..." : "Upload DHL Excel"}
          </span>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {(error || message) && (
        <div className={`text-sm ${error ? "text-red-600" : "text-green-700"}`}>
          {error || message}
        </div>
      )}

      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500">Owner</label>
            <select
              className="border rounded px-3 py-2"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
            >
              <option value="">All owners</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500">Vehicle</label>
            <select
              className="border rounded px-3 py-2"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">All vehicles</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate_number}
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
          <button
            onClick={fetchSummary}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="text-lg font-semibold text-gray-800">DHL Monthly Summary</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Vehicle</th>
                <th className="px-4 py-2 text-left">Owner</th>
                <th className="px-4 py-2 text-right">Orders</th>
                <th className="px-4 py-2 text-right">Distribution</th>
                <th className="px-4 py-2 text-right">Offloading</th>
                <th className="px-4 py-2 text-right">Total Revenue</th>
                <th className="px-4 py-2 text-right">Expenses</th>
                <th className="px-4 py-2 text-right">Net Pay</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={`${row.vehicle_id}-${row.plate_number}`} className="border-t">
                  <td className="px-4 py-2 font-medium text-blue-700">{row.plate_number}</td>
                  <td className="px-4 py-2">{row.owner_name || "—"}</td>
                  <td className="px-4 py-2 text-right">{row.order_count}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(row.distribution_cost)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(row.offloading_cost)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-green-700">
                    {formatMoney(row.total_revenue)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {row.total_expenses != null ? formatMoney(row.total_expenses) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {row.net_pay != null ? formatMoney(row.net_pay) : "—"}
                  </td>
                </tr>
              ))}
              {summary.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                    {loading ? "Loading..." : "No DHL summary available for the selected period."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-4 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Generate Payslip</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500">Vehicle</label>
            <select
              className="border rounded px-3 py-2"
              value={payslipVehicleId}
              onChange={(e) => setPayslipVehicleId(e.target.value)}
            >
              <option value="">Select vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate_number}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500">Commission rate</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end gap-3">
            <button
              onClick={savePayslip}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              disabled={savingPayslip}
            >
              {savingPayslip ? "Saving..." : payslip ? "Update Payslip" : "Create Payslip"}
            </button>
            {payslip && (
              <>
                <button
                  onClick={downloadPayslip}
                  className="border border-blue-200 text-blue-700 px-4 py-2 rounded hover:bg-blue-50"
                >
                  Download PDF
                </button>
                <button
                  onClick={sendPayslip}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                >
                  Store & Send
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-700">Monthly Expenses</h3>
            <button
              onClick={addExpense}
              className="text-sm text-blue-700 hover:underline"
              type="button"
            >
              Add expense
            </button>
          </div>

          {expenses.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Expense name"
                value={item.name}
                onChange={(e) => updateExpense(idx, "name", e.target.value)}
                className="border rounded px-3 py-2"
              />
              <input
                type="number"
                placeholder="Amount"
                value={item.amount}
                onChange={(e) => updateExpense(idx, "amount", e.target.value)}
                className="border rounded px-3 py-2"
              />
              <div className="flex items-center">
                <button
                  onClick={() => removeExpense(idx)}
                  className="text-sm text-red-600 hover:underline"
                  type="button"
                  disabled={expenses.length <= 1}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {payslip && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            <p className="font-semibold">Payslip totals</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
              <div>
                <span className="text-xs text-blue-700">Total Revenue</span>
                <p className="font-medium">{formatMoney(payslip.total_revenue)}</p>
              </div>
              <div>
                <span className="text-xs text-blue-700">Commission</span>
                <p className="font-medium">{formatMoney(payslip.commission_amount)}</p>
              </div>
              <div>
                <span className="text-xs text-blue-700">Net Pay</span>
                <p className="font-medium">{formatMoney(payslip.net_pay)}</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default DhlReportsPage;
