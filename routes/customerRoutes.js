const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// Utility to build success response
const ok = (data, extra={}) => ({ success: true, data, ...extra });
const fail = (message) => ({ success: false, message });

// LIST all customers
router.get('/', async (req,res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch(e){
    res.status(500).json(fail('Server error fetching customers'));
  }
});

// CREATE new customer
router.post('/', async (req,res) => {
  try {
    const { name, phone, email, req: requirement, description, bhk, typology, propertyTypes, budget, status } = req.body;
    if(!name || !phone) return res.status(400).json(fail('Name and phone are required'));

    const existing = await Customer.findOne({ phone });
    if(existing){
      return res.status(409).json(fail(`Customer already exists with ID ${existing.custId}`));
    }

    // Normalize propertyTypes (array or comma string)
    let typesArray = [];
    if(Array.isArray(propertyTypes)) typesArray = propertyTypes;
    else if(typeof propertyTypes === 'string' && propertyTypes.trim() !== '') typesArray = propertyTypes.split(',').map(t => t.trim()).filter(Boolean);

    const customer = new Customer({
      name,
      phone,
      email,
      req: requirement,
      description,
      bhk,
      typology,
      propertyTypes: typesArray,
      budget,
      status
    });
    await customer.save();
    res.status(201).json(ok(customer, { message: 'Customer created', custId: customer.custId }));
  } catch(e){
    if(e.code === 'DUPLICATE_PHONE'){
      return res.status(409).json(fail(e.message));
    }
    res.status(500).json(fail('Error creating customer'));
  }
});

// GET single by custId
router.get('/:custId', async (req,res) => {
  try {
    const customer = await Customer.findOne({ custId: req.params.custId });
    if(!customer) return res.status(404).json(fail('Customer not found'));
    res.json(ok(customer));
  } catch(e){
    res.status(500).json(fail('Error retrieving customer'));
  }
});

// UPDATE
router.put('/:custId', async (req,res) => {
  try {
    const updates = req.body;
    const customer = await Customer.findOneAndUpdate({ custId: req.params.custId }, updates, { new: true });
    if(!customer) return res.status(404).json(fail('Customer not found'));
    res.json(ok(customer, { message: 'Customer updated' }));
  } catch(e){
    res.status(500).json(fail('Error updating customer'));
  }
});

// DELETE
router.delete('/:custId', async (req,res) => {
  try {
    const customer = await Customer.findOneAndDelete({ custId: req.params.custId });
    if(!customer) return res.status(404).json(fail('Customer not found'));
    res.json(ok(null, { message: 'Customer deleted' }));
  } catch(e){
    res.status(500).json(fail('Error deleting customer'));
  }
});

// ADD NOTE to customer
router.post('/:custId/notes', async (req,res) => {
  try {
    const { type, text, followUpDate } = req.body;
    if(!text) return res.status(400).json(fail('Note text required'));
    const customer = await Customer.findOne({ custId: req.params.custId });
    if(!customer) return res.status(404).json(fail('Customer not found'));
    const note = { type: type || 'general', text, followUpDate: followUpDate ? new Date(followUpDate) : undefined };
    customer.notes.push(note);
    await customer.save();
    res.status(201).json(ok(note, { message: 'Note added' }));
  } catch(e){
    res.status(500).json(fail('Error adding note'));
  }
});

// LIST notes for customer
router.get('/:custId/notes', async (req,res) => {
  try {
    const customer = await Customer.findOne({ custId: req.params.custId });
    if(!customer) return res.status(404).json(fail('Customer not found'));
    res.json(ok(customer.notes || []));
  } catch(e){
    res.status(500).json(fail('Error fetching notes'));
  }
});

// AGGREGATED upcoming followups across customers
router.get('/followups/upcoming', async (req,res) => {
  try {
    const now = new Date();
    const customers = await Customer.find({ 'notes.followUpDate': { $exists: true, $ne: null } }, { name:1, custId:1, notes:1 });
    const items = [];
    customers.forEach(c => {
      (c.notes || []).forEach(n => {
        if(n.followUpDate && new Date(n.followUpDate) >= now){
          items.push({
            customerName: c.name,
            customerCustId: c.custId,
            type: n.type,
            text: n.text,
            followUpDate: n.followUpDate
          });
        }
      });
    });
    // Sort by soonest
    items.sort((a,b) => new Date(a.followUpDate) - new Date(b.followUpDate));
    res.json(ok(items));
  } catch(e){
    res.status(500).json(fail('Error aggregating followups'));
  }
});

module.exports = router;
