const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// 1. REGISTER ROUTE
router.post('/register', async (req, res) => {
    try {
        const { firmName, fullName, email, password } = req.body;

        // Validate input
        if (!firmName || !fullName || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({ firmName, fullName, email, password: hashedPassword });
        await newUser.save();

        console.log(`✅ New Firm Registered: ${firmName} | User: ${fullName}`);
        res.status(201).json({ success: true, message: 'Account created successfully', user: { firmName: newUser.firmName, fullName: newUser.fullName, email: newUser.email } });

    } catch (err) {
        console.error('❌ Register Error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// 2. LOGIN ROUTE
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        // Find user
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Compare passwords
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        console.log(`🔓 Login Successful: ${user.firmName}`);
        res.json({ success: true, message: 'Login successful', user: { firmName: user.firmName, fullName: user.fullName, email: user.email } });

    } catch (err) {
        console.error('❌ Login Error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// 3. FORGOT PASSWORD (SIMULATION)
router.post('/forgot', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Email not found in database' });
        }

        // Logic to send email would go here
        console.log(`📧 Password reset link sent to: ${email}`);
        
        res.json({ success: true, message: 'Reset link sent to your email' });

    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// 4. RESET PASSWORD
router.post('/reset', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const updatedUser = await User.findOneAndUpdate(
            { email: email },
            { password: hashedPassword },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        console.log(`🔐 Password updated for: ${email}`);
        res.json({ success: true, message: 'Password updated successfully' });

    } catch (err) {
        console.error('❌ Reset Error:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;