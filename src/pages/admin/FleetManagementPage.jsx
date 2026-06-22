import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Car,
  ClipboardCheck,
  Gauge,
  History,
  Save,
  ShieldCheck,
  UserRoundCheck,
  Wrench,
  X,
} from "lucide-react";

import axios from "../../utils/axiosAuth";

const emptyVehicle = {
  registration_number: "",
  owner_id: "",
  size: "",
  make_model: "",
  insurance_provider: "",
  insurance_policy_number: "",
  insurance_expiry_date: "",
  inspection_expiry_date: "",
  service_interval_km: "",
  current_mileage: "",
  last_service_date: "",
  last_service_mileage: "",
  next_service_due_mileage: "",
};

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "drivers", label: "Driver Compliance", icon: UserRoundCheck },
  { id: "history", label: "Notification History", icon: History },
];

const dateText = (value) => {
  if (!value) return "Not set";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(parsed);
};

const numberText = (value) =>
  value === null || value === undefined || value === ""
    ? "Not set"
    : `${Number(value).toLocaleString()} km`;

const optionalNumber = (value) =>
  value === "" || value === null || value === undefined ? null : Number(value);

const buildVehiclePayload = (form) => ({
  registration_number: form.registration_number.trim().toUpperCase(),
  owner_id: optionalNumber(form.owner_id),
  size: form.size.trim() || null,
  make_model: form.make_model.trim() || null,
  insurance_provider: form.insurance_provider.trim() || null,
  insurance_policy_number: form.insurance_policy_number.trim() || null,
  insurance_expiry_date: form.insurance_expiry_date || null,
  inspection_expiry_date: form.inspection_expiry_date || null,
  service_interval_km: optionalNumber(form.service_interval_km),
  current_mileage: optionalNumber(form.current_mileage),
  last_service_date: form.last_service_date || null,
  last_service_mileage: optionalNumber(form.last_service_mileage),
  next_service_due_mileage: optionalNumber(form.next_service_due_mileage),
});

const Field = ({ label, ...props }) => (
  <label className="space-y-1 text-sm">
    <span className="font-medium text-slate-700">{label}</span>
    <input
      {...props}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
    />
  </label>
);

const SummaryCard = ({ title, count, icon: Icon, tone }) => (
  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-slate-900">{count || 0}</p>
      </div>
      <div className={`rounded-xl p-3 ${tone}`}>
        <Icon size={22} />
      </div>
    </div>
  </div>
);

const AlertList = ({ title, icon: Icon, items, renderItem }) => (
  <section className="rounded-xl border border-slate-100 bg-white shadow-sm">
    <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
      <Icon size={18} className="text-violet-600" />
      <h2 className="font-semibold text-slate-800">{title}</h2>
    </div>
    <div className="divide-y divide-slate-100">
      {items?.length ? (
        items.map(renderItem)
      ) : (
        <p className="px-4 py-6 text-sm text-slate-500">No records due soon.</p>
      )}
    </div>
  </section>
);

