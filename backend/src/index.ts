import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDB } from './database/connection';

// Route imports
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import catalogRoutes from './routes/catalogRoutes';
import customerRoutes from './routes/customerRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import saleRoutes from './routes/saleRoutes';
import settingsRoutes from './routes/settingsRoutes';
import reportRoutes from './routes/reportRoutes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/catalogs', catalogRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);

// Optional: Serve frontend static assets in production mode
const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendBuildPath));

app.get('*', (req, res, next) => {
  // If request is for /api, let it go to 404 or routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  // Otherwise serve React app index
  res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
    if (err) {
      // In development index.html won't exist in dist, which is fine
      res.status(404).send('API is running. Frontend static files are not compiled.');
    }
  });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
});

// Bootstrap Database and Start Server
async function startServer() {
  try {
    console.log('Initializing SQLite database...');
    await initDB();

    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`  ANTARA POS Server running on port ${PORT}`);
      console.log(`  API Endpoint: http://localhost:${PORT}/api`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('Failed to start server due to database initialization error:', error);
    process.exit(1);
  }
}

startServer();
