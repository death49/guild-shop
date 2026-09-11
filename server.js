const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const ITEMS_FILE = path.join(__dirname, 'items.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');

if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
}

// Get item catalog
app.get('/api/items', (req, res) => {
  fs.readFile(ITEMS_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read catalog' });
    res.json(JSON.parse(data || '[]'));
  });
});

// Submit a player order
app.post('/api/orders', (req, res) => {
  const { playerName, playerNote, items } = req.body;
  
  if (!playerName || !items || items.length === 0) {
    return res.status(400).json({ error: 'Player name and at least one item required.' });
  }

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

// Get all orders (for DM)
app.get('/api/orders', (req, res) => {
  fs.readFile(ORDERS_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Failed to read orders' });
    res.json(JSON.parse(data || '[]'));
  });
});

// Update item status in an order (Approve/Deny)
app.patch('/api/orders/:orderId/items/:itemId', (req, res) => {
  const { orderId, itemId } = req.params;
  const { status } = req.body; // 'approved' or 'denied'

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

app.listen(PORT, () => console.log(`Guild Shop running on http://localhost:${PORT}`));