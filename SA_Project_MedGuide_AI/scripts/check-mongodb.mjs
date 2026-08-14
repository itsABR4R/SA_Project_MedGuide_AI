import { config } from '../src/config/env.mjs';
import { connectDatabase } from '../src/config/database.mjs';

let connection;
try {
  connection = await connectDatabase(config.mongodb);
  const result = await connection.db.admin().command({ ping: 1 });
  if (result.ok !== 1) throw new Error('MongoDB did not acknowledge the ping.');
  console.log('MongoDB connection successful.');
  console.log(`Database: ${connection.name}`);
  console.log(`Server: ${connection.host}:${connection.port}`);
} catch (error) {
  console.error('MongoDB connection failed.');
  console.error('Start the native service with: sudo systemctl start mongod');
  console.error(`Reason: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (connection) await connection.close();
}
