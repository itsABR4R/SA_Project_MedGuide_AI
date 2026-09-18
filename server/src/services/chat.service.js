import crypto from 'node:crypto';
import { AppError } from '../utils/app-error.js';
import { normalizeLanguage } from '../utils/language.js';
import { cleanText } from '../utils/text.js';
import { checkContext, legacyCheckMatch } from '../utils/check-context.js';

function message(role, content, createdAt = new Date()) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt
  };
}

function conversationTitle(content, language) {
  const firstLine = cleanText(String(content || '').split('\n')[0], 80);
  if (firstLine.length <= 56) {
    return (
      firstLine ||
      (normalizeLanguage(language) === 'bn' ? 'নতুন স্বাস্থ্য কথোপকথন' : 'New health conversation')
    );
  }
  return `${firstLine.slice(0, 55).trimEnd()}…`;
}

function branchTitle(rootTitle, branchNumber, language) {
  const bangla = normalizeLanguage(language) === 'bn';
  const suffix = bangla
    ? `শাখা ${new Intl.NumberFormat('bn-BD').format(branchNumber)}`
    : `Branch ${branchNumber}`;
  const available = 77 - suffix.length;
  const title = cleanText(rootTitle, Math.max(20, available));
  return `${title || (bangla ? 'স্বাস্থ্য কথোপকথন' : 'Health conversation')} · ${suffix}`;
}

function compactContextPart(content, limit = 520) {
  const cleaned = String(content || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= limit) return cleaned;
  return `${cleaned.slice(0, limit - 1).trimEnd()}…`;
}

function inheritedContext(conversation, sourceMessageIndex, language) {
  const bangla = normalizeLanguage(language) === 'bn';
  const priorMessages = conversation.messages.slice(0, sourceMessageIndex + 1).slice(-6);
  const transcript = priorMessages
    .map(
      (entry) =>
        `${entry.role === 'user' ? (bangla ? 'ব্যবহারকারী' : 'User') : bangla ? 'সহকারী' : 'Assistant'}: ${compactContextPart(entry.content, 420)}`
    )
    .join('\n');
  return [
    conversation.contextSummary
      ? `${bangla ? 'আগের প্রেক্ষাপট' : 'Earlier context'}:\n${compactContextPart(conversation.contextSummary, 2400)}`
      : '',
    transcript
      ? `${bangla ? 'এই শাখার আগের কথোপকথন' : 'Conversation before this branch'}:\n${transcript}`
      : ''
  ]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 6000);
}

