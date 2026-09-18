import { AppError } from '../utils/app-error.js';
import { cleanMultiline, cleanText } from '../utils/text.js';
import { logger as defaultLogger } from '../config/logger.js';
import { languageInstruction, normalizeLanguage } from '../utils/language.js';
import {
  ANALYSIS_INSTRUCTIONS,
  ANALYSIS_SCHEMA,
  CHAT_INSTRUCTIONS,
  SOURCE_CATALOG,
  detectEmergency,
  deterministicTestAnalysis,
  emergencyAnalysis,
  normalizeAnalysis
} from '../constants/health.js';

function responseText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => (typeof part === 'string' ? part : part?.text || '')).join('');
}

function throwProviderError(status) {
  if (status === 401 || status === 403) {
    throw new AppError(
      503,
      'AI_CONFIGURATION_ERROR',
      'OpenRouter rejected the API key. Check OPENROUTER_API_KEY in your .env file.'
    );
  }
  if (status === 402) {
    throw new AppError(
      503,
      'AI_CREDITS_REQUIRED',
      'OpenRouter has insufficient credits for the configured model.'
    );
  }
  if (status === 404) {
    throw new AppError(
      503,
      'AI_ROUTE_UNAVAILABLE',
      'No compatible OpenRouter route is currently available for the model and privacy settings.'
    );
  }
  if (status === 429) {
    throw new AppError(
      429,
      'AI_RATE_LIMIT',
      'OpenRouter is temporarily rate-limited. Wait a moment and try again.'
    );
  }
  if (status === 400) {
    throw new AppError(
      502,
      'AI_REQUEST_REJECTED',
      'OpenRouter rejected the model request. Check OPENROUTER_MODEL in your .env file.'
    );
  }
  throw new AppError(502, 'AI_SERVICE_ERROR', 'OpenRouter could not complete the request. Please try again.');
}

function conversation(history, message, language) {
  const messages = [];
  const append = (role, content) => {
    if (!content) return;
    const previous = messages.at(-1);
    if (previous?.role === role) previous.content += `\n\n${content}`;
    else messages.push({ role, content });
  };

  for (const entry of history.slice(-10)) {
    append(entry.role === 'assistant' ? 'assistant' : 'user', cleanMultiline(entry.content, 1600));
  }
  if (messages[0]?.role === 'assistant') {
    messages.unshift({
      role: 'user',
      content:
        normalizeLanguage(language) === 'bn'
          ? 'অ্যাপ্লিকেশন দেওয়া নিচের ভূমিকাটি প্রেক্ষাপট হিসেবে ব্যবহার করুন।'
          : 'Use the following application-provided introduction as context.'
    });
  }
  append('user', cleanMultiline(message, 2400));
  return messages;
}

