import express from 'express';
import cors from 'cors';
import { config } from './config';
import prisma from './config/prisma';
import { errorHandler, notFoundHandler } from './middleware/error';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import storeRoutes from './routes/storeRoutes';
import equipmentRoutes from './routes/equipmentRoutes';
import ticketRoutes from './routes/ticketRoutes';
import sparePartRoutes from './routes/sparePartRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import logRoutes from './routes/logRoutes';
import statsRoutes from './routes/statsRoutes';
import slaRoutes from './routes/slaRoutes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/equipments', equipmentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/spare-parts', sparePartRoutes);
app.use('/api/inventories', inventoryRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/sla', slaRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

export default app;
export { start };
