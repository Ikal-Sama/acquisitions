import express from 'express';
import logger from '#config/logger.js';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from '#routes/auth.route.js';
import usersRoutes from '#routes/users.route.js';
import vendorsRoutes from '#routes/vendors.route.js';
import requisitionsRoutes from '#routes/requisitions.route.js';
import purchaseOrdersRoutes from '#routes/purchase_orders.route.js';
import assetsRoutes from '#routes/assets.route.js';
import securityMiddleware from '#middleware/security.middleware.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  morgan('combined', {
    stream: {
      write: message => logger.info(message),
    },
  })
);

app.use(securityMiddleware);

app.get('/', (req, res) => {
  logger.info('Hello from Acquisitions!');

  res.status(200).send('Hello from Acquisitions!');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({ message: 'Acquisition API is running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/requisitions', requisitionsRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/assets', assetsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route Not found!' });
});

export default app;
