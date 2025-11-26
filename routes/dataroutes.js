// Data routes placeholder (health + simple ping)
// Previously this file recursively required itself causing Express to receive an object
// and crash with: Router.use() requires a middleware function but got a Object.
// Export a proper Router instance instead.
const express = require('express');
const router = express.Router();

router.get('/health', (req,res)=> {
	res.json({ status: 'ok', service: 'data', time: new Date().toISOString() });
});

module.exports = router;