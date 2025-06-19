// src/pages/driver/DriverHomePage.jsx

import React from "react";
import { useNavigate } from "react-router-dom";

const DriverHomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">👋 Welcome, Driver!</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={() => navigate("/driver/trips")}
          className="cursor-pointer bg-white rounded-lg shadow-md p-6 hover:bg-purple-50"
        >
          <h2 className="text-xl font-semibold text-purple-600">🚚 My Trips</h2>
          <p className="text-gray-600">View all your assigned trips and dispatch notes.</p>
        </div>

        <div
          onClick={() => navigate("/driver/expenses")}
          className="cursor-pointer bg-white rounded-lg shadow-md p-6 hover:bg-purple-50"
        >
          <h2 className="text-xl font-semibold text-purple-600">💵 My Expenses</h2>
          <p className="text-gray-600">Submit and view trip expenses.</p>
        </div>
      </div>
    </div>
  );
};

export default DriverHomePage;
