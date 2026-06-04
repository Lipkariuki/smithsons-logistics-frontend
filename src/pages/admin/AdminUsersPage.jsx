import React, { useEffect, useMemo, useState } from "react";
import { Edit, Eye, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import Pagination from "../../components/Pagination";
import axios from "../../utils/axiosAuth";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  password: "",
  role: "driver",
};

const roleLabels = {
  admin: "Admin",
  owner: "Partner",
  driver: "Driver",
};

const roleOptions = [
  { value: "", label: "All Users" },
  { value: "driver", label: "Drivers" },
  { value: "owner", label: "Partners" },
  { value: "admin", label: "Admins" },
];

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-KE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
};

const filterUsersLocally = (items, { role, status, query }) => {
  const q = query.trim().toLowerCase();
  return items
    .filter((user) => {
      if (!role) return true;
      return user.role === role;
    })
    .filter((user) => {
      if (status === "active") return user.is_active !== false;
      if (status === "inactive") return user.is_active === false;
      return true;
    })
    .filter((user) => {
      if (!q) return true;
      return [user.name, user.phone, user.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (aDate !== bDate) return bDate - aDate;
      return (a.name || "").localeCompare(b.name || "");
    });
};

const isUnsupportedMethod = (err) => [404, 405].includes(err.response?.status);

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      try {
        const res = await axios.get("/users/manage", {
          params: {
            role: roleFilter || undefined,
            status: statusFilter,
            search: query.trim() || undefined,
            page,
            per_page: perPage,
          },
        });
        setUsers(Array.isArray(res.data?.items) ? res.data.items : []);
        setTotal(Number(res.data?.total || 0));
      } catch (err) {
        if (err.response?.status !== 404) throw err;

        const fallbackRes = await axios.get("/users/", {
          params: { include_inactive: true },
        });
        const filtered = filterUsersLocally(Array.isArray(fallbackRes.data) ? fallbackRes.data : [], {
          role: roleFilter,
          status: statusFilter,
          query,
        });
        const start = (page - 1) * perPage;
        setUsers(filtered.slice(start, start + perPage));
        setTotal(filtered.length);
      }
      setMessage((prev) => (prev.type === "error" ? { type: "", text: "" } : prev));
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Could not load users.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter, statusFilter, query, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter, query]);

  const pageRoleLabel = useMemo(() => {
    return roleOptions.find((option) => option.value === roleFilter)?.label || "All Users";
  }, [roleFilter]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingUser(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setSelectedUser(null);
    setEditingUser(null);
    setForm(emptyForm);
    setShowForm(true);
    setMessage({ type: "", text: "" });
  };

  const startEdit = (user) => {
    setSelectedUser(null);
    setEditingUser(user);
    setForm({
      name: user.name || "",
      phone: user.phone || "",
      email: user.email || "",
      password: "",
      role: user.role || "driver",
    });
    setShowForm(true);
    setMessage({ type: "", text: "" });
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Name is required.";
    if (!form.phone.trim()) return "Phone number is required.";
    if (!editingUser && form.password.trim().length < 6) {
      return "Password must be at least 6 characters.";
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return "Enter a valid email address.";
    }
    if (!["admin", "owner", "driver"].includes(form.role)) {
      return "Select a valid role.";
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
      role: form.role,
    };
    if (form.password.trim()) payload.password = form.password.trim();

    try {
      setSaving(true);
      if (editingUser) {
        await axios.put(`/users/${editingUser.id}`, payload);
        setMessage({ type: "success", text: "User updated successfully." });
      } else {
        await axios.post("/users/", payload);
        setMessage({ type: "success", text: "User created successfully." });
      }
      resetForm();
      await loadUsers();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Could not save user.",
      });
    } finally {
      setSaving(false);
    }
  };

  const deactivateUser = async (user) => {
    const confirmed = window.confirm(`Deactivate ${user.name}? They will be hidden from active assignment lists.`);
    if (!confirmed) return;

    try {
      setSaving(true);
      try {
        await axios.delete(`/users/${user.id}/deactivate`);
      } catch (err) {
        if (!isUnsupportedMethod(err)) throw err;

        try {
          await axios.put(`/users/${user.id}`, { is_active: false });
        } catch (fallbackErr) {
          if (user.role !== "driver" || !isUnsupportedMethod(fallbackErr)) throw fallbackErr;
          await axios.delete(`/users/drivers/${user.id}`);
        }
      }
      await loadUsers();
      setSelectedUser(null);
      setMessage({ type: "success", text: "User deactivated. Historical records remain intact." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Could not deactivate user.",
      });
    } finally {
      setSaving(false);
    }
  };

  const reactivateUser = async (user) => {
    try {
      setSaving(true);
      try {
        await axios.put(`/users/${user.id}/reactivate`);
      } catch (err) {
        if (!isUnsupportedMethod(err)) throw err;

        const endpoint = user.role === "driver" ? `/users/drivers/${user.id}` : `/users/${user.id}`;
        await axios.put(endpoint, { is_active: true });
      }
      await loadUsers();
      setSelectedUser(null);
      setMessage({ type: "success", text: "User reactivated successfully." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Could not reactivate user.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-page">
      <div className="app-hero">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="app-title">Users</h1>
            <p className="app-subtitle">Manage admins, partners, and drivers from one place.</p>
          </div>
          <button type="button" onClick={openCreateForm} className="app-button-primary gap-2">
            <Plus size={16} />
            Add User
          </button>
        </div>
      </div>

      {message.text && (
        <div className={message.type === "error" ? "app-alert-error" : "app-alert-success"}>
          {message.text}
        </div>
      )}

      <div className="app-card p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px]">
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2">
            <Search size={16} className="text-violet-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, phone, or email"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="app-select w-full"
          >
            {roleOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="app-select w-full"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="app-card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="app-section-title">{editingUser ? "Edit User" : "Add User"}</h2>
            <button type="button" onClick={resetForm} className="app-button-secondary gap-2 py-2">
              <X size={16} />
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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
            <select
              className="app-select"
              value={form.role}
              onChange={(event) => updateForm("role", event.target.value)}
            >
              <option value="driver">Driver</option>
              <option value="owner">Partner</option>
              <option value="admin">Admin</option>
            </select>
            <input
              className="app-input"
              value={form.password}
              onChange={(event) => updateForm("password", event.target.value)}
              placeholder={editingUser ? "New password" : "Password"}
              type="password"
              required={!editingUser}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="app-button-primary min-w-36" disabled={saving}>
              {saving ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      )}

      {selectedUser && (
        <div className="app-card p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase text-violet-500">{roleLabels[selectedUser.role] || selectedUser.role}</div>
              <h2 className="mt-1 text-xl font-semibold text-violet-950">{selectedUser.name}</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold uppercase text-violet-500">Phone</div>
                  <div>{selectedUser.phone || "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-violet-500">Email</div>
                  <div>{selectedUser.email || "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-violet-500">Created</div>
                  <div>{formatDate(selectedUser.created_at)}</div>
                </div>
              </div>
            </div>
            <button type="button" onClick={() => setSelectedUser(null)} className="app-button-secondary gap-2 py-2">
              <X size={16} />
              Close
            </button>
          </div>
        </div>
      )}

      <div className="app-table-shell">
        <div className="flex items-center justify-between gap-3 border-b border-violet-100 px-4 py-3">
          <div>
            <h2 className="app-section-title">{pageRoleLabel}</h2>
            <p className="text-sm text-violet-700/70">{total.toLocaleString()} user{total === 1 ? "" : "s"}</p>
          </div>
        </div>
        <table className="app-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone Number</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Date Created</th>
              <th className="w-64">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="font-semibold text-violet-950">{user.name}</td>
                  <td>{user.phone || <span className="text-slate-400">-</span>}</td>
                  <td>{user.email || <span className="text-slate-400">-</span>}</td>
                  <td>
                    <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                      {roleLabels[user.role] || user.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.is_active === false
                          ? "bg-rose-50 text-rose-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {user.is_active === false ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowForm(false);
                        }}
                        className="app-button-secondary gap-2 px-3 py-2 text-xs"
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(user)}
                        className="app-button-secondary gap-2 px-3 py-2 text-xs"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      {user.is_active === false ? (
                        <button
                          type="button"
                          onClick={() => reactivateUser(user)}
                          className="app-button-secondary gap-2 px-3 py-2 text-xs"
                          disabled={saving}
                        >
                          <RotateCcw size={14} />
                          Activate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => deactivateUser(user)}
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
              ))
            )}
          </tbody>
        </table>
        <div className="px-4 pb-4">
          <Pagination
            page={page}
            perPage={perPage}
            total={total}
            onPageChange={setPage}
            onPerPageChange={(nextPerPage) => {
              setPerPage(nextPerPage);
              setPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPage;
