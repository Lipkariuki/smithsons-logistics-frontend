import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axiosAuth";
import { jwtDecode } from "jwt-decode";

const Login = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const params = new URLSearchParams();
      params.append("username", phone);
      params.append("password", password);

      const response = await axios.post("login", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const token = response.data.access_token;
      localStorage.setItem("token", token);

      const decoded = jwtDecode(token);
      const role = decoded.role;

      if (role === "admin") {
        navigate("/admin/dashboard");
      } else if (role === "owner") {
        navigate("/partner/dashboard");
      } else if (role === "driver") {
        navigate("/driver/home");
      } else {
        setError("Unknown user role. Access denied.");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("Invalid phone or password");
    }
  };

  const handleSignupClick = () => {
    alert("🚧 Signup is currently disabled. Please contact admin.");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-purple-700">Smithsons Logistics</h1>
          <p className="text-sm text-gray-600">Powering Every Trip. Empowering Every Partner.</p>
        </div>
        <h2 className="text-xl font-bold text-center mb-2">🔐 Welcome Back</h2>
        <p className="text-center text-gray-600 mb-6">Login to your dashboard</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Phone"
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border border-gray-300 px-4 py-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-purple-600 text-white font-semibold py-2 rounded hover:bg-purple-700"
          >
            Login
          </button>
        </form>

        <div className="text-center mt-4 text-sm text-gray-600">
          Don’t have an account?{" "}
          <button
            onClick={handleSignupClick}
            className="text-purple-700 font-medium hover:underline"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