export function createAiService({
  config,
  fetchImpl = globalThis.fetch,
  logger = defaultLogger,
  testMode = false
}) {
  const providerConfig = config.openRouter;

  async function request({ messages, maxTokens, temperature, responseFormat }) {
    if (!providerConfig.apiKey) {
      throw new AppError(
        503,
        'AI_NOT_CONFIGURED',
        'Add OPENROUTER_API_KEY to the server environment before using AI features.'
      );
    }

    const body = {
      model: providerConfig.model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
      provider: {
        require_parameters: Boolean(responseFormat),
        data_collection: providerConfig.dataCollection,
        ...(providerConfig.zeroDataRetention ? { zdr: true } : {})
      },
      ...(responseFormat
        ? {
            response_format: responseFormat,
            plugins: [{ id: 'response-healing' }]
          }
        : {})
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), providerConfig.timeoutMs);
    let response;
    let data;
    try {
      response = await fetchImpl(providerConfig.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${providerConfig.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': cleanText(providerConfig.appUrl, 300),
          'X-OpenRouter-Title': cleanText(providerConfig.appName, 120)
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      data = await response.json().catch(() => null);
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new AppError(504, 'AI_TIMEOUT', 'OpenRouter took too long to respond. Please try again.');
      }
      logger.error('OpenRouter network request failed.', { error });
      throw new AppError(
        502,
        'AI_SERVICE_ERROR',
        'The app could not reach OpenRouter. Check the network connection and try again.'
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok || data?.error) throwProviderError(Number(data?.error?.code || response.status || 502));
    const choice = data?.choices?.[0];
    if (choice?.error || choice?.finish_reason === 'error')
      throwProviderError(Number(choice?.error?.code || 502));
    if (choice?.finish_reason === 'length') {
      throw new AppError(
        502,
        'AI_TRUNCATED_RESPONSE',
        'The AI response was cut off. Please shorten the request and try again.'
      );
    }

    const text = cleanMultiline(responseText(choice?.message?.content), 12_000);
    if (!text)
      throw new AppError(502, 'AI_EMPTY_RESPONSE', 'OpenRouter did not return a response. Please try again.');
    return text;
  }

  return {
    provider: 'openrouter',
    model: providerConfig.model,
    privacy: {
      dataCollection: providerConfig.dataCollection,
      zeroDataRetention: providerConfig.zeroDataRetention
    },
    isConfigured() {
      return Boolean(providerConfig.apiKey);
    },

    async analyze(user, payload) {
      const language = normalizeLanguage(payload.language);
      if (detectEmergency(`${payload.symptoms} ${payload.tags.join(' ')}`)) {
        return emergencyAnalysis(language);
      }
      if (testMode) return deterministicTestAnalysis(payload, language);

      const text = await request({
        messages: [
          {
            role: 'system',
            content: `${ANALYSIS_INSTRUCTIONS}\nLanguage requirement:\n${languageInstruction(language)}`
          },
          {
            role: 'user',
            content: JSON.stringify({
              symptomReport: payload.symptoms,
              selectedSeverity: payload.severity,
              quickTags: payload.tags,
              profile: {
                age: user.age ?? 'not provided',
                bloodType: user.bloodType || 'not provided',
                allergies: user.allergies || 'not provided'
              },
              allowedSourceCatalog: SOURCE_CATALOG
            })
          }
        ],
        maxTokens: 2800,
        temperature: 0.2,
        responseFormat: {
          type: 'json_schema',
          json_schema: { name: 'health_guidance', strict: true, schema: ANALYSIS_SCHEMA }
        }
      });

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new AppError(
          502,
          'AI_INVALID_RESPONSE',
          'The AI response could not be processed safely. Please try again.'
        );
      }
      const analysis = normalizeAnalysis(parsed, language);
      if (analysis.conditions.length < 3) {
        throw new AppError(
          502,
          'AI_INCOMPLETE_RESPONSE',
          'The AI did not return enough distinct patterns. Add a little more symptom detail and try again.'
        );
      }
      return analysis;
    },

    async chat(user, payload, selectedCheck) {
      const language = normalizeLanguage(payload.language);
      if (detectEmergency(payload.message)) return emergencyAnalysis(language).urgentMessage;
      if (testMode) {
        return language === 'bn'
          ? 'আমি সাধারণ তথ্য দিতে পারি, তবে রোগ নির্ণয় করতে পারি না। সবচেয়ে সম্প্রতি কী পরিবর্তন হয়েছে?'
          : 'I can give general information, but I cannot diagnose you. What changed most recently?';
      }

      const context = {
        profile: { age: user.age ?? 'not provided', allergies: user.allergies || 'not provided' },
        conversationContext: payload.contextSummary || null,
        selectedCheck: selectedCheck
          ? {
              symptoms: selectedCheck.symptoms,
              severity: selectedCheck.severity,
              summary: selectedCheck.analysis.summary
            }
          : null
      };

      return request({
        messages: [
          {
            role: 'system',
            content: `${CHAT_INSTRUCTIONS}\nLanguage requirement:\n${languageInstruction(language)}\nContext supplied by the application:\n${JSON.stringify(context)}`
          },
          ...conversation(payload.history, payload.message, language)
        ],
        maxTokens: 500,
        temperature: 0.35
      });
    }
  };
}
