const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const tenantPlugin = require('./utils/tenantPlugin');

// Apply multi-tenancy plugin to all schemas globally BEFORE models are required
mongoose.plugin(tenantPlugin);

const { notFound, errorHandler } = require('./middleware/error.middleware');
const inventoryRoutes = require('./routes/inventory.routes');
const productRoutes = require('./routes/product.routes');
const warehouseRoutes = require('./routes/warehouse.routes');
const authRoutes = require('./routes/auth.routes');
const reservationRoutes = require('./routes/reservation.routes');
const auditRoutes = require('./routes/audit.routes');
const intelligenceRoutes = require('./routes/intelligence.routes');
const companyRoutes = require('./routes/company.routes');
const connectDB = require('./config/db');

require('dotenv').config();

const app = express();

// Connect to MongoDB middleware for serverless
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/warehouses', warehouseRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/audits', auditRoutes);
app.use('/api/v1/intelligence', intelligenceRoutes);

app.get('/', (req, res) => {
  res.send('StockSense API is running...');
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
