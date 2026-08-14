import { config as defaultConfig } from './config/env.mjs';
import { connectDatabase, databaseStatus } from './config/database.mjs';
import { registerModels } from './models/index.mjs';
import { createMongoRepository } from './repositories/mongo.repository.mjs';
import { createAiService } from './services/ai.service.mjs';
import { createApp } from './app.mjs';

function listen(app, config) {
  return new Promise((resolve, reject) => {
    const server = app.listen(config.port, config.host);
    server.once('listening', () => resolve(server));
    server.once('error', reject);
  });
}

export async function startServer(config = defaultConfig) {
  const connection = await connectDatabase(config.mongodb);
  let app;
  let repository;
  let aiService;
  let server;
  try {
    const models = registerModels(connection);
    if (config.mongodb.autoIndex) {
      await Promise.all(Object.values(models).map((model) => model.init()));
    }
    repository = createMongoRepository(models);
    aiService = createAiService({ config });
    app = createApp({
      repository,
      aiService,
      config,
      getDatabaseStatus: () => databaseStatus(connection)
    });
    server = await listen(app, config);
  } catch (error) {
    await connection.close();
    throw error;
  }

  console.log(`MedGuide AI is running at http://localhost:${config.port}`);
  console.log(`MongoDB status: ${databaseStatus(connection)}`);
  if (!aiService.isConfigured()) console.log('AI is not configured yet. Set OPENROUTER_API_KEY before using analysis or chat.');

  const shutdown = async (signal) => {
    console.log(`Received ${signal}; shutting down.`);
    await new Promise((resolve) => server.close(resolve));
    await connection.close();
  };
  process.once('SIGINT', () => shutdown('SIGINT').catch(console.error));
  process.once('SIGTERM', () => shutdown('SIGTERM').catch(console.error));

  return { app, server, connection, repository };
}
