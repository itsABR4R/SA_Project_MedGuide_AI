import { config } from '../src/config/env.mjs';
import { connectDatabase } from '../src/config/database.mjs';
import { registerModels } from '../src/models/index.mjs';

function resultLimit() {
  const index = process.argv.indexOf('--limit');
  const requested = index >= 0 ? Number(process.argv[index + 1]) : 10;
  if (!Number.isInteger(requested) || requested < 1) return 10;
  return Math.min(requested, 100);
}

let connection;
try {
  connection = await connectDatabase(config.mongodb);
  const { User, Session, HealthCheck } = registerModels(connection);
  const limit = resultLimit();
  const [users, healthChecks, sessionCount] = await Promise.all([
    User.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('email name age bloodType allergies onboardingCompleted createdAt updatedAt')
      .lean(),
    HealthCheck.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('userId symptoms severity tags analysis.summary analysis.urgent analysis.conditions.name analysis.conditions.matchLevel createdAt')
      .lean(),
    Session.countDocuments()
  ]);

  const output = {
    database: connection.name,
    counts: {
      users: await User.countDocuments(),
      sessions: sessionCount,
      healthChecks: await HealthCheck.countDocuments()
    },
    displayedLimit: limit,
    users,
    healthChecks
  };
  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  console.error('Could not read the local MongoDB database.');
  console.error('Start it with: sudo systemctl start mongod');
  console.error(`Reason: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (connection) await connection.close();
}
