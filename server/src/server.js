import { databaseStatus } from './config/database.js';
import { config as defaultConfig } from './config/env.js';
import { createLogger } from './config/logger.js';
import { createRuntime } from './runtime.js';

function listen(app, config) {
  return new Promise((resolve, reject) => {
    const server = app.listen(config.port, config.host);
    server.keepAliveTimeout = config.http?.keepAliveTimeoutMs || 5_000;
    server.headersTimeout = config.http?.headersTimeoutMs || 6_000;
    server.requestTimeout = config.http?.requestTimeoutMs || 60_000;
    server.once('listening', () => resolve(server));
    server.once('error', reject);
  });
}

function closeHttpServer(server, timeoutMs, logger) {
  return new Promise((resolve, reject) => {
    let complete = false;
    const finish = (error) => {
      if (complete) return;
      complete = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => {
      logger.warn('HTTP shutdown deadline reached; closing remaining connections.');
      server.closeAllConnections?.();
      finish();
    }, timeoutMs);
    timer.unref?.();

    server.close(finish);
    server.closeIdleConnections?.();
  });
}

export async function startServer(
  config = defaultConfig,
  { logger = createLogger({ environment: config.env, level: config.logLevel }) } = {}
) {
  let runtime;
  let server;

  try {
    runtime = await createRuntime(config, { logger });
    const { app, connection, aiService } = runtime;
    server = await listen(app, config);

    logger.info('MedGuide AI started.', {
      address: `http://localhost:${config.port}`,
      databaseStatus: databaseStatus(connection),
      aiConfigured: aiService.isConfigured()
    });
    if (!aiService.isConfigured()) {
      logger.warn('OpenRouter is not configured; analysis and chat are unavailable until a key is added.');
    }

    let shutdownPromise;
    const shutdown = (reason = 'manual') => {
      if (shutdownPromise) return shutdownPromise;
      shutdownPromise = (async () => {
        logger.info('Application shutdown started.', { reason });
        await closeHttpServer(server, config.http?.shutdownTimeoutMs || 10_000, logger);
        await runtime.close();
        logger.info('Application shutdown completed.', { reason });
      })();
      return shutdownPromise;
    };

    return { ...runtime, server, shutdown };
  } catch (error) {
    if (server?.listening) await closeHttpServer(server, 2_000, logger).catch(() => {});
    await runtime?.close().catch(() => {});
    throw error;
  }
}
