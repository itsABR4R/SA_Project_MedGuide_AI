import { createLogger } from '../../server/src/config/logger.js';

export const silentLogger = createLogger({ environment: 'test', level: 'silent' });

function startCommand() {
  return process.platform === 'win32'
    ? 'Start-Service MongoDB (Administrator PowerShell)'
    : 'sudo systemctl start mongod';
}

export function printDatabaseError(summary, error) {
  console.error(summary);
  console.error(`Start the local service with: ${startCommand()}`);
  console.error(`Reason: ${error.message}`);
}
