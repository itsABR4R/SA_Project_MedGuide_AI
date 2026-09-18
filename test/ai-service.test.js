import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiService } from '../server/src/services/ai.service.js';

const analysis = {
  summary: 'A cautious summary.',
  urgent: false,
  urgentMessage: '',
  conditions: [
    {
      name: 'Primary pattern',
      matchLevel: 'strong',
      matchPercentage: 86,
      urgency: 'routine',
      matchedSymptoms: ['headache'],
      simpleExplanationPoints: [
        'This is the closest informational pattern.',
        'The headache supports the comparison.',
        'Important clinical details remain unknown.'
      ],
      detailedExplanationPoints: [
        'This pattern overlaps most closely with the supplied details.',
        'The reported headache supports the comparison.',
        'Duration and examination findings remain uncertain.'
      ],
      sourceIds: ['medline-symptoms']
    },
    {
      name: 'Secondary pattern',
      matchLevel: 'strong',
      matchPercentage: 80,
      urgency: 'routine',
      matchedSymptoms: ['headache'],
      simpleExplanationPoints: [
        'This is a weaker possible pattern.',
        'Only one symptom supports it.',
        'Other expected details were not reported.'
      ],
      detailedExplanationPoints: [
        'This alternative has less supporting detail than the primary pattern.',
        'Only the headache overlaps clearly.',
        'Other expected features and examination findings are unavailable.'
      ],
      sourceIds: ['medline-symptoms']
    },
    {
      name: 'Limited pattern',
      matchLevel: 'limited',
      matchPercentage: 36,
      urgency: 'routine',
      matchedSymptoms: ['headache'],
      simpleExplanationPoints: [
        'This pattern has limited overlap.',
        'The current report offers little supporting detail.',
        'It is included only for cautious comparison.'
      ],
      detailedExplanationPoints: [
        'This alternative is included for comparison with clear uncertainty.',
        'The current report offers little supporting detail.',
        'Clinical history could substantially change this interpretation.'
      ],
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
  const result = await service.analyze(
    { age: 30, bloodType: '', allergies: '' },
    {
      symptoms: 'A mild headache since yesterday',
      severity: 'mild',
      tags: ['Headache']
    }
  );

  assert.equal(result.summary, analysis.summary);
  assert.equal(result.conditions.length, 3);
  assert.ok(result.conditions.slice(1).every((condition) => condition.matchLevel !== 'strong'));
  assert.ok(result.conditions.every((condition) => condition.simpleExplanationPoints.length >= 3));
  assert.deepEqual(
    result.conditions.map((condition) => condition.matchPercentage),
    [86, 69, 36]
  );
  assert.equal(captured.headers.Authorization, 'Bearer test-key');
  assert.equal(captured.body.response_format.type, 'json_schema');
  assert.equal(captured.body.response_format.json_schema.strict, true);
  assert.equal(captured.body.response_format.json_schema.schema.properties.conditions.minItems, 3);
  assert.equal(captured.body.response_format.json_schema.schema.properties.conditions.maxItems, 4);
  assert.ok(
    captured.body.response_format.json_schema.schema.properties.conditions.items.required.includes(
      'matchPercentage'
    )
  );
  assert.deepEqual(captured.body.provider, { require_parameters: true, data_collection: 'deny', zdr: true });
  assert.deepEqual(captured.body.plugins, [{ id: 'response-healing' }]);
});

test('OpenRouter service rejects an incomplete one-pattern response', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    async json() {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({ ...analysis, conditions: analysis.conditions.slice(0, 1) })
            },
            finish_reason: 'stop'
          }
        ]
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
    service.analyze(
      { age: 30, bloodType: '', allergies: '' },
      {
        symptoms: 'A mild headache since yesterday',
        severity: 'mild',
        tags: ['Headache']
      }
    ),
    (error) => error.code === 'AI_INCOMPLETE_RESPONSE'
  );
});

test('AI safety fallbacks and test responses honor Bangla mode', async () => {
  const service = createAiService({
    testMode: true,
    config: {
      openRouter: {
        apiKey: '',
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

  const analysisResult = await service.analyze(
    { age: 30, bloodType: '', allergies: '' },
    {
      symptoms: 'গতকাল থেকে মাথাব্যথা ও ক্লান্তি',
      severity: 'moderate',
      tags: ['Headache'],
      language: 'bn'
    }
  );
  assert.match(analysisResult.summary, /[\u0980-\u09ff]/);
  assert.match(analysisResult.conditions[0].name, /[\u0980-\u09ff]/);

  const chatResult = await service.chat(
    { age: 30, allergies: '' },
    { message: 'কী লক্ষ্য করব?', history: [], language: 'bn' },
    null
  );
  assert.match(chatResult, /রোগ নির্ণয়/);

  const emergencyResult = await service.analyze(
    { age: 30, bloodType: '', allergies: '' },
    {
      symptoms: 'আমার তীব্র বুকের ব্যথা এবং শ্বাস নিতে পারছি না',
      severity: 'severe',
      tags: [],
      language: 'bn'
    }
  );
  assert.equal(emergencyResult.urgent, true);
  assert.match(emergencyResult.urgentMessage, /জরুরি/);
});
