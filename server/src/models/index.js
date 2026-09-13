import { userSchema } from './user.model.js';
import { guestUserSchema } from './guest-user.model.js';
import { sessionSchema } from './session.model.js';
import { healthCheckSchema } from './health-check.model.js';
import { chatConversationSchema } from './chat-conversation.model.js';

export function registerModels(connection) {
  return {
    User: connection.models.User || connection.model('User', userSchema),
    GuestUser: connection.models.GuestUser || connection.model('GuestUser', guestUserSchema),
    Session: connection.models.Session || connection.model('Session', sessionSchema),
    HealthCheck: connection.models.HealthCheck || connection.model('HealthCheck', healthCheckSchema),
    ChatConversation:
      connection.models.ChatConversation || connection.model('ChatConversation', chatConversationSchema)
  };
}
