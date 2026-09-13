const LEVELS = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: Number.POSITIVE_INFINITY
});

function errorDetails(error, includeStack) {
  if (!(error instanceof Error)) return error;
  return {
    name: error.name,
    message: error.message,
    ...(error.code ? { code: error.code } : {}),
    ...(includeStack && error.stack ? { stack: error.stack } : {})
  };
}

function normalizeContext(context, includeStack) {
  return Object.fromEntries(
    Object.entries(context || {}).map(([key, value]) => [key, errorDetails(value, includeStack)])
  );
}

export function createLogger({
  environment = process.env.NODE_ENV || 'development',
  level = process.env.LOG_LEVEL || (environment === 'test' ? 'silent' : 'info'),
  bindings = {}
} = {}) {
  const minimum = LEVELS[level] ?? LEVELS.info;
  const structured = environment === 'production';
  const includeStack = environment !== 'production';

  function write(logLevel, message, context = {}) {
    if (LEVELS[logLevel] < minimum) return;
    const metadata = { ...bindings, ...normalizeContext(context, includeStack) };
    const output = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      message,
      ...metadata
    };
    const method = logLevel === 'debug' ? 'log' : logLevel;

    if (structured) {
      console[method](JSON.stringify(output));
      return;
    }

    const suffix = Object.keys(metadata).length ? metadata : '';
    console[method](`[${output.timestamp}] ${logLevel.toUpperCase()} ${message}`, suffix);
  }

  return Object.freeze({
    debug: (message, context) => write('debug', message, context),
    info: (message, context) => write('info', message, context),
    warn: (message, context) => write('warn', message, context),
    error: (message, context) => write('error', message, context),
    child: (childBindings) =>
      createLogger({ environment, level, bindings: { ...bindings, ...childBindings } })
  });
}

export const logger = createLogger();
