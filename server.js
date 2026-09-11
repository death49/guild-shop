const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// 1. DATABASE CONNECTION & SEEDING
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guild_shop';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB Atlas');
    await seedCatalog(); // Run seed function ONLY AFTER database connection is ready
  })
  .catch(err => console.error('MongoDB connection error:', err));

// 2. SCHEMAS & MODELS
const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'General' },
  description: { type: String, required: true },
  cost: { type: Number, required: true },
  time: { type: Number, default: 0 }
});

const OrderSchema = new mongoose.Schema({
  playerName: { type: String, required: true },
  playerNote: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
  items: [{
    id: String,
    name: String,
    cost: Number,
    time: Number,
    qty: Number,
    status: { type: String, default: 'pending' }
  }]
});

const Item = mongoose.model('Item', ItemSchema);
const Order = mongoose.model('Order', OrderSchema);

// Seed default items if catalog is empty
async function seedCatalog() {
  try {
    const count = await Item.countDocuments();
    if (count === 0) {
      await Item.insertMany([
        { name: "Potion of Healing", category: "Consumables", description: "Restores 2d4 + 2 HP.", cost: 50, time: 0 },
        { name: "Alert Conditioning", category: "Training", description: "Alert Feat: +5 Initiative.", cost: 300, time: 10 },
        { name: "Spell Scroll (Fireball)", category: "Scrolls", description: "Single-use 3rd-level scroll.", cost: 500, time: 0 }
      ]);
      console.log("Database seeded with sample items.");
    }
  } catch (err) {
    console.error("Error seeding catalog:", err);
  }
}

// ================= ITEMS ROUTES ================= //

// GET all items
app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find();
    // Map _id to id for frontend compatibility
    const formatted = items.map(i => ({ id: i._id, name: i.name, category: i.category, description: i.description, cost: i.cost, time: i.time }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD new item
app.post('/api/items', async (req, res) => {
  try {
    const { name, category, description, cost, time } = req.body;
    const newItem = new Item({ name, category, description, cost: Number(cost), time: Number(time) });
    await newItem.save();
    res.json({ success: true, item: { id: newItem._id, ...newItem._doc } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// EDIT existing item
app.put('/api/items/:id', async (req, res) => {
  try {
    const { name, category, description, cost, time } = req.body;
    const updated = await Item.findByIdAndUpdate(
      req.params.id,
      { name, category, description, cost: Number(cost), time: Number(time) },
      { new: true }
    );
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE item
app.delete('/api/items/:id', async (req, res) => {
  try {
    await Item.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= ORDERS ROUTES ================= //

// GET all orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find();
    const formatted = orders.map(o => ({
      orderId: o._id,
      playerName: o.playerName,
      playerNote: o.playerNote,
      timestamp: o.timestamp,
      items: o.items
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE order
app.post('/api/orders', async (req, res) => {
  try {
    const { playerName, playerNote, items } = req.body;
    const newOrder = new Order({
      playerName,
      playerNote,
      items: items.map(i => ({ ...i, status: 'pending' }))
    });
    await newOrder.save();
    res.json({ success: true, orderId: newOrder._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE single item status in order
app.patch('/api/orders/:orderId/items/:itemId', async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const item = order.items.find(i => i.id === itemId || i._id.toString() === itemId);
    if (item) item.status = status;

    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE single item from order
app.delete('/api/orders/:orderId/items/:itemId', async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.items = order.items.filter(i => i.id !== itemId && i._id.toString() !== itemId);
    await order.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE entire order
app.delete('/api/orders/:orderId', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.orderId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE all orders
app.delete('/api/orders/all', async (req, res) => {
  try {
    await Order.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));