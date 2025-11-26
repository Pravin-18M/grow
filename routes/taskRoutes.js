const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

const ok = (data, extra={}) => ({ success: true, data, ...extra });
const fail = (message) => ({ success: false, message });

// LIST tasks (optionally by date range)
router.get('/', async (req,res) => {
  try {
    const { from, to } = req.query;
    const q = {};
    if(from || to){
      q.date = {};
      if(from) q.date.$gte = new Date(from);
      if(to) q.date.$lte = new Date(to);
    }
    const tasks = await Task.find(q).sort({ date: 1 });
    res.json(ok(tasks));
  } catch(e){ res.status(500).json(fail('Error fetching tasks')); }
});

// CREATE task
router.post('/', async (req,res) => {
  try {
    const { title, type, date, description, customerCustId } = req.body;
    if(!title || !date) return res.status(400).json(fail('Title and date required'));
    const task = new Task({ title, type, date: new Date(date), description, customerCustId });
    await task.save();
    res.status(201).json(ok(task, { message: 'Task created' }));
  } catch(e){ res.status(500).json(fail('Error creating task')); }
});

// UPDATE task
router.put('/:id', async (req,res) => {
  try {
    const updates = req.body;
    if(updates.date) updates.date = new Date(updates.date);
    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });
    if(!task) return res.status(404).json(fail('Task not found'));
    res.json(ok(task, { message: 'Task updated' }));
  } catch(e){ res.status(500).json(fail('Error updating task')); }
});

// DELETE task
router.delete('/:id', async (req,res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if(!task) return res.status(404).json(fail('Task not found'));
    res.json(ok(null, { message: 'Task deleted' }));
  } catch(e){ res.status(500).json(fail('Error deleting task')); }
});

module.exports = router;
