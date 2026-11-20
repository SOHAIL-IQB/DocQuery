const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { groq, currentModel } = require('./utils/groq');

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

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
// Express 5 leaves req.body undefined when no body was sent; normalize so handlers never crash.
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});
if (!isTest) app.use(morgan(isProd ? 'tiny' : 'dev'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'DocQuery AI backend is running.',
    llm: groq ? currentModel() : 'not-configured',
    uptime: Math.round(process.uptime()),
  });
});

app.get('/', (req, res) => res.send('DocQuery API running'));

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
