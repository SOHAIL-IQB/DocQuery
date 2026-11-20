require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';
if (!process.env.JWT_SECRET) {
  if (isProd) {
    console.error('JWT_SECRET is required in production.');
    process.exit(1);
  }
  process.env.JWT_SECRET = 'docquery-local-dev-secret-change-me';
  console.warn('[config] JWT_SECRET not set — using an insecure development secret.');
}

const app = require('./app');
const connectDB = require('./config/db');
const { disconnectDB } = require('./config/db');
const { initializeEmbedder } = require('./utils/embeddings');
const { recoverInterruptedDocuments } = require('./controllers/documentController');
const { groq } = require('./utils/groq');

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

    let shuttingDown = false;
    const shutdown = async (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`[server] ${signal} received, shutting down...`);
      server.close();
      server.closeAllConnections?.();
      await disconnectDB().catch(() => {});
      // nodemon restarts with SIGUSR2: re-raise it after cleanup so nodemon knows we're done.
      if (signal === 'SIGUSR2') process.kill(process.pid, 'SIGUSR2');
      else process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGUSR2', () => shutdown('SIGUSR2'));
  } catch (err) {
    console.error('[server] failed to start:', err);
    process.exit(1);
  }
})();
