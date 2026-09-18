import { createApp } from './app.js';
import { connectDatabase, databaseStatus } from './config/database.js';
import { config as defaultConfig } from './config/env.js';
import { createLogger } from './config/logger.js';
import { registerModels } from './models/index.js';
import { createMongoRepository } from './repositories/mongo.repository.js';
import { createAiService } from './services/ai.service.js';

export async function createRuntime(
  config = defaultConfig,
  { logger = createLogger({ environment: config.env, level: config.logLevel }) } = {}
) {
  const connection = await connectDatabase(config.mongodb, {
    logger: logger.child({ component: 'database' })
  });

  try {
    const models = registerModels(connection);
    if (config.mongodb.autoIndex) {
      await Promise.all(Object.values(models).map((model) => model.init()));
    }

    const repository = createMongoRepository(models);
    const aiService = createAiService({
      config,
      logger: logger.child({ component: 'openrouter' })
    });
    const app = createApp({
      repository,
      aiService,
      config,
      logger,
      getDatabaseStatus: () => databaseStatus(connection)
    });

    let closePromise;
    const close = () => {
      closePromise ||= connection.close();
      return closePromise;
    };

    return { app, connection, repository, aiService, logger, close };
  } catch (error) {
    await connection.close().catch(() => {});
    throw error;
  }
}
