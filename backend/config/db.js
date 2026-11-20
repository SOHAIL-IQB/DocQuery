const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

let memoryServer = null;

/**
 * Connects to MongoDB.
 *
 * - If MONGO_URI is set, connects to it (Atlas in production).
 * - If MONGO_URI is missing outside production, boots a local, persistent
 *   MongoDB instance via mongodb-memory-server so the project runs with
 *   zero external setup. Data is kept in backend/.data/mongo between runs.
 */
const connectDB = async () => {
  let uri = process.env.MONGO_URI;
  const isProd = process.env.NODE_ENV === 'production';

  if (!uri || uri === 'local') {
    if (isProd) {
      throw new Error('MONGO_URI is required in production.');
    }

    let MongoMemoryServer;
    try {
      ({ MongoMemoryServer } = require('mongodb-memory-server'));
    } catch {
      throw new Error(
        'MONGO_URI is not set and mongodb-memory-server is not installed. ' +
        'Run `npm install` in /backend or set MONGO_URI in backend/.env.'
      );
    }

    const dbPath = path.join(__dirname, '..', '.data', 'mongo');
    fs.mkdirSync(dbPath, { recursive: true });

    console.log('[db] MONGO_URI not set — starting a local MongoDB (first run downloads the binary)...');
    // On a quick dev restart the previous mongod may still hold the data-dir lock for a moment.
    for (let attempt = 1; ; attempt++) {
      try {
        memoryServer = await MongoMemoryServer.create({
          instance: { dbPath, storageEngine: 'wiredTiger' },
        });
        break;
      } catch (err) {
        if (!/DBPathInUse|lock file/i.test(String(err?.message)) || attempt >= 10) throw err;
        console.log(`[db] data directory still locked by the previous run, retrying (${attempt}/10)...`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    uri = memoryServer.getUri();
  }

  const conn = await mongoose.connect(uri, { dbName: 'docuquery' });
  console.log(`[db] MongoDB connected: ${conn.connection.host} (docuquery)${memoryServer ? ' [local]' : ''}`);
  return conn;
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop({ doCleanup: false });
};

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
