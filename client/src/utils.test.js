import { describe, expect, it } from 'vitest';
import { historyTitle, initials } from './utils.js';

describe('client display utilities', () => {
  it('creates concise account initials', () => {
    expect(initials('Nafiz Abdullah')).toBe('NA');
    expect(initials('')).toBe('?');
  });

  it('uses the first symptom line for a saved-check title', () => {
    expect(historyTitle({ symptoms: 'Headache since yesterday\nWorse at night' })).toBe(
      'Headache since yesterday'
    );
    expect(historyTitle({ symptoms: '', tags: ['Fever', 'Stress'] })).toBe('Fever, Stress');
  });
});
