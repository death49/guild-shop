const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const ITEMS_FILE = path.join(__dirname, 'items.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Helper to ensure JSON files exist
function ensureFile(filePath, defaultData = []) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
}
ensureFile(ITEMS_FILE, []);
ensureFile(ORDERS_FILE, []);

// ================= ITEMS.JSON ROUTES (CRUD) ================= //

// GET all catalog items
app.get('/api/items', (req, res) => {
  fs.readFile(ITEMS_FILE, 'utf8', (err, data) => {
    res.json(JSON.parse(data || '[]'));
  });
});

// ADD a new item to items.json
app.post('/api/items', (req, res) => {
  const { name, category, description, cost, time } = req.body;
  fs.readFile(ITEMS_FILE, 'utf8', (err, data) => {
    const items = JSON.parse(data || '[]');
    const newItem = {
      id: 'item-' + Date.now(),
      name,
      category: category || 'General',
      description,
      cost: Number(cost) || 0,
      time: Number(time) || 0
    };
    items.push(newItem);
    fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2));
    res.json({ success: true, item: newItem });
  });
});

// EDIT an existing item in items.json
app.put('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const { name, category, description, cost, time } = req.body;
  fs.readFile(ITEMS_FILE, 'utf8', (err, data) => {
    let items = JSON.parse(data || '[]');
    let idx = items.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Item not found' });

    items[idx] = {
      ...items[idx],
      name,
      category: category || 'General',
      description,
      cost: Number(cost),
      time: Number(time)
    };
    fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2));
    res.json({ success: true, item: items[idx] });
  });
});

// DELETE an item from items.json
app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  fs.readFile(ITEMS_FILE, 'utf8', (err, data) => {
    let items = JSON.parse(data || '[]');
    items = items.filter(i => i.id !== id);
    fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2));
    res.json({ success: true });
  });
});

// ================= ORDERS.JSON ROUTES (CRUD) ================= //

// GET all orders
app.get('/api/orders', (req, res) => {
  fs.readFile(ORDERS_FILE, 'utf8', (err, data) => {
    res.json(JSON.parse(data || '[]'));
  });
});

// CREATE order (Player submission)
app.post('/api/orders', (req, res) => {
  const { playerName, playerNote, items } = req.body;
  const newOrder = {
    orderId: 'ORD-' + Date.now(),
    playerName,
    playerNote: playerNote || '',
    timestamp: new Date().toISOString(),
    items: items.map(item => ({ ...item, status: 'pending' }))
  };

  fs.readFile(ORDERS_FILE, 'utf8', (err, data) => {
    const orders = JSON.parse(data || '[]');
    orders.push(newOrder);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    res.json({ success: true, orderId: newOrder.orderId });
  });
});

// UPDATE single item status (Approve/Deny)
app.patch('/api/orders/:orderId/items/:itemId', (req, res) => {
  const { orderId, itemId } = req.params;
  const { status } = req.body;

  fs.readFile(ORDERS_FILE, 'utf8', (err, data) => {
    let orders = JSON.parse(data || '[]');
    let order = orders.find(o => o.orderId === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    let item = order.items.find(i => i.id === itemId);
    if (!item) return res.status(404).json({ error: 'Item not found in order' });

    item.status = status;
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    res.json({ success: true, order });
  });
});

// REMOVE single item from an order
app.delete('/api/orders/:orderId/items/:itemId', (req, res) => {
  const { orderId, itemId } = req.params;
  fs.readFile(ORDERS_FILE, 'utf8', (err, data) => {
    let orders = JSON.parse(data || '[]');
    let order = orders.find(o => o.orderId === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.items = order.items.filter(i => i.id !== itemId);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    res.json({ success: true });
  });
});

// DELETE an entire order
app.delete('/api/orders/:orderId', (req, res) => {
  const { orderId } = req.params;
  fs.readFile(ORDERS_FILE, 'utf8', (err, data) => {
    let orders = JSON.parse(data || '[]');
    orders = orders.filter(o => o.orderId !== orderId);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    res.json({ success: true });
  });
});

// DELETE ALL orders
app.delete('/api/orders/all', (req, res) => {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Guild Shop Manager active on http://localhost:${PORT}`));