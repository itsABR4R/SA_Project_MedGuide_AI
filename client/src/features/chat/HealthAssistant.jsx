import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client.js';
import { cleanAiText } from '../../ai-text.js';
import VoiceInputButton from '../../components/VoiceInputButton.jsx';
import useReadAloud from '../../hooks/useReadAloud.js';
import { useI18n } from '../../i18n/context.js';
import {
  BranchIcon,
  ChevronIcon,
  CopyIcon,
  FolderIcon,
  PlusIcon,
  SendIcon,
  StopIcon,
  TrashIcon,
  VolumeIcon
} from '../../components/Icons.jsx';

const greeting =
  "Hello! I'm your AI health assistant. How can I help you today? You can ask me about symptoms, medications, general wellness, or anything health-related.";

function greetingMessages() {
  return [{ id: 'greeting', role: 'assistant', content: greeting }];
}

function localMessageId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function conversationSummary(conversation) {
  return {
    id: conversation.id,
    checkId: conversation.checkId || null,
    title: conversation.title,
    contextLabel: conversation.contextLabel || '',
    contextSummary: conversation.contextSummary || '',
    rootConversationId: conversation.rootConversationId || null,
    parentConversationId: conversation.parentConversationId || null,
    sourceMessageId: conversation.sourceMessageId || null,
    branchNumber: conversation.branchNumber || null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt
  };
}

function contextFromConversation(conversation, t) {
  if (!conversation?.contextSummary) return null;
  return {
    label: conversation.contextLabel || t('Conversation context'),
    content: conversation.contextSummary
  };
}

function contextFromCheck(check, t) {
  if (!check) return null;
  return {
    label: t('Symptom-check summary'),
    content: [
      t('Your query: {query}', { query: check.symptoms?.trim() || check.tags?.join(', ') || '' }),
      t('Guidance summary: {summary}', { summary: check.analysis?.summary || '' })
    ].join('\n\n')
  };
}

function historyTime(value, locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  }
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
}

function groupedThreads(conversations) {
  const roots = conversations.filter((conversation) => !conversation.rootConversationId);
  const groups = roots.map((root) => {
    const branches = conversations
      .filter((conversation) => conversation.rootConversationId === root.id)
      .sort((left, right) => (left.branchNumber || 0) - (right.branchNumber || 0));
    const latestUpdate = [root, ...branches].reduce(
      (latest, conversation) => Math.max(latest, new Date(conversation.updatedAt).getTime() || 0),
      0
    );
    return { root, branches, latestUpdate };
  });
  return groups.sort((left, right) => right.latestUpdate - left.latestUpdate);
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand?.('copy');
  textarea.remove();
  if (!copied) throw new Error('Clipboard access is unavailable.');
}

export default function HealthAssistant(props) {
  const scope = props.check?.id || (props.showArchived ? 'archive' : 'current');
  return <ScopedHealthAssistant key={scope} {...props} />;
}