export function createChatService({ repository, aiService }) {
  async function linkLegacyConversations(userId) {
    const roots = await repository.listLegacyChatRoots(userId);
    if (!roots.length) return;
    const checks = await repository.listChecks(userId);
    for (const root of roots) {
      const checkId = legacyCheckMatch(root, checks);
      if (checkId) await repository.linkChatTreeToCheck(root.id, userId, checkId);
    }
  }

  async function selectedCheck(userId, checkId) {
    if (!checkId) return null;
    const check = await repository.findCheck(checkId, userId);
    if (!check) throw new AppError(404, 'CHECK_NOT_FOUND', 'That saved check was not found.');
    return check;
  }

  function verifyScope(conversation, requestedCheckId) {
    if (requestedCheckId !== undefined && (conversation.checkId || null) !== (requestedCheckId || null)) {
      throw new AppError(
        409,
        'CONVERSATION_SCOPE_MISMATCH',
        'This conversation belongs to a different symptom check. Open its report from Check History.'
      );
    }
  }

  async function verifyCheckAfterWrite(userId, checkId) {
    if (checkId && !(await repository.findCheck(checkId, userId))) {
      await repository.deleteChatsForCheck(checkId, userId);
      throw new AppError(404, 'CHECK_NOT_FOUND', 'That saved check was not found.');
    }
  }

  return {
    linkLegacyConversations,

    async list(userId, checkId = null) {
      await selectedCheck(userId, checkId);
      await linkLegacyConversations(userId);
      return repository.listChatConversations(userId, checkId);
    },

    async get(conversationId, userId, requestedCheckId) {
      await linkLegacyConversations(userId);
      const conversation = await repository.findChatConversation(conversationId, userId);
      if (!conversation) {
        throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'That chat conversation was not found.');
      }
      verifyScope(conversation, requestedCheckId);
      await selectedCheck(userId, conversation.checkId);
      return conversation;
    },

    async send(user, payload) {
      const language = normalizeLanguage(payload.language);
      let currentConversation = null;
      if (payload.conversationId) {
        currentConversation = await this.get(payload.conversationId, user.id, payload.checkId);
      }

      const checkId = currentConversation?.checkId || payload.checkId || null;
      const check = await selectedCheck(user.id, checkId);

      const history = currentConversation
        ? currentConversation.messages.slice(-10).map(({ role, content }) => ({ role, content }))
        : payload.history || [];
      const contextSummary = currentConversation
        ? currentConversation.contextSummary || ''
        : payload.contextSummary || checkContext(check, language);
      const reply = await aiService.chat(
        user,
        { message: payload.message, history, contextSummary, language },
        check
      );
      // A check can be deleted while the provider is generating this response.
      await selectedCheck(user.id, checkId);
      const now = new Date();
      const newMessages = [message('user', payload.message, now), message('assistant', reply, now)];

      let conversation;
      if (currentConversation) {
        conversation = await repository.appendChatMessages(currentConversation.id, user.id, newMessages);
      } else {
        const initialMessages = (payload.history || [])
          .slice(-10)
          .map((entry) => message(entry.role === 'assistant' ? 'assistant' : 'user', entry.content, now));
        conversation = await repository.createChatConversation({
          userId: user.id,
          accountType: user.accountType === 'guest' ? 'guest' : 'registered',
          checkId,
          title: conversationTitle(payload.message, language),
          contextLabel:
            payload.contextLabel ||
            (check ? (language === 'bn' ? 'উপসর্গ পরীক্ষার সারাংশ' : 'Symptom-check summary') : ''),
          contextSummary,
          language,
          messages: [...initialMessages, ...newMessages]
        });
      }

      if (!conversation) {
        throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'That chat conversation was not found.');
      }
      await verifyCheckAfterWrite(user.id, checkId);
      return { reply, conversation };
    },

    async branch(user, conversationId, sourceMessageId, requestedLanguage = 'en', requestedCheckId) {
      const language = normalizeLanguage(requestedLanguage);
      const sourceConversation = await this.get(conversationId, user.id, requestedCheckId);

      const sourceMessageIndex = sourceConversation.messages.findIndex(
        (entry) => entry.id === sourceMessageId && entry.role === 'assistant'
      );
      if (sourceMessageIndex < 0) {
        throw new AppError(400, 'BRANCH_SOURCE_INVALID', 'Select an AI response to start a branch.');
      }

      const rootConversationId = sourceConversation.rootConversationId || sourceConversation.id;
      const rootConversation =
        rootConversationId === sourceConversation.id
          ? sourceConversation
          : await repository.findChatConversation(rootConversationId, user.id);
      if (!rootConversation) {
        throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'The main conversation was not found.');
      }
      verifyScope(sourceConversation, rootConversation.checkId || null);
      const checkId = rootConversation.checkId || null;
      await selectedCheck(user.id, checkId);

      const branches = await repository.listChatBranches(rootConversationId, user.id);
      if (branches.length >= 2) {
        throw new AppError(
          409,
          'BRANCH_LIMIT_REACHED',
          'This main conversation already has the maximum of two branches.'
        );
      }
      const usedNumbers = new Set(branches.map((entry) => entry.branchNumber));
      const branchNumber = usedNumbers.has(1) ? 2 : 1;

      try {
        const conversation = await repository.createChatConversation({
          userId: user.id,
          accountType: user.accountType === 'guest' ? 'guest' : 'registered',
          checkId,
          title: branchTitle(rootConversation.title, branchNumber, language),
          contextLabel:
            language === 'bn'
              ? `${sourceConversation.title} থেকে পাওয়া প্রেক্ষাপট`
              : `Inherited context from ${sourceConversation.title}`,
          contextSummary: inheritedContext(sourceConversation, sourceMessageIndex, language),
          rootConversationId,
          parentConversationId: sourceConversation.id,
          sourceMessageId,
          branchNumber,
          language,
          messages: []
        });
        await verifyCheckAfterWrite(user.id, checkId);
        return { conversation };
      } catch (error) {
        if (error?.code === 11000) {
          throw new AppError(
            409,
            'BRANCH_LIMIT_REACHED',
            'This main conversation already has the maximum of two branches.'
          );
        }
        throw error;
      }
    },

    async remove(conversationId, userId) {
      const conversation = await repository.findChatConversation(conversationId, userId);
      if (!conversation) {
        throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'That chat conversation was not found.');
      }
      const deleted = conversation.rootConversationId
        ? await repository.deleteChatConversation(conversationId, userId)
        : await repository.deleteChatConversationTree(conversationId, userId);
      if (!deleted) {
        throw new AppError(404, 'CONVERSATION_NOT_FOUND', 'That chat conversation was not found.');
      }
    }
  };
}
