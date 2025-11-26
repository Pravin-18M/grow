const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import Custom Modules
const authRoutes = require('./routes/authRoutes');
const requestLogger = require('./middleware/logger');
const dataRoutes = require('./routes/dataroutes');
const propertyRoutes = require('./routes/propertyRoutes');
const customerRoutes = require('./routes/customerRoutes');
const taskRoutes = require('./routes/taskRoutes');
const reachRoutes = require('./routes/reachRoutes');
const aiRoutes = require('./routes/aiRoutes');
// Serve uploaded images
const uploadsPath = path.join(__dirname,'uploads');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.NODE_ENV === 'production' 
    ? process.env.MONGODB_PRODUCTION_URI 
    : process.env.MONGODB_URI;

// --- 1. CONFIGURATION & MIDDLEWARE ---
app.use(cors()); // Allow Cross-Origin requests
app.use(bodyParser.json()); // Parse JSON bodies
app.use(requestLogger); // Use our custom logger middleware
app.use(express.static(path.join(__dirname, 'public'))); // Serve static assets from public/
app.use('/uploads', express.static(uploadsPath)); // Serve uploaded images
app.use('/api', dataRoutes); // basic data/health
app.use('/api/properties', propertyRoutes); // property CRUD endpoints
app.use('/api/customers', customerRoutes); // customer CRUD endpoints
app.use('/api/tasks', taskRoutes); // task scheduling endpoints
app.use('/api/reach', reachRoutes); // marketing reach endpoints
app.use('/api/ai', aiRoutes); // AI NL -> Mongo query endpoints

// Backward compatibility alias for legacy /api/leads endpoints (temporary)
app.get('/api/leads', async (req,res) => {
    try {
        const Customer = require('./models/Customer');
        const customers = await Customer.find().sort({ createdAt: -1 });
        res.json(customers);
    } catch (e){
        res.status(500).json({ success:false, message:'Server error fetching leads alias' });
    }
});
app.post('/api/leads', async (req,res) => {
    try {
        const Customer = require('./models/Customer');
        const { name, phone, req: requirement, budget, status } = req.body;
        if(!name || !phone) return res.status(400).json({ success:false, message:'Name and phone required' });
        const existing = await Customer.findOne({ phone });
        if(existing) return res.status(409).json({ success:false, message:'Customer already exists with ID '+ existing.custId });
        const customer = new Customer({ name, phone, req: requirement, budget, status });
        await customer.save();
        res.status(201).json({ success:true, message:'Customer created', custId: customer.custId, data: customer });
    } catch(e){
        res.status(500).json({ success:false, message:'Error creating lead alias' });
    }
});

// --- 2. DATABASE CONNECTION ---
mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected: Grow Engine Online'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- 3. ROUTES ---
// Mount auth routes at /api path
app.use('/api', authRoutes);

// Default Route (Serve Landing Page)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- 4. START SERVER ---
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 GRWO SYSTEM LIVE at http://localhost:${PORT}`);
    console.log(`=========================================`);
});