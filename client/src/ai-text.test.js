import { describe, expect, it } from 'vitest';
import { cleanAiText } from './ai-text.js';

describe('AI response presentation', () => {
  it('cleans the Bangla bold-list response while preserving its wording and paragraphs', () => {
    expect(
      cleanAiText(
        'পরামর্শ:\n\n*   **বিশ্রাম নিন:** পর্যাপ্ত বিশ্রাম নিন।\n* **পানি পান করুন:** পানি পান করুন।\n\nআর কিছু?'
      )
    ).toBe('পরামর্শ:\n\n• বিশ্রাম নিন: পর্যাপ্ত বিশ্রাম নিন।\n• পানি পান করুন: পানি পান করুন।\n\nআর কিছু?');
  });

  it('keeps quantities, signs, underscores inside words, and numbered steps intact', () => {
    const text =
      '1. Temperature: 38.5°C; change: -2.5.\n2. Calculate 2 * 3, 2*3*4, 2**3; blood_pressure, 70–89%, ½ cup.';
    expect(cleanAiText(text)).toBe(text);
  });

  it('removes common heading and emphasis markers without discarding source URLs', () => {
    expect(
      cleanAiText(
        '## Next steps\n\n**Rest** and _monitor_.\n\n- Read [NHS](https://www.nhs.uk/)\n- Record `temperature`.'
      )
    ).toBe('Next steps\n\nRest and monitor.\n\n• Read NHS (https://www.nhs.uk/)\n• Record temperature.');
  });
});
