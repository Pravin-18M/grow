const requestLogger = (req, res, next) => {
    const date = new Date().toISOString();
    console.log(`[${date}] ${req.method} request to ${req.url}`);
    next(); // Pass control to the next handler
};

module.exports = requestLogger;