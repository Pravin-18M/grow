const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Customer = require('../models/Customer');

// Helper response builders
const ok = (data, extra={}) => ({ success: true, data, ...extra });
const fail = (message) => ({ success: false, message });

// POST /api/reach/send-email
// Body: { custId: string, message: string, subject?: string }
router.post('/send-email', async (req, res) => {
  try {
    const { custId, message, subject } = req.body;
    if(!custId || !message){
      return res.status(400).json(fail('custId and message are required'));
    }
    const customer = await Customer.findOne({ custId });
    if(!customer){
      return res.status(404).json(fail('Customer not found'));
    }
    if(!customer.email){
      return res.status(400).json(fail('Customer has no email on record'));
    }

    // Create transporter using Gmail App Password (set in .env)
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if(!user || !pass){
      return res.status(500).json(fail('Email service not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing)'));
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    // Sender: "GRWO - Firm Name <email>"
    let firmName = customer.firmName || customer.firm || '';
    let senderName = 'GRWO';
    if (firmName && typeof firmName === 'string' && firmName.trim()) {
      senderName = `GRWO - ${firmName.trim()}`;
    }
    const mailOptions = {
      from: `${senderName} <${user}>`,
      to: customer.email,
      subject: subject || `Grwo Update for ${customer.name} (ID: ${custId})`,
      text: message
    };

    const info = await transporter.sendMail(mailOptions);

    res.json(ok({ messageId: info.messageId }, { message: 'Email dispatched successfully' }));
  } catch (e) {
    console.error('Email send error', e);
    res.status(500).json(fail('Error sending email'));
  }
});

module.exports = router;