// src/utils/axiosAuth.js
import axios from "axios";

const axiosAuth = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // ✅ now uses env var
});

axiosAuth.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosAuth;

// Expiration is an authentication failure; 403 remains a permission denial.
let redirecting = false;
axiosAuth.interceptors.response.use(response => response, error => {
  const endpoint = (error.config?.url || "").split("?")[0].replace(/\/+$/, "").split("/").pop();
  if (error.response?.status === 401 && endpoint !== "login") {
    const sent = error.config?.headers?.Authorization;
    const current = localStorage.getItem("token");
    // An old in-flight request must not clear a newly signed-in session.
    if (current && sent === `Bearer ${current}`) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login" && !redirecting) {
        redirecting = true;
        window.location.replace("/login");
      }
    }
  }
  return Promise.reject(error);
});
