import React, { useMemo, useState } from "react";

const CalculatorPage = () => {
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [commission, setCommission] = useState(0);

  const net = useMemo(() => {
    const r = Number(revenue) || 0;
    const e = Number(expenses) || 0;
    const c = Number(commission) || 0;
    return r - e - c;
  }, [revenue, expenses, commission]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-purple-700">Trip Calculator</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-gray-600">Revenue (KES)</label>
          <input type="number" className="w-full border rounded px-3 py-2" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Expenses (KES)</label>
          <input type="number" className="w-full border rounded px-3 py-2" value={expenses} onChange={(e) => setExpenses(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Commission (KES)</label>
          <input type="number" className="w-full border rounded px-3 py-2" value={commission} onChange={(e) => setCommission(e.target.value)} />
        </div>
      </div>
      <div className="text-lg">
        Net: <span className="font-semibold text-green-600">{net.toLocaleString()} KES</span>
      </div>
    </div>
  );
};

export default CalculatorPage;

