const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5050;

// Initialize Database connection
connectDB();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Modular API Routers
app.use('/api/v1/auth', require('./modules/auth/routes'));
app.use('/api/v1/environmental-records', require('./modules/environmental/routes'));
app.use('/api/v1/evidence', require('./modules/evidence/routes'));
app.use('/api/v1/verification', require('./modules/verification/routes'));
app.use('/api/v1/audit', require('./modules/audit/routes'));
app.use('/api/v1/reports', require('./modules/reports/routes'));
app.use('/api/v1/dashboard', require('./modules/dashboards/routes'));
app.use('/api/v1/credits', require('./modules/credits/routes'));
app.use('/api/risks', require('./modules/risks/routes'));
app.use('/api/risk-analytics', require('./modules/risks/analyticsRoutes'));
app.use('/api/ai-risk', require('./modules/risks/aiRiskRoutes'));

// Legacy Backward-Compatibility Routes
app.use('/api/environment', require('../routes/environment'));
app.use('/api', require('./middleware/legacyRouter'));

// Catch-all fallbacks
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint resource not found.' });
});

// Centralized Error Interceptor Middleware
app.use(errorHandler);

// Listen
app.listen(PORT, () => {
  console.log(`🚀 CarbonCredit.Network MERN API running on port ${PORT}`);
});

module.exports = app;
