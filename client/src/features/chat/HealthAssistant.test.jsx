import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client.js';
import {
  FakeSpeechRecognition,
  installSpeechRecognition,
  removeSpeechRecognition
} from '../../test/speech-recognition.js';
import HealthAssistant from './HealthAssistant.jsx';

vi.mock('../../api/client.js', () => ({ api: vi.fn() }));

describe('AI chat interface', () => {
  let clipboardWrite;
  let speechSynthesis;

  beforeEach(() => {
    api.mockReset();
    installSpeechRecognition();
    clipboardWrite = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite }
    });
    window.SpeechSynthesisUtterance = class SpeechSynthesisUtterance {
      constructor(text) {
        this.text = text;
      }
    };
    speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => [
        { name: 'English', lang: 'en-US', default: true },
        { name: 'Bangla', lang: 'bn-BD' }
      ])
    };
    window.speechSynthesis = speechSynthesis;
  });

  afterEach(removeSpeechRecognition);

  it('places a dictated message in the chat box without sending it', async () => {
    const user = userEvent.setup();

    render(
      <HealthAssistant active aiConfigured seed={null} onAiConfigurationError={vi.fn()} onToast={vi.fn()} />
    );

    expect(api).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Type message by voice' }));
    act(() => {
      FakeSpeechRecognition.instances[0].emitTranscript('What should I monitor tonight');
    });

    expect(screen.getByPlaceholderText(/Type your message here/i)).toHaveValue(
      'What should I monitor tonight'
    );
    expect(api.mock.calls.some(([path]) => path === '/api/chat')).toBe(false);
  });

  it('loads only conversations linked to the selected symptom check', async () => {
    const check = {
      id: 'current-check',
      symptoms: 'Current headache',
      tags: [],
      analysis: { summary: 'Current guidance.' }
    };
    api.mockResolvedValue({
      conversations: [
        {
          id: 'current-chat',
          checkId: check.id,
          title: 'Current symptom chat',
          updatedAt: '2026-09-11T00:00:00.000Z'
        },
        {
          id: 'other-chat',
          checkId: 'another-check',
          title: 'Different symptom chat',
          updatedAt: '2026-09-10T00:00:00.000Z'
        }
      ]
    });

    render(
      <HealthAssistant
        active
        aiConfigured
        check={check}
        seed={null}
        onAiConfigurationError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    expect(
      await screen.findByRole('button', { name: 'Main conversation: Current symptom chat' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Different symptom chat')).not.toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/api/chat/conversations?checkId=current-check');
  });

  it('opens saved history and provides copy and read-aloud actions', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite }
    });
    const conversation = {
      id: 'conversation-1',
      title: 'Headache follow-up',
      createdAt: '2026-08-17T10:00:00.000Z',
      updatedAt: '2026-08-17T10:01:00.000Z',
      messages: [
        { id: 'message-1', role: 'user', content: 'What should I monitor?' },
        { id: 'message-2', role: 'assistant', content: 'Monitor changes and seek care if worse.' }
      ]
    };
    api.mockImplementation(async (path) => {
      if (path === '/api/chat/conversations') {
        return { conversations: [conversation] };
      }
      if (path === '/api/chat/conversations/conversation-1?scope=unlinked') return { conversation };
      throw new Error(`Unexpected request: ${path}`);
    });

    render(
      <HealthAssistant
        active
        aiConfigured
        showArchived
        seed={null}
        onAiConfigurationError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    await user.click(await screen.findByRole('button', { name: 'Main conversation: Headache follow-up' }));
    expect(await screen.findByText('Monitor changes and seek care if worse.')).toBeInTheDocument();

    const response = screen.getByText('Monitor changes and seek care if worse.').closest('.message-block');
    await user.click(within(response).getByRole('button', { name: 'Copy response to clipboard' }));
    await waitFor(() =>
      expect(clipboardWrite).toHaveBeenCalledWith('Monitor changes and seek care if worse.')
    );

    await user.click(within(response).getByRole('button', { name: 'Read response aloud' }));
    expect(speechSynthesis.speak).toHaveBeenCalledOnce();
    expect(speechSynthesis.speak.mock.calls[0][0].text).toBe('Monitor changes and seek care if worse.');
  });

  it('creates a saved conversation and adds it to the history column', async () => {
    const user = userEvent.setup();
    const conversation = {
      id: 'conversation-2',
      title: 'Can dehydration cause fatigue?',
      createdAt: '2026-08-17T10:00:00.000Z',
      updatedAt: '2026-08-17T10:01:00.000Z',
      messages: [
        { id: 'message-3', role: 'user', content: 'Can dehydration cause fatigue?' },
        {
          id: 'message-4',
          role: 'assistant',
          content: 'Dehydration can contribute to fatigue, but other causes are possible.'
        }
      ]
    };
    api.mockImplementation(async (path, options) => {
      if (path === '/api/chat' && options?.method === 'POST')
        return { conversation, reply: conversation.messages[1].content };
      throw new Error(`Unexpected request: ${path}`);
    });

    render(
      <HealthAssistant active aiConfigured seed={null} onAiConfigurationError={vi.fn()} onToast={vi.fn()} />
    );

    await user.type(screen.getByPlaceholderText(/Type your message here/i), 'Can dehydration cause fatigue?');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText(conversation.messages[1].content)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Main conversation: Can dehydration cause fatigue?' })
    ).toBeInTheDocument();
    const request = api.mock.calls.find(([path]) => path === '/api/chat');
    expect(JSON.parse(request[1].body)).toMatchObject({ message: 'Can dehydration cause fatigue?' });
  });

  it('cleans saved AI Markdown for display, copy, and speech while preserving user text', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite }
    });
    const conversation = {
      id: 'formatted-conversation',
      title: 'Bangla follow-up',
      messages: [
        { id: 'formatted-user', role: 'user', content: 'What does ** mean?' },
        { id: 'formatted-response', role: 'assistant', content: '* **বিশ্রাম নিন:** পর্যাপ্ত বিশ্রাম নিন।' }
      ]
    };
    api.mockImplementation(async (path) =>
      path === '/api/chat/conversations' ? { conversations: [conversation] } : { conversation }
    );
    render(
      <HealthAssistant active aiConfigured showArchived onAiConfigurationError={vi.fn()} onToast={vi.fn()} />
    );
    await user.click(await screen.findByRole('button', { name: 'Main conversation: Bangla follow-up' }));
    expect(screen.getByText('What does ** mean?')).toBeInTheDocument();
    const response = screen.getByText('• বিশ্রাম নিন: পর্যাপ্ত বিশ্রাম নিন।').closest('.message-block');
    await user.click(within(response).getByRole('button', { name: 'Copy response to clipboard' }));
    expect(clipboardWrite).toHaveBeenCalledWith('• বিশ্রাম নিন: পর্যাপ্ত বিশ্রাম নিন।');
    await user.click(within(response).getByRole('button', { name: 'Read response aloud' }));
    expect(speechSynthesis.speak.mock.calls[0][0]).toMatchObject({
      text: 'বিশ্রাম নিন: পর্যাপ্ত বিশ্রাম নিন।',
      lang: 'bn-BD',
      voice: { name: 'Bangla', lang: 'bn-BD' }
    });
    expect(conversation.messages[1].content).toBe('* **বিশ্রাম নিন:** পর্যাপ্ত বিশ্রাম নিন।');
  });

  it('shows a symptom-check seed as context instead of an assistant response', async () => {
    const user = userEvent.setup();
    const check = {
      id: 'check-1',
      symptoms: 'headache and nausea',
      tags: [],
      analysis: { summary: 'A symptom-pattern comparison.' }
    };
    const seed = {
      id: 'seed-1',
      checkId: check.id,
      label: 'Symptom-check summary',
      content: 'Your query: headache and nausea.\n\nSelected pattern: Migraine pattern.'
    };
    const conversation = {
      id: 'conversation-from-check',
      checkId: check.id,
      title: 'What should I monitor?',
      contextLabel: seed.label,
      contextSummary: seed.content,
      rootConversationId: null,
      branchNumber: null,
      createdAt: '2026-08-17T10:00:00.000Z',
      updatedAt: '2026-08-17T10:01:00.000Z',
      messages: [
        { id: 'seed-user', role: 'user', content: 'What should I monitor?' },
        { id: 'seed-response', role: 'assistant', content: 'Monitor changes and seek care if worse.' }
      ]
    };
    api.mockImplementation(async (path, options) => {
      if (path === '/api/chat/conversations?checkId=check-1') return { conversations: [] };
      if (path === '/api/chat' && options?.method === 'POST') {
        return { conversation, reply: conversation.messages[1].content };
      }
      throw new Error(`Unexpected request: ${path}`);
    });

    const { container } = render(
      <HealthAssistant
        active
        aiConfigured
        check={check}
        seed={seed}
        onAiConfigurationError={vi.fn()}
        onToast={vi.fn()}
      />
    );

    expect(await screen.findByLabelText('Symptom-check summary')).toHaveClass('chat-context-card');
    expect(screen.getByText(/Context summary · not an AI response/i)).toBeInTheDocument();
    expect(container.querySelectorAll('.msg.ai')).toHaveLength(0);

    await user.type(screen.getByPlaceholderText(/Type your message here/i), 'What should I monitor?');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    const request = api.mock.calls.find(([path]) => path === '/api/chat');
    expect(JSON.parse(request[1].body)).toMatchObject({
      checkId: check.id,
      contextLabel: seed.label,
      contextSummary: seed.content
    });
  });

  it('groups two branches under the main folder and disables a third branch', async () => {
    const user = userEvent.setup();
    const check = {
      id: 'check-2',
      symptoms: 'Headache',
      tags: [],
      analysis: { summary: 'A headache pattern comparison.' }
    };
    const root = {
      id: 'root-conversation',
      checkId: check.id,
      title: 'Headache follow-up',
      rootConversationId: null,
      branchNumber: null,
      createdAt: '2026-08-17T10:00:00.000Z',
      updatedAt: '2026-08-17T10:01:00.000Z',
      messages: [
        { id: 'root-user', role: 'user', content: 'What should I monitor?' },
        { id: 'root-response', role: 'assistant', content: 'Monitor changes and seek care if worse.' }
      ]
    };
    const branches = [1, 2].map((branchNumber) => ({
      id: `branch-${branchNumber}`,
      checkId: check.id,
      title: `Headache follow-up · Branch ${branchNumber}`,
      contextLabel: 'Inherited context from Headache follow-up',
      contextSummary: 'Conversation before this branch: monitor changes and seek care if worse.',
      rootConversationId: root.id,
      parentConversationId: root.id,
      sourceMessageId: 'root-response',
      branchNumber,
      createdAt: `2026-08-17T10:0${branchNumber}:00.000Z`,
      updatedAt: `2026-08-17T10:0${branchNumber}:00.000Z`,
      messages: []
    }));
    let branchRequestCount = 0;
    api.mockImplementation(async (path, options) => {
      if (path === '/api/chat/conversations?checkId=check-2') return { conversations: [root] };
      if (path === '/api/chat/conversations/root-conversation?checkId=check-2') {
        return { conversation: root };
      }
      if (path === '/api/chat/conversations/root-conversation/branches' && options?.method === 'POST') {
        const branch = branches[branchRequestCount];
        branchRequestCount += 1;
        return { conversation: branch };
      }
      throw new Error(`Unexpected request: ${path}`);
    });

    const { container } = render(
      <HealthAssistant
        active
        aiConfigured
        check={check}
        seed={null}
        onAiConfigurationError={vi.fn()}
        onToast={vi.fn()}
      />
    );
    const rootButton = await screen.findByRole('button', {
      name: 'Main conversation: Headache follow-up'
    });

    for (let branchNumber = 1; branchNumber <= 2; branchNumber += 1) {
      await user.click(rootButton);
      await user.click(await screen.findByRole('button', { name: 'Branch to new chat from this response' }));
      expect(
        await screen.findByRole('button', {
          name: `Branch: Headache follow-up · Branch ${branchNumber}`
        })
      ).toBeInTheDocument();
    }

    expect(container.querySelectorAll('.chat-branch-list .chat-history-item.branch')).toHaveLength(2);
    await user.click(rootButton);
    expect(
      await screen.findByRole('button', { name: 'Branch limit reached for this conversation' })
    ).toBeDisabled();
    const branchRequests = api.mock.calls.filter(([path]) => path.endsWith('/branches'));
    expect(JSON.parse(branchRequests[0][1].body)).toEqual({
      sourceMessageId: 'root-response',
      checkId: check.id
    });
  });
});
