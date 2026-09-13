import { config } from '../server/src/config/env.js';
import { connectDatabase } from '../server/src/config/database.js';
import { registerModels } from '../server/src/models/index.js';
import { printDatabaseError, silentLogger } from './lib/database-cli.js';

function resultLimit() {
  const index = process.argv.indexOf('--limit');
  const requested = index >= 0 ? Number(process.argv[index + 1]) : 10;
  if (!Number.isInteger(requested) || requested < 1) return 10;
  return Math.min(requested, 100);
}

let connection;
try {
  connection = await connectDatabase(config.mongodb, { logger: silentLogger });
  const { User, GuestUser, Session, HealthCheck, ChatConversation } = registerModels(connection);
  const limit = resultLimit();
  const [users, guestUsers, healthChecks, chatConversations, guestSessions, sessionCount] = await Promise.all(
    [
      User.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('accountType email name age bloodType allergies onboardingCompleted createdAt updatedAt')
        .lean(),
      GuestUser.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('accountType name age occupation bloodType allergies onboardingCompleted createdAt updatedAt')
        .lean(),
      HealthCheck.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(
          'userId accountType symptoms severity tags analysis.summary analysis.urgent analysis.conditions.name analysis.conditions.matchLevel analysis.conditions.matchPercentage createdAt'
        )
        .lean(),
      ChatConversation.find()
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select(
          'userId accountType checkId title contextLabel rootConversationId parentConversationId branchNumber createdAt updatedAt'
        )
        .lean(),
      Session.find({ accountType: 'guest' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('userId accountType createdAt expiresAt')
        .lean(),
      Session.countDocuments()
    ]
  );

  const output = {
    database: connection.name,
    counts: {
      users: await User.countDocuments(),
      guestUsers: await GuestUser.countDocuments(),
      sessions: sessionCount,
      guestSessions: await Session.countDocuments({ accountType: 'guest' }),
      healthChecks: await HealthCheck.countDocuments(),
      chatConversations: await ChatConversation.countDocuments()
    },
    displayedLimit: limit,
    users,
    guestUsers,
    guestSessions,
    healthChecks,
    chatConversations
  };
  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  printDatabaseError('Could not read the local MongoDB database.', error);
  process.exitCode = 1;
} finally {
  if (connection) await connection.close();
}
