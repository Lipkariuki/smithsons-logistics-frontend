import React, { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import axios from "../utils/axiosAuth"; // ✅ Use shared axios instance

function AdminEarnings() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get("/admin/earnings") // ✅ No more localhost
      .then((res) => setData(res.data))
      .catch((err) => console.error("Failed to fetch admin earnings:", err));
  }, []);

  if (!data) return <p className="p-4">Loading earnings data...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-purple-700">Admin Earnings</h1>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <h2 className="text-xl font-bold text-green-700">
              Ksh {data.totalRevenue.toLocaleString()}
            </h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">Total Commission</p>
            <h2 className="text-xl font-bold text-blue-700">
              Ksh {data.totalCommission.toLocaleString()}
            </h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">Expenses (Your Trucks)</p>
            <h2 className="text-xl font-bold text-red-600">
              Ksh {data.expenses.toLocaleString()}
            </h2>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500 mb-2">Monthly Commission Trend</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.commissionTrend}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="commission" fill="#7c3aed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default AdminEarnings;
