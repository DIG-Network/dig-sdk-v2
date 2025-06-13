import { BlockIndexer } from './application/workers/BlockIndexer/BlockIndexer';
import { BlockRepository } from './application/repositories/BlockRepository';
import Database from 'better-sqlite3';
import path from 'path';
import { BlockIndexerEventNames } from './application/workers/BlockIndexer/BlockIndexerEvents';
import { BlockChainType } from './application/types/BlockChain';
import fs from 'fs';

// Path to the SQLite DB file (can be changed as needed)
const dbPath = path.resolve(__dirname, '../../../../test_blockindexer_worker_logic.sqlite');
const testServiceDbPath = 'testservice.sqlite';

// Delete the database files if they exist before starting
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log(`[Main] Deleted existing DB at ${dbPath}`);
}
if (fs.existsSync(testServiceDbPath)) {
  fs.unlinkSync(testServiceDbPath);
  console.log(`[Main] Deleted existing testservice DB at ${testServiceDbPath}`);
}

// Instantiate the SQLite database and repository
const db = new Database(dbPath);
const testservicedb = new Database('testservice.sqlite');
const repository = new BlockRepository(db);

// Instantiate the BlockIndexer
const indexer = new BlockIndexer();

// Listen for block ingested events from the indexer
indexer.on(BlockIndexerEventNames.BlockIngested, (block) => {
  console.log(
    `[Main] Block processed: blockHeight=${block.blockHeight}, hash=${block.hash.toString('hex')}`,
  );
});

// Start the indexer (provide blockchainType and dbPath)
(async () => {
  await testservicedb.exec(
    `CREATE TABLE IF NOT EXISTS blocks (hash BLOB, blockHeight INTEGER PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  );
  testservicedb
    .prepare('INSERT INTO blocks (hash, blockHeight) VALUES (?, ?)')
    .run(Buffer.from('deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef', 'hex'), 1);
  await indexer.start(BlockChainType.Test, dbPath); // 10 seconds for demo (1/360 hours)
  //wait 4 seconds to allow initial sync
  await new Promise((resolve) => setTimeout(resolve, 4000));
  testservicedb
    .prepare('INSERT INTO blocks (hash, blockHeight) VALUES (?, ?)')
    .run(Buffer.from('cafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe', 'hex'), 2);

  console.log('[Main] BlockIndexer is running. Press Ctrl+C to exit.');
})();

// Optional: handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Main] Caught SIGINT, stopping BlockIndexer...');
  await indexer.stop();
  process.exit(0);
});

setInterval(() => {
  const mem = process.memoryUsage();
  console.log(
    `[Memory] RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB, Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
  );
}, 5000); // logs every 5 seconds
