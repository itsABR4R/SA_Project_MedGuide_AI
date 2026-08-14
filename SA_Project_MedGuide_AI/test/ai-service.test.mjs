import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiService } from '../src/services/ai.service.mjs';

const analysis = {
  summary: 'A cautious summary.',
  urgent: false,
  urgentMessage: '',
  conditions: [
    {
      name: 'Primary pattern',
      matchLevel: 'strong',
      urgency: 'routine',
      matchedSymptoms: ['headache'],
      simpleExplanation: 'This is the closest informational pattern.',
      detailedExplanation: 'This pattern overlaps most closely with the supplied details, while remaining uncertain.',
      sourceIds: ['medline-symptoms']
    },
    {
      name: 'Secondary pattern',
      matchLevel: 'strong',
      urgency: 'routine',
      matchedSymptoms: ['headache'],
      simpleExplanation: 'This is a weaker possible pattern.',
      detailedExplanation: 'This alternative has less supporting detail than the primary pattern.',
      sourceIds: ['medline-symptoms']
    },
    {
      name: 'Limited pattern',
      matchLevel: 'limited',
      urgency: 'routine',
      matchedSymptoms: ['headache'],
      simpleExplanation: 'This pattern has limited overlap.',
      detailedExplanation: 'This alternative is included for comparison with clear uncertainty.',
      sourceIds: ['medline-symptoms']
    }
  ],
  selfCare: ['Rest and monitor changes.'],
  seeClinician: ['Seek care if symptoms worsen.'],
  sourceIds: ['medline-symptoms']
};

test('OpenRouter service sends strict structured output and privacy preferences', async () => {
  let captured;
  const fetchImpl = async (_url, options) => {
    captured = { headers: options.headers, body: JSON.parse(options.body) };
    return {
      ok: true,
      status: 200,
      async json() {
        return { choices: [{ message: { content: JSON.stringify(analysis) }, finish_reason: 'stop' }] };
      }
    };
  };
  const config = {
    openRouter: {
      apiKey: 'test-key',
      apiUrl: 'https://example.test/chat/completions',
      model: 'test/model',
      appUrl: 'http://localhost:3000',
      appName: 'MedGuide AI Test',
      dataCollection: 'deny',
      zeroDataRetention: true,
      timeoutMs: 1000
    }
  };
  const service = createAiService({ config, fetchImpl });
  const result = await service.analyze({ age: 30, bloodType: '', allergies: '' }, {
    symptoms: 'A mild headache since yesterday',
    severity: 'mild',
    tags: ['Headache']
  });

  assert.equal(result.summary, analysis.summary);
  assert.equal(result.conditions.length, 3);
  assert.ok(result.conditions.slice(1).every((condition) => condition.matchLevel !== 'strong'));
  assert.equal(captured.headers.Authorization, 'Bearer test-key');
  assert.equal(captured.body.response_format.type, 'json_schema');
  assert.equal(captured.body.response_format.json_schema.strict, true);
  assert.equal(captured.body.response_format.json_schema.schema.properties.conditions.minItems, 3);
  assert.equal(captured.body.response_format.json_schema.schema.properties.conditions.maxItems, 4);
  assert.deepEqual(captured.body.provider, { require_parameters: true, data_collection: 'deny', zdr: true });
  assert.deepEqual(captured.body.plugins, [{ id: 'response-healing' }]);
});

test('OpenRouter service rejects an incomplete one-pattern response', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        choices: [{
          message: { content: JSON.stringify({ ...analysis, conditions: analysis.conditions.slice(0, 1) }) },
          finish_reason: 'stop'
        }]
      };
    }
  });
  const service = createAiService({
    fetchImpl,
    config: {
      openRouter: {
        apiKey: 'test-key',
        apiUrl: 'https://example.test/chat/completions',
        model: 'test/model',
        appUrl: 'http://localhost:3000',
        appName: 'MedGuide AI Test',
        dataCollection: 'deny',
        zeroDataRetention: true,
        timeoutMs: 1000
      }
    }
  });

  await assert.rejects(
    service.analyze({ age: 30, bloodType: '', allergies: '' }, {
      symptoms: 'A mild headache since yesterday',
      severity: 'mild',
      tags: ['Headache']
    }),
    (error) => error.code === 'AI_INCOMPLETE_RESPONSE'
  );
});
