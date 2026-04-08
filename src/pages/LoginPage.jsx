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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-4">
      <div className="w-full max-w-md rounded-[2rem] border border-violet-100 bg-white/95 p-8 shadow-[0_24px_70px_-28px_rgba(88,28,135,0.45)]">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-violet-900">Smithsons Logistics</h1>
          <p className="text-sm text-violet-700/80">Powering Every Trip. Empowering Every Partner.</p>
        </div>
        <h2 className="mb-2 text-center text-2xl font-bold text-violet-950">Welcome Back</h2>
        <p className="mb-6 text-center text-violet-700/80">Login to your dashboard</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Phone"
            className="app-input w-full px-4 py-3"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="app-input w-full px-4 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="app-alert-error text-center">{error}</p>
          )}
          <button
            type="submit"
            className="app-button-primary w-full py-3"
          >
            Login
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-violet-700/80">
          Don’t have an account?{" "}
          <button
            onClick={handleSignupClick}
            className="font-medium text-violet-700 hover:underline"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
