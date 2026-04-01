import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Scale, Truck } from "lucide-react";

const ReportsHub = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-purple-700">Reports Center</h1>
          <p className="text-sm text-gray-600">
            Choose an internal report or manage DHL payout reports for partners.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 text-purple-700">
            <FileText size={22} />
            <h2 className="text-lg font-semibold">Internal Reports</h2>
          </div>
          <p className="text-sm text-gray-600">
            Review trip earnings, fuel usage, and operational expenses based on internal records.
          </p>
          <button
            onClick={() => navigate("/admin/reports/internal")}
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition"
          >
            Open Internal Reports
          </button>
        </div>

        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 text-blue-700">
            <Truck size={22} />
            <h2 className="text-lg font-semibold">DHL Payout Reports</h2>
          </div>
          <p className="text-sm text-gray-600">
            Upload DHL files, calculate payouts per truck, and generate partner payslips.
          </p>
          <button
            onClick={() => navigate("/admin/reports/dhl")}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            Open DHL Reports
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 text-slate-700">
            <Scale size={22} />
            <h2 className="text-lg font-semibold">DHL Reconciliation</h2>
          </div>
          <p className="text-sm text-gray-600">
            Compare internal orders against DHL records and quickly spot month-end differences.
          </p>
          <button
            onClick={() => navigate("/admin/reports/dhl-reconciliation")}
            className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-900 transition"
          >
            Open Reconciliation
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsHub;
