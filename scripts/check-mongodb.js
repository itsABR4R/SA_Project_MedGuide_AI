import { config } from '../server/src/config/env.js';
import { connectDatabase } from '../server/src/config/database.js';
import { printDatabaseError, silentLogger } from './lib/database-cli.js';

let connection;
try {
  connection = await connectDatabase(config.mongodb, { logger: silentLogger });
  const result = await connection.db.admin().command({ ping: 1 });
  if (result.ok !== 1) throw new Error('MongoDB did not acknowledge the ping.');
  console.log('MongoDB connection successful.');
  console.log(`Database: ${connection.name}`);
  console.log(`Server: ${connection.host}:${connection.port}`);
} catch (error) {
  printDatabaseError('MongoDB connection failed.', error);
  process.exitCode = 1;
} finally {
  if (connection) await connection.close();
}
