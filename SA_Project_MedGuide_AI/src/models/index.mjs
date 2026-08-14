import { userSchema } from './user.model.mjs';
import { sessionSchema } from './session.model.mjs';
import { healthCheckSchema } from './health-check.model.mjs';

export function registerModels(connection) {
  return {
    User: connection.models.User || connection.model('User', userSchema),
    Session: connection.models.Session || connection.model('Session', sessionSchema),
    HealthCheck: connection.models.HealthCheck || connection.model('HealthCheck', healthCheckSchema)
  };
}
