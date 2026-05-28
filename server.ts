import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import apiRouter from './backend/routes/apiRoutes';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsing parser middlewares
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request logger for corporate audit
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
  });

  // Root level health check indicator
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      status: 'HEALHY',
      timestamp: new Date().toISOString(),
      mode: process.env.NODE_ENV || 'development'
    });
  });

  // Mount MVC Unified Router API
  app.use('/api', apiRouter);

  // Serve static uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Serve static UI React assets / Dev middleware
  if (process.env.NODE_ENV !== 'production') {
    console.log('启动 Vite 开发中介软件...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Mount Vite dev server middleware
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Handle global error middleware elegantly
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled request error:', err);
    res.status(500).json({
      success: false,
      message: 'A system-level error occurred in the enterprise core server.',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Enterprise Server active on: http://localhost:${PORT}`);
    console.log(`🌐 Live Preview URL ready to inspect`);
  });
}

startServer().catch((e) => {
  console.error('Fatal crash during server initialization:', e);
});
