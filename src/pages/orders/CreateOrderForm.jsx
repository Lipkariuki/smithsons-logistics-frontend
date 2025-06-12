import React, { useEffect, useState } from "react";
import axios from "../../utils/axiosAuth";

const CreateOrderForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    invoice_number: "",
    product_description: "",
    destination: "",
    truck_plate: "",
    driver_id: "",
    vehicle_id: "",
    total_amount: "",
    cases: "",
    price_per_case: "",
  });

  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    axios.get("/users/?role=driver").then((res) => setDrivers(res.data));
    axios.get("/vehicles").then((res) => setVehicles(res.data));
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/orders", formData);
      onSuccess();
      setFormData({
        invoice_number: "",
        product_description: "",
        destination: "",
        truck_plate: "",
        driver_id: "",
        vehicle_id: "",
        total_amount: "",
        cases: "",
        price_per_case: "",
      });
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create order:", err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
      >
        {showForm ? "Close Form" : "Create Order"}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            name="invoice_number"
            placeholder="Invoice Number"
            value={formData.invoice_number}
            onChange={handleChange}
            required
            className="p-2 border rounded"
          />
          <input
            type="text"
            name="product_description"
            placeholder="Product Description"
            value={formData.product_description}
            onChange={handleChange}
            required
            className="p-2 border rounded"
          />
          <input
            type="text"
            name="destination"
            placeholder="Destination"
            value={formData.destination}
            onChange={handleChange}
            required
            className="p-2 border rounded"
          />
          <input
            type="text"
            name="truck_plate"
            placeholder="Truck Plate"
            value={formData.truck_plate}
            onChange={handleChange}
            required
            className="p-2 border rounded"
          />
          <select
            name="driver_id"
            value={formData.driver_id}
            onChange={handleChange}
            required
            className="p-2 border rounded"
          >
            <option value="">Assign Driver</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            name="vehicle_id"
            value={formData.vehicle_id}
            onChange={handleChange}
            required
            className="p-2 border rounded"
          >
            <option value="">Assign Vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.plate_number}</option>
            ))}
          </select>
          <input
            type="number"
            name="cases"
            placeholder="Cases (optional)"
            value={formData.cases}
            onChange={handleChange}
            className="p-2 border rounded"
          />
          <input
            type="number"
            name="price_per_case"
            placeholder="Price per Case (optional)"
            value={formData.price_per_case}
            onChange={handleChange}
            className="p-2 border rounded"
          />
          <input
            type="number"
            name="total_amount"
            placeholder="Total Amount"
            value={formData.total_amount}
            onChange={handleChange}
            required
            className="p-2 border rounded"
          />

          <button
            type="submit"
            disabled={loading}
            className="col-span-1 md:col-span-2 bg-purple-600 text-white p-2 rounded hover:bg-purple-700 transition"
          >
            {loading ? "Creating..." : "Submit Order"}
          </button>
        </form>
      )}
    </div>
  );
};

export default CreateOrderForm;