function ScopedHealthAssistant({
  active,
  aiConfigured,
  check = null,
  showArchived = false,
  seed,
  onAiConfigurationError,
  onToast
}) {
  const { locale, t, formatNumber } = useI18n();
  const [messages, setMessages] = useState(() => (check ? [] : greetingMessages()));
  const [conversationContext, setConversationContext] = useState(() => contextFromCheck(check, t));
  const [conversations, setConversations] = useState([]);
  const [expandedRoots, setExpandedRoots] = useState(() => new Set());
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [loadingConversationId, setLoadingConversationId] = useState(null);
  const [branchingMessageId, setBranchingMessageId] = useState(null);
  const [historyError, setHistoryError] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(aiConfigured ? 'Ready' : 'Setup needed');
  const [copiedId, setCopiedId] = useState(null);
  const { speakingId, readMessage, stopSpeaking } = useReadAloud({
    active,
    onError: (message) => onToast?.(message, true)
  });
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const seenSeedRef = useRef(null);
  const historyLoadedRef = useRef(false);
  const copiedTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const operationRef = useRef(null);
  const checkId = check?.id || null;
  const scopeQuery = checkId ? `?checkId=${encodeURIComponent(checkId)}` : '?scope=unlinked';

  useEffect(() => setStatus(aiConfigured ? 'Ready' : 'Setup needed'), [aiConfigured]);

  useEffect(() => {
    if (!active || historyLoadedRef.current || (!checkId && !showArchived)) return;
    historyLoadedRef.current = true;
    api(`/api/chat/conversations${checkId ? scopeQuery : ''}`)
      .then((payload) => {
        if (!mountedRef.current) return;
        const loaded = (payload.conversations || []).filter((entry) => (entry.checkId || null) === checkId);
        setConversations(loaded);
        setExpandedRoots(
          new Set(loaded.filter((entry) => entry.rootConversationId).map((entry) => entry.rootConversationId))
        );
        setHistoryError('');
      })
      .catch((error) => {
        if (!mountedRef.current) return;
        historyLoadedRef.current = false;
        setHistoryError(error.message);
      });
  }, [active, checkId, scopeQuery, showArchived]);

  useEffect(() => {
    if (!seed || seenSeedRef.current === seed.id) return;
    if (seed.checkId && seed.checkId !== checkId) return;
    seenSeedRef.current = seed.id;
    operationRef.current?.abort();
    operationRef.current = null;
    setBusy(false);
    setLoadingConversationId(null);
    setBranchingMessageId(null);
    setInput('');
    stopSpeaking();
    setActiveConversationId(null);
    setConversationContext({ label: seed.label || t('Symptom-check summary'), content: seed.content });
    setMessages([]);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [seed, t, stopSpeaking, checkId]);

  useEffect(() => {
    if (!active) return;
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [messages, active, conversationContext]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationRef.current?.abort();
      window.clearTimeout(copiedTimerRef.current);
    };
  }, []);

  function upsertConversation(conversation) {
    if ((conversation.checkId || null) !== checkId) return;
    const summary = conversationSummary(conversation);
    setConversations((current) => [summary, ...current.filter((item) => item.id !== summary.id)]);
  }

  function startNewChat() {
    operationRef.current?.abort();
    operationRef.current = null;
    stopSpeaking();
    setActiveConversationId(null);
    setLoadingConversationId(null);
    setBranchingMessageId(null);
    setConversationContext(contextFromCheck(check, t));
    setMessages(check ? [] : greetingMessages());
    setInput('');
    setHistoryError('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function openConversation(conversationId) {
    if (busy || loadingConversationId || branchingMessageId) return;
    stopSpeaking();
    setLoadingConversationId(conversationId);
    setHistoryError('');
    const operation = new AbortController();
    operationRef.current = operation;
    try {
      const payload = await api(
        `/api/chat/conversations/${encodeURIComponent(conversationId)}${scopeQuery}`,
        { signal: operation.signal }
      );
      if (!mountedRef.current || operationRef.current !== operation) return;
      const conversation = payload.conversation;
      setActiveConversationId(conversation.id);
      setConversationContext(contextFromConversation(conversation, t));
      setMessages(
        conversation.messages?.length
          ? conversation.messages
          : conversation.contextSummary
            ? []
            : greetingMessages()
      );
      const rootId = conversation.rootConversationId || conversation.id;
      setExpandedRoots((current) => new Set(current).add(rootId));
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } catch (error) {
      if (!mountedRef.current || operationRef.current !== operation) return;
      setHistoryError(error.message);
      onToast?.(error.message, true);
    } finally {
      if (mountedRef.current && operationRef.current === operation) setLoadingConversationId(null);
    }
  }

  async function deleteConversation(conversation) {
    const isMain = !conversation.rootConversationId;
    const prompt = isMain
      ? t('Delete “{title}” and all of its branches? This cannot be undone.', {
          title: conversation.title
        })
      : t('Delete “{title}”? This cannot be undone.', { title: conversation.title });
    if (!window.confirm(prompt)) return;
    try {
      await api(`/api/chat/conversations/${encodeURIComponent(conversation.id)}`, { method: 'DELETE' });
      const removedIds = new Set(
        conversations
          .filter(
            (entry) =>
              entry.id === conversation.id || (isMain && entry.rootConversationId === conversation.id)
          )
          .map((entry) => entry.id)
      );
      setConversations((current) => current.filter((item) => !removedIds.has(item.id)));
      if (removedIds.has(activeConversationId)) startNewChat();
      onToast?.(t(isMain ? 'Conversation folder deleted.' : 'Chat branch deleted.'));
    } catch (error) {
      onToast?.(error.message, true);
    }
  }

  async function copyMessage(message) {
    try {
      await writeClipboard(message.content);
      window.clearTimeout(copiedTimerRef.current);
      setCopiedId(message.id);
      copiedTimerRef.current = window.setTimeout(() => setCopiedId(null), 1600);
    } catch (error) {
      onToast?.(t(error.message || 'The message could not be copied.'), true);
    }
  }

  async function branchConversation(message) {
    if (!activeConversationId || branchingMessageId || busy) return;
    setBranchingMessageId(message.id);
    stopSpeaking();
    const operation = new AbortController();
    operationRef.current = operation;
    try {
      const payload = await api(
        `/api/chat/conversations/${encodeURIComponent(activeConversationId)}/branches`,
        {
          method: 'POST',
          signal: operation.signal,
          body: JSON.stringify({ sourceMessageId: message.id, checkId })
        }
      );
      if (!mountedRef.current || operationRef.current !== operation) return;
      const conversation = payload.conversation;
      upsertConversation(conversation);
      setActiveConversationId(conversation.id);
      setConversationContext(contextFromConversation(conversation, t));
      setMessages([]);
      setExpandedRoots((current) => new Set(current).add(conversation.rootConversationId));
      onToast?.(
        t('Branch {number} created with the previous context.', {
          number: formatNumber(conversation.branchNumber)
        })
      );
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } catch (error) {
      if (!mountedRef.current || operationRef.current !== operation) return;
      onToast?.(error.message, true);
    } finally {
      if (mountedRef.current && operationRef.current === operation) setBranchingMessageId(null);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const history = messages
      .filter((message) => message.id !== 'greeting')
      .slice(-10)
      .map(({ role, content }) => ({ role: role === 'user' ? 'user' : 'assistant', content }));
    const userMessage = { id: localMessageId('user'), role: 'user', content: text };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setBusy(true);
    setStatus('Thinking');
    const operation = new AbortController();
    operationRef.current = operation;
    try {
      const payload = await api('/api/chat', {
        method: 'POST',
        signal: operation.signal,
        body: JSON.stringify({
          message: text,
          checkId,
          history,
          ...(activeConversationId
            ? { conversationId: activeConversationId }
            : conversationContext
              ? {
                  contextLabel: conversationContext.label,
                  contextSummary: conversationContext.content
                }
              : {})
        })
      });
      if (!mountedRef.current || operationRef.current !== operation) return;
      setActiveConversationId(payload.conversation.id);
      setConversationContext(contextFromConversation(payload.conversation, t));
      setMessages(
        payload.conversation.messages || [
          ...messages,
          userMessage,
          { id: localMessageId('assistant'), role: 'assistant', content: payload.reply }
        ]
      );
      upsertConversation(payload.conversation);
      setStatus('Ready');
    } catch (error) {
      if (!mountedRef.current || operationRef.current !== operation) return;
      setMessages((current) => [
        ...current,
        {
          id: localMessageId('error'),
          role: 'assistant',
          content: t("I couldn't send that request: {message}", { message: error.message })
        }
      ]);
      setStatus(error.code === 'AI_NOT_CONFIGURED' ? 'Setup needed' : 'Try again');
      if (error.code === 'AI_NOT_CONFIGURED') onAiConfigurationError();
    } finally {
      if (mountedRef.current && operationRef.current === operation) {
        setBusy(false);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  }

  const threadGroups = groupedThreads(conversations);
  const activeConversation = conversations.find((item) => item.id === activeConversationId);
  const activeRootId = activeConversation?.rootConversationId || activeConversation?.id || null;
  const activeBranchCount = activeRootId
    ? conversations.filter((item) => item.rootConversationId === activeRootId).length
    : 0;
  const branchLimitReached = activeBranchCount >= 2;

  function toggleRoot(rootId) {
    setExpandedRoots((current) => {
      const next = new Set(current);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }

  function historyItem(conversation, branch = false) {
    const loading = loadingConversationId === conversation.id;
    const activeItem = activeConversationId === conversation.id;
    return (
      <div
        className={`chat-history-item${branch ? ' branch' : ' root'}${activeItem ? ' active' : ''}`}
        key={conversation.id}
      >
        {branch && (
          <span className="chat-history-entry-icon branch-icon" aria-hidden="true">
            <BranchIcon />
          </span>
        )}
        <button
          className="chat-history-select"
          type="button"
          aria-label={`${t(branch ? 'Branch' : 'Main conversation')}: ${conversation.title}`}
          onClick={() => openConversation(conversation.id)}
          disabled={busy || Boolean(loadingConversationId) || Boolean(branchingMessageId)}
          aria-current={activeItem ? 'true' : undefined}
        >
          <span>{conversation.title}</span>
          <small>{loading ? t('Opening…') : historyTime(conversation.updatedAt, locale)}</small>
        </button>
        <button
          className="chat-delete-button"
          type="button"
          aria-label={t('Delete {title}', { title: conversation.title })}
          title={t(branch ? 'Delete branch' : 'Delete conversation folder')}
          disabled={busy}
          onClick={() => deleteConversation(conversation)}
        >
          <TrashIcon />
        </button>
      </div>
    );
  }

  return (
    <div className={`tab${active ? ' active' : ''}`} id="tab-chat">
      <div className="chat-layout">
        <aside className="chat-history-panel" aria-label={t('Chat history')}>
          <div className="chat-history-header">
            <div>
              <div className="chat-history-title">{t('Conversations')}</div>
              <div className="chat-history-subtitle">
                {t(
                  check
                    ? 'Chats for this symptom check'
                    : showArchived
                      ? 'Other saved conversations'
                      : 'Current conversation'
                )}
              </div>
            </div>
          </div>
          <button className="new-chat-button" type="button" onClick={startNewChat} disabled={busy}>
            <PlusIcon />
            <span>{t('New chat')}</span>
          </button>
          <div className="chat-history-list">
            {historyError && <div className="chat-history-error">{historyError}</div>}
            {!historyError && !conversations.length && (
              <div className="chat-history-empty">
                {t(
                  check
                    ? 'Chats for this check will appear here.'
                    : showArchived
                      ? 'Your saved conversations will appear here.'
                      : 'Start a new chat. Open earlier discussions from Check History.'
                )}
              </div>
            )}
            {threadGroups.map(({ root, branches }) => {
              const expanded = expandedRoots.has(root.id);
              return (
                <div className="chat-thread-group" key={root.id}>
                  <div className="chat-thread-root-row">
                    <button
                      className={`chat-thread-toggle${expanded ? ' expanded' : ''}`}
                      type="button"
                      onClick={() => toggleRoot(root.id)}
                      disabled={!branches.length}
                      aria-label={t(
                        expanded ? 'Collapse branches for {title}' : 'Expand branches for {title}',
                        { title: root.title }
                      )}
                      aria-expanded={branches.length ? expanded : undefined}
                    >
                      <ChevronIcon />
                    </button>
                    <span className="chat-history-entry-icon folder-icon" aria-hidden="true">
                      <FolderIcon />
                    </span>
                    <div className="chat-thread-root-item">{historyItem(root)}</div>
                    {branches.length > 0 && (
                      <span className="branch-count-badge">
                        {formatNumber(branches.length)}/{formatNumber(2)}
                      </span>
                    )}
                  </div>
                  {expanded && branches.length > 0 && (
                    <div
                      className="chat-branch-list"
                      aria-label={t('Branches of {title}', { title: root.title })}
                    >
                      {branches.map((branch) => historyItem(branch, true))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <div className="chat-wrap">
          <div className="chat-hdr">
            <div>
              <div className="ttl">{activeConversation?.title || t('AI Health Assistant')}</div>
              <div className="sub">{t('Ask about health, symptoms, medications, or general wellness')}</div>
            </div>
            <div className="chat-status" id="chat-status">
              ● {t(status)}
            </div>
          </div>
          <div className="chat-msgs" id="chat-msgs" ref={messagesRef} aria-live="polite">
            {conversationContext && (
              <section className="chat-context-card" aria-label={conversationContext.label}>
                <div className="chat-context-header">
                  <div>
                    <strong>{conversationContext.label}</strong>
                    <span>{t('Context summary · not an AI response')}</span>
                  </div>
                </div>
                <div className="chat-context-content">{cleanAiText(conversationContext.content)}</div>
              </section>
            )}
            {messages.map((message) => {
              const isAssistant = message.role === 'assistant';
              const displayedContent = isAssistant
                ? cleanAiText(message.id === 'greeting' ? t(greeting) : message.content)
                : message.content;
              const canBranch =
                isAssistant &&
                message.id !== 'greeting' &&
                !message.id.startsWith('error-') &&
                Boolean(activeConversationId);
              return (
                <div className={`message-block ${message.role === 'user' ? 'user' : 'ai'}`} key={message.id}>
                  <div className={`msg ${message.role === 'user' ? 'user' : 'ai'}`}>{displayedContent}</div>
                  <div className="message-actions">
                    <button
                      className="message-action"
                      type="button"
                      title={t('Copy to clipboard')}
                      aria-label={t(
                        message.role === 'user' ? 'Copy message to clipboard' : 'Copy response to clipboard'
                      )}
                      onClick={() => copyMessage({ ...message, content: displayedContent })}
                    >
                      <CopyIcon />
                      <span>{t(copiedId === message.id ? 'Copied' : 'Copy')}</span>
                    </button>
                    {isAssistant && (
                      <button
                        className={`message-action${speakingId === message.id ? ' active' : ''}`}
                        type="button"
                        title={t(speakingId === message.id ? 'Stop reading' : 'Read response aloud')}
                        aria-label={t(
                          speakingId === message.id ? 'Stop reading response' : 'Read response aloud'
                        )}
                        onClick={() => readMessage({ ...message, content: displayedContent })}
                      >
                        {speakingId === message.id ? <StopIcon /> : <VolumeIcon />}
                        <span>{t(speakingId === message.id ? 'Stop' : 'Read aloud')}</span>
                      </button>
                    )}
                    {canBranch && (
                      <button
                        className="message-action branch-action"
                        type="button"
                        title={
                          branchLimitReached
                            ? t('This main conversation already has two branches')
                            : t('Continue from this response in a new branch')
                        }
                        aria-label={
                          branchLimitReached
                            ? t('Branch limit reached for this conversation')
                            : t('Branch to new chat from this response')
                        }
                        disabled={branchLimitReached || Boolean(branchingMessageId) || busy}
                        onClick={() => branchConversation(message)}
                      >
                        <BranchIcon />
                        <span>
                          {branchingMessageId === message.id
                            ? t('Branching…')
                            : branchLimitReached
                              ? t('2 branches used')
                              : t('Branch to new chat')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {busy && (
              <div className="message-block ai">
                <div
                  className="msg ai chat-thinking"
                  id="chat-thinking"
                  aria-label={t('Assistant is thinking')}
                >
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>
          <div className="chat-input-row">
            <div className="voice-textarea-wrap chat-voice-textarea-wrap">
              <textarea
                className="chat-in"
                id="chat-in"
                rows="1"
                maxLength="2400"
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder={t("Type your message here… (e.g., 'What can I do for a mild headache?')")}
              />
              <VoiceInputButton
                value={input}
                onChange={setInput}
                onError={(message) => onToast?.(message, true)}
                maxLength={2400}
                disabled={busy || !active}
                context="message"
              />
            </div>
            <button
              className="send-btn"
              id="chat-send"
              type="button"
              aria-label={t('Send message')}
              disabled={busy || !input.trim()}
              onClick={send}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
