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

  res.status(201).json({
    message: "Order submitted successfully",
    order: newOrder
  });
});

app.get("/api/orders", (req, res) => {
  const orders = readOrders();
  res.json(orders);
});

app.get("/api/orders/pending", (req, res) => {
  const orders = readOrders();
  const pendingOrders = orders.filter(order => order.status === "pending");
  res.json(pendingOrders);
});

app.put("/api/orders/:id/status", (req, res) => {
  const orders = readOrders();
  const orderId = Number(req.params.id);
  const { status } = req.body;

  if (!["approved", "declined"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const order = orders.find(order => order.id === orderId);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  order.status = status;
  writeOrders(orders);

  res.json({
    message: `Order ${status}`,
    order: order
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
