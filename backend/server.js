require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const connectDB = require('./config/db');
const { disconnectDB } = require('./config/db');
const { initializeEmbedder } = require('./utils/embeddings');
const { recoverInterruptedDocuments } = require('./controllers/documentController');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { groq } = require('./utils/groq');

const isProd = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  if (isProd) {
    console.error('JWT_SECRET is required in production.');
    process.exit(1);
  }
  process.env.JWT_SECRET = 'docquery-local-dev-secret-change-me';
  console.warn('[config] JWT_SECRET not set — using an insecure development secret.');
}

const app = express();
app.set('trust proxy', 1); // behind Render/Vercel proxies — needed for correct client IPs

// CORS — defaults plus any comma-separated origins in CLIENT_URLS
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'https://doc-querry.vercel.app',
  'https://docqueryai.vercel.app',
  ...(process.env.CLIENT_URLS || '').split(',').map((s) => s.trim()).filter(Boolean),
]);

app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.has(origin)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(helmet());
// Compress JSON, but never buffer the Server-Sent Events stream.
app.use(compression({
  filter: (req, res) => !req.path.endsWith('/stream') && compression.filter(req, res),
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(morgan(isProd ? 'tiny' : 'dev'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'DocQuery AI backend is running.',
    llm: groq ? 'groq' : 'not-configured',
    uptime: Math.round(process.uptime()),
  });
});

app.get('/', (req, res) => res.send('DocQuery API running'));

app.use('/api', notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

(async () => {
  try {
    await connectDB();
    await recoverInterruptedDocuments();

    const server = app.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
      if (!groq) console.warn('[config] GROQ_API_KEY not set — answers will show retrieved passages instead of AI-written responses.');
    });

    // Warm the embedding model in the background so the first upload is fast.
    initializeEmbedder().catch((err) => console.error('[embeddings] warm-up failed:', err.message));

    const shutdown = async (signal) => {
      console.log(`[server] ${signal} received, shutting down...`);
      server.close();
      await disconnectDB().catch(() => {});
      process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[server] failed to start:', err);
    process.exit(1);
  }
})();
