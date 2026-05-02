const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "orders.json");

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function readOrders() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
  const data = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(data);
}

function writeOrders(orders) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2));
}

// POST - submit a new order
app.post("/api/orders", (req, res) => {
  const orders = readOrders();

  const newOrder = {
    id: Date.now(),
    status: "pending",
    date: new Date().toLocaleString(),
    ...req.body
  };

  orders.push(newOrder);
  writeOrders(orders);

  console.log("New order saved:", newOrder.id);
  res.status(201).json({ message: "Order submitted successfully", order: newOrder });
});

// GET - all orders
app.get("/api/orders", (req, res) => {
  res.json(readOrders());
});

// GET - pending orders only
app.get("/api/orders/pending", (req, res) => {
  const orders = readOrders();
  res.json(orders.filter(o => o.status === "pending"));
});

// GET - single order by id
app.get("/api/orders/:id", (req, res) => {
  const orders = readOrders();
  const order = orders.find(o => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
});

// PUT - update order status (approved or declined)
app.put("/api/orders/:id/status", (req, res) => {
  const orders = readOrders();
  const orderId = Number(req.params.id);
  const { status } = req.body;

  if (!["approved", "declined"].includes(status)) {
    return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'declined'." });
  }

  const order = orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });

  order.status = status;
  writeOrders(orders);

  console.log(`Order ${orderId} marked as ${status}`);
  res.json({ message: `Order ${status}`, order });
});

// DELETE - clear all orders (useful for resetting during demo)
app.delete("/api/orders", (req, res) => {
  writeOrders([]);
  res.json({ message: "All orders cleared" });
});

app.listen(PORT, () => {
  console.log(`\n✅ Server running at http://localhost:${PORT}`);
  console.log(`   Open index.html at http://localhost:${PORT}/index.html\n`);
});
