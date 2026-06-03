import React, { useEffect, useMemo, useState } from "react";
import { Edit, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import axios from "../../utils/axiosAuth";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  password: "",
};

const AdminDriversPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingDriver, setEditingDriver] = useState(null);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/users/", {
        params: { role: "driver", include_inactive: true },
      });
      setDrivers(Array.isArray(res.data) ? res.data : []);
      setMessage((prev) => (prev.type === "error" ? { type: "", text: "" } : prev));
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Could not load drivers.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const filteredDrivers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drivers
      .filter((driver) => {
        if (statusFilter === "active") return driver.is_active !== false;
        if (statusFilter === "inactive") return driver.is_active === false;
        return true;
      })
      .filter((driver) => {
        if (!q) return true;
        return [driver.name, driver.phone, driver.email]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [drivers, query, statusFilter]);

  const activeCount = drivers.filter((driver) => driver.is_active !== false).length;
  const inactiveCount = drivers.filter((driver) => driver.is_active === false).length;

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingDriver(null);
    setShowForm(false);
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Driver name is required.";
    if (!form.phone.trim()) return "Phone number is required.";
    if (!editingDriver && form.password.trim().length < 6) {
      return "Password must be at least 6 characters.";
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return "Enter a valid email address.";
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      role: "driver",
    };
    if (form.password.trim()) payload.password = form.password.trim();

    try {
      setSaving(true);
      setMessage({ type: "", text: "" });
      if (editingDriver) {
        await axios.put(`/users/drivers/${editingDriver.id}`, payload);
        setMessage({ type: "success", text: "Driver updated successfully." });
      } else {
        await axios.post("/users/drivers", payload);
        setMessage({ type: "success", text: "Driver added successfully." });
      }
      resetForm();
      await loadDrivers();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Could not save driver.",
      });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (driver) => {
    setEditingDriver(driver);
    setForm({
      name: driver.name || "",
      phone: driver.phone || "",
      email: driver.email || "",
      password: "",
    });
    setShowForm(true);
    setMessage({ type: "", text: "" });
  };

  const deactivateDriver = async (driver) => {
    const confirmed = window.confirm(`Deactivate ${driver.name}? They will no longer appear in assignment lists.`);
    if (!confirmed) return;
    try {
      setSaving(true);
      await axios.delete(`/users/drivers/${driver.id}`);
      await loadDrivers();
      setMessage({ type: "success", text: "Driver deactivated. Historical records remain intact." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Could not deactivate driver.",
      });
    } finally {
      setSaving(false);
    }
  };

  const reactivateDriver = async (driver) => {
    try {
      setSaving(true);
      await axios.put(`/users/drivers/${driver.id}`, { is_active: true });
      await loadDrivers();
      setMessage({ type: "success", text: "Driver reactivated successfully." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Could not reactivate driver.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="app-page">Loading drivers...</div>;
  }

  return (
    <div className="app-page">
      <div className="app-hero">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="app-title">Driver Management</h1>
            <p className="app-subtitle">Create drivers, update their details, and deactivate access without losing trip history.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (showForm && !editingDriver) {
                resetForm();
              } else {
                setEditingDriver(null);
                setForm(emptyForm);
                setShowForm(true);
                setMessage({ type: "", text: "" });
              }
            }}
            className="app-button-primary gap-2"
          >
            {showForm && !editingDriver ? <X size={16} /> : <Plus size={16} />}
            {showForm && !editingDriver ? "Close" : "Add Driver"}
          </button>
        </div>
      </div>

      {message.text && (
        <div className={message.type === "error" ? "app-alert-error" : "app-alert-success"}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="app-stat-card">
          <div className="app-stat-label">Active</div>
          <div className="mt-2 text-3xl font-bold text-violet-950">{activeCount}</div>
        </div>
        <div className="app-stat-card">
          <div className="app-stat-label">Inactive</div>
          <div className="mt-2 text-3xl font-bold text-violet-950">{inactiveCount}</div>
        </div>
        <div className="app-stat-card">
          <div className="app-stat-label">Total</div>
          <div className="mt-2 text-3xl font-bold text-violet-950">{drivers.length}</div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="app-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="app-section-title">{editingDriver ? "Edit Driver" : "Add Driver"}</h2>
            {editingDriver && (
              <button type="button" onClick={resetForm} className="app-button-secondary gap-2 py-2">
                <X size={16} />
                Cancel
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              className="app-input"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="Full name"
              required
            />
            <input
              className="app-input"
              value={form.phone}
              onChange={(event) => updateForm("phone", event.target.value)}
              placeholder="Phone number"
              required
            />
            <input
              className="app-input"
              value={form.email}
              onChange={(event) => updateForm("email", event.target.value)}
              placeholder="Email address"
              type="email"
            />
            <input
              className="app-input"
              value={form.password}
              onChange={(event) => updateForm("password", event.target.value)}
              placeholder={editingDriver ? "New password" : "Password"}
              type="password"
              required={!editingDriver}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="app-button-primary min-w-36" disabled={saving}>
              {saving ? "Saving..." : editingDriver ? "Save Changes" : "Create Driver"}
            </button>
          </div>
        </form>
      )}

      <div className="app-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2">
            <Search size={16} className="text-violet-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search drivers"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="app-select w-full md:w-48"
          >
            <option value="active">Active drivers</option>
            <option value="inactive">Inactive drivers</option>
            <option value="all">All drivers</option>
          </select>
        </div>
      </div>

      <div className="app-table-shell">
        <table className="app-table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Status</th>
              <th className="w-52">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.map((driver) => (
              <tr key={driver.id}>
                <td className="font-semibold text-violet-950">{driver.name}</td>
                <td>{driver.phone || <span className="text-slate-400">-</span>}</td>
                <td>{driver.email || <span className="text-slate-400">-</span>}</td>
                <td>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      driver.is_active === false
                        ? "bg-rose-50 text-rose-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {driver.is_active === false ? "Inactive" : "Active"}
                  </span>
                </td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(driver)}
                      className="app-button-secondary gap-2 px-3 py-2 text-xs"
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    {driver.is_active === false ? (
                      <button
                        type="button"
                        onClick={() => reactivateDriver(driver)}
                        className="app-button-secondary gap-2 px-3 py-2 text-xs"
                        disabled={saving}
                      >
                        <RotateCcw size={14} />
                        Activate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => deactivateDriver(driver)}
                        className="app-button-danger gap-2 px-3 py-2 text-xs"
                        disabled={saving}
                      >
                        <Trash2 size={14} />
                        Deactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredDrivers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  No drivers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDriversPage;
