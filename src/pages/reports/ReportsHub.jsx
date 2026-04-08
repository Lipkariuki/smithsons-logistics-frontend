import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Scale, Truck } from "lucide-react";

const ReportsHub = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-violet-950">Reports Center</h1>
          <p className="text-sm text-violet-700/80">
            Choose an internal report or manage DHL payout reports for partners.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-violet-100 shadow-[0_18px_40px_-24px_rgba(88,28,135,0.45)] p-6 space-y-4">
          <div className="flex items-center gap-3 text-violet-700">
            <FileText size={22} />
            <h2 className="text-lg font-semibold">Internal Reports</h2>
          </div>
          <p className="text-sm text-violet-700/80">
            Review trip earnings, fuel usage, and operational expenses based on internal records.
          </p>
          <button
            onClick={() => navigate("/admin/reports/internal")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-4 py-2 text-white hover:from-violet-800 hover:to-fuchsia-700 transition"
          >
            Open Internal Reports
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-violet-100 shadow-[0_18px_40px_-24px_rgba(88,28,135,0.45)] p-6 space-y-4">
          <div className="flex items-center gap-3 text-violet-700">
            <Truck size={22} />
            <h2 className="text-lg font-semibold">DHL Payout Reports</h2>
          </div>
          <p className="text-sm text-violet-700/80">
            Upload DHL files, calculate payouts per truck, and generate partner payslips.
          </p>
          <button
            onClick={() => navigate("/admin/reports/dhl")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-4 py-2 text-white hover:from-violet-800 hover:to-fuchsia-700 transition"
          >
            Open DHL Reports
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-violet-100 shadow-[0_18px_40px_-24px_rgba(88,28,135,0.45)] p-6 space-y-4">
          <div className="flex items-center gap-3 text-violet-700">
            <Scale size={22} />
            <h2 className="text-lg font-semibold">DHL Reconciliation</h2>
          </div>
          <p className="text-sm text-violet-700/80">
            Compare internal orders against DHL records and quickly spot month-end differences.
          </p>
          <button
            onClick={() => navigate("/admin/reports/dhl-reconciliation")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-4 py-2 text-white hover:from-violet-800 hover:to-fuchsia-700 transition"
          >
            Open Reconciliation
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsHub;