const FleetManagementPage = () => {
  const [tab, setTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [owners, setOwners] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [vehicleForm, setVehicleForm] = useState(null);
  const [driverForm, setDriverForm] = useState(null);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, vehiclesRes, driversRes, ownersRes, historyRes] =
        await Promise.all([
          axios.get("/fleet/dashboard"),
          axios.get("/fleet/vehicles"),
          axios.get("/fleet/drivers"),
          axios.get("/users/", { params: { role: "owner" } }),
          axios.get("/fleet/notifications", { params: { limit: 200 } }),
        ]);
      setDashboard(dashboardRes.data);
      setVehicles(Array.isArray(vehiclesRes.data) ? vehiclesRes.data : []);
      setDrivers(Array.isArray(driversRes.data) ? driversRes.data : []);
      setOwners(Array.isArray(ownersRes.data) ? ownersRes.data : []);
      setNotifications(Array.isArray(historyRes.data) ? historyRes.data : []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.detail || "Could not load fleet management data.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return vehicles;
    return vehicles.filter((vehicle) =>
      [
        vehicle.registration_number,
        vehicle.make_model,
        vehicle.owner_name,
        vehicle.insurance_provider,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [vehicles, search]);

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return drivers;
    return drivers.filter((driver) =>
      [driver.name, driver.phone, driver.driver_license_number]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [drivers, search]);

  const openVehicle = (vehicle = null) => {
    setVehicleForm(
      vehicle
        ? Object.fromEntries(
            Object.keys(emptyVehicle).map((key) => [key, vehicle[key] ?? ""]),
          )
        : { ...emptyVehicle },
    );
    if (vehicle) setVehicleForm((current) => ({ ...current, id: vehicle.id }));
    setMessage({ type: "", text: "" });
  };

  const saveVehicle = async (event) => {
    event.preventDefault();
    const payload = buildVehiclePayload(vehicleForm);
    if (!payload.registration_number) {
      setMessage({ type: "error", text: "Registration number is required." });
      return;
    }
    try {
      setSaving(true);
      if (vehicleForm.id) {
        await axios.put(`/fleet/vehicles/${vehicleForm.id}`, payload);
      } else {
        await axios.post("/fleet/vehicles", payload);
      }
      setVehicleForm(null);
      setMessage({ type: "success", text: "Vehicle compliance record saved." });
      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.detail || "Could not save vehicle.",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveDriver = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await axios.put(`/fleet/drivers/${driverForm.id}`, {
        driver_license_number: driverForm.driver_license_number.trim() || null,
        driver_license_expiry_date:
          driverForm.driver_license_expiry_date || null,
      });
      setDriverForm(null);
      setMessage({ type: "success", text: "Driver compliance record saved." });
      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.detail || "Could not save driver compliance.",
      });
    } finally {
      setSaving(false);
    }
  };

  const runNotifications = async () => {
    try {
      setSaving(true);
      const response = await axios.post("/fleet/notifications/run");
      const result = response.data;
      setMessage({
        type: "success",
        text: `Check complete: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed.`,
      });
      await loadData();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.detail || "Notification check failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !dashboard) {
    return <div className="p-6 text-slate-600">Loading Fleet Management…</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-violet-800">Fleet Management</h1>
          <p className="text-sm text-slate-500">
            Vehicle maintenance, document compliance, and reminder audit.
          </p>
        </div>
        <button
          type="button"
          onClick={runNotifications}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          <Bell size={17} />
          Run reminder check
        </button>
      </div>

      {message.text && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setSearch("");
            }}
            className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
              tab === id
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              title="Insurance expiring"
              count={dashboard?.counts?.insurance_expiring_soon}
              icon={ShieldCheck}
              tone="bg-amber-50 text-amber-700"
            />
            <SummaryCard
              title="Inspections expiring"
              count={dashboard?.counts?.inspections_expiring_soon}
              icon={ClipboardCheck}
              tone="bg-blue-50 text-blue-700"
            />
            <SummaryCard
              title="Service due soon"
              count={dashboard?.counts?.vehicles_due_for_service}
              icon={Wrench}
              tone="bg-red-50 text-red-700"
            />
            <SummaryCard
              title="Licenses expiring"
              count={dashboard?.counts?.driver_licenses_expiring_soon}
              icon={UserRoundCheck}
              tone="bg-violet-50 text-violet-700"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <AlertList
              title="Insurance expiring within 30 days"
              icon={ShieldCheck}
              items={dashboard?.insurance_expiring_soon}
              renderItem={(item) => (
                <div key={item.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-medium">{item.registration_number}</span>
                  <span className="text-slate-500">{dateText(item.insurance_expiry_date)}</span>
                </div>
              )}
            />
            <AlertList
              title="Inspections expiring within 30 days"
              icon={ClipboardCheck}
              items={dashboard?.inspections_expiring_soon}
              renderItem={(item) => (
                <div key={item.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-medium">{item.registration_number}</span>
                  <span className="text-slate-500">{dateText(item.inspection_expiry_date)}</span>
                </div>
              )}
            />
            <AlertList
              title="Vehicles due for service"
              icon={Wrench}
              items={dashboard?.vehicles_due_for_service}
              renderItem={(item) => (
                <div key={item.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-medium">{item.registration_number}</span>
                  <span className={item.service_km_remaining <= 0 ? "text-red-600" : "text-slate-500"}>
                    {item.service_km_remaining <= 0
                      ? `${Math.abs(item.service_km_remaining).toLocaleString()} km overdue`
                      : `${item.service_km_remaining.toLocaleString()} km remaining`}
                  </span>
                </div>
              )}
            />
            <AlertList
              title="Driver licenses expiring within 30 days"
              icon={UserRoundCheck}
              items={dashboard?.driver_licenses_expiring_soon}
              renderItem={(item) => (
                <div key={item.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-slate-500">{dateText(item.driver_license_expiry_date)}</span>
                </div>
              )}
            />
          </div>
        </div>
      )}

      {(tab === "vehicles" || tab === "drivers") && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${tab}…`}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:max-w-sm"
          />
          {tab === "vehicles" && (
            <button
              type="button"
              onClick={() => openVehicle()}
              className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white"
            >
              Add vehicle
            </button>
          )}
        </div>
      )}

      {tab === "vehicles" && (
        <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Registration</th>
                <th className="px-4 py-3">Make / Model</th>
                <th className="px-4 py-3">Insurance expiry</th>
                <th className="px-4 py-3">Inspection expiry</th>
                <th className="px-4 py-3">Mileage</th>
                <th className="px-4 py-3">Next service</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">{vehicle.registration_number}</td>
                  <td className="px-4 py-3">{vehicle.make_model || "Not set"}</td>
                  <td className="px-4 py-3">{dateText(vehicle.insurance_expiry_date)}</td>
                  <td className="px-4 py-3">{dateText(vehicle.inspection_expiry_date)}</td>
                  <td className="px-4 py-3">{numberText(vehicle.current_mileage)}</td>
                  <td className="px-4 py-3">{numberText(vehicle.next_service_due_mileage)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openVehicle(vehicle)}
                      className="font-medium text-violet-700 hover:underline"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "drivers" && (
        <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">License number</th>
                <th className="px-4 py-3">License expiry</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDrivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{driver.name}</td>
                  <td className="px-4 py-3">{driver.phone || "Not set"}</td>
                  <td className="px-4 py-3">{driver.driver_license_number || "Not set"}</td>
                  <td className="px-4 py-3">{dateText(driver.driver_license_expiry_date)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDriverForm({ ...driver })}
                      className="font-medium text-violet-700 hover:underline"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "history" && (
        <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Threshold</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notifications.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-4 py-3">
                    {new Date(item.created_at).toLocaleString("en-KE")}
                  </td>
                  <td className="px-4 py-3">{item.notification_type.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">{item.reminder_threshold}</td>
                  <td className="px-4 py-3">{item.recipient}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        item.status === "sent"
                          ? "bg-emerald-50 text-emerald-700"
                          : item.status === "failed"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="max-w-md px-4 py-3 text-slate-600">{item.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vehicleForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4">
          <div className="mx-auto my-6 max-w-4xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {vehicleForm.id ? "Manage vehicle" : "Add vehicle"}
              </h2>
              <button type="button" onClick={() => setVehicleForm(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveVehicle} className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-3">
                <Field
                  label="Registration Number"
                  required
                  value={vehicleForm.registration_number}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, registration_number: e.target.value })
                  }
                />
                <Field
                  label="Make / Model"
                  value={vehicleForm.make_model}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, make_model: e.target.value })}
                />
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Owner</span>
                  <select
                    value={vehicleForm.owner_id}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, owner_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <option value="">No owner assigned</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>{owner.name}</option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Insurance Provider"
                  value={vehicleForm.insurance_provider}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, insurance_provider: e.target.value })
                  }
                />
                <Field
                  label="Insurance Policy Number"
                  value={vehicleForm.insurance_policy_number}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, insurance_policy_number: e.target.value })
                  }
                />
                <Field
                  label="Insurance Expiry Date"
                  type="date"
                  value={vehicleForm.insurance_expiry_date}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, insurance_expiry_date: e.target.value })
                  }
                />
                <Field
                  label="Inspection Expiry Date"
                  type="date"
                  value={vehicleForm.inspection_expiry_date}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, inspection_expiry_date: e.target.value })
                  }
                />
                <Field
                  label="Service Interval (KM)"
                  type="number"
                  min="1"
                  value={vehicleForm.service_interval_km}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, service_interval_km: e.target.value })
                  }
                />
                <Field
                  label="Current Mileage"
                  type="number"
                  min="0"
                  value={vehicleForm.current_mileage}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, current_mileage: e.target.value })
                  }
                />
                <Field
                  label="Last Service Date"
                  type="date"
                  value={vehicleForm.last_service_date}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, last_service_date: e.target.value })
                  }
                />
                <Field
                  label="Last Service Mileage"
                  type="number"
                  min="0"
                  value={vehicleForm.last_service_mileage}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, last_service_mileage: e.target.value })
                  }
                />
                <Field
                  label="Next Service Due Mileage"
                  type="number"
                  min="0"
                  value={vehicleForm.next_service_due_mileage}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, next_service_due_mileage: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setVehicleForm(null)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  <Save size={16} />
                  Save vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {driverForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-4">
          <div className="mx-auto mt-20 max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">Driver compliance</h2>
                <p className="text-sm text-slate-500">{driverForm.name}</p>
              </div>
              <button type="button" onClick={() => setDriverForm(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveDriver} className="space-y-4 p-5">
              <Field
                label="Driver License Number"
                value={driverForm.driver_license_number || ""}
                onChange={(e) =>
                  setDriverForm({ ...driverForm, driver_license_number: e.target.value })
                }
              />
              <Field
                label="Driver License Expiry Date"
                type="date"
                value={driverForm.driver_license_expiry_date || ""}
                onChange={(e) =>
                  setDriverForm({
                    ...driverForm,
                    driver_license_expiry_date: e.target.value,
                  })
                }
              />
              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setDriverForm(null)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  <Save size={16} />
                  Save compliance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetManagementPage;
