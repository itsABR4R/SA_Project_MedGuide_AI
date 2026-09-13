import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FakeSpeechRecognition,
  installSpeechRecognition,
  removeSpeechRecognition
} from '../../test/speech-recognition.js';
import SymptomChecker from './SymptomChecker.jsx';

const check = {
  id: 'check-1',
  symptoms: 'Headache and fatigue',
  severity: 'moderate',
  tags: ['Headache'],
  sources: [
    {
      id: 'source-a',
      title: 'Source A',
      url: 'https://example.test/a',
      description: 'Reviewed guidance',
      organization: 'Example Health'
    }
  ],
  analysis: {
    summary: 'A cautious informational summary.',
    urgent: false,
    urgentMessage: '',
    selfCare: ['Rest and hydrate.'],
    seeClinician: ['Seek care if symptoms worsen.'],
    conditions: [
      {
        name: 'Closest pattern',
        matchLevel: 'strong',
        matchPercentage: 84,
        urgency: 'routine',
        matchedSymptoms: ['headache'],
        simpleExplanationPoints: [
          'The headache supports this comparison.',
          'Fatigue may also overlap with the pattern.',
          'A clinical examination would provide important context.'
        ],
        detailedExplanationPoints: [
          'The headache is the clearest reported overlap.',
          'Fatigue can occur in this pattern but is not specific.',
          'Duration and examination findings remain unknown.'
        ],
        simpleExplanation: 'Closest simple explanation.',
        detailedExplanation: 'Closest detailed explanation.',
        sourceIds: ['source-a']
      },
      {
        name: 'Second pattern',
        matchLevel: 'possible',
        matchPercentage: 61,
        urgency: 'soon',
        matchedSymptoms: ['fatigue'],
        simpleExplanation: 'Second simple explanation.',
        detailedExplanation: 'Second detailed explanation.',
        sourceIds: ['source-a']
      },
      {
        name: 'Third pattern',
        matchLevel: 'limited',
        matchPercentage: 34,
        urgency: 'routine',
        matchedSymptoms: ['headache'],
        simpleExplanation: 'Third simple explanation.',
        detailedExplanation: 'Third detailed explanation.',
        sourceIds: []
      }
    ]
  }
};

function renderChecker(overrides = {}) {
  const props = {
    active: true,
    aiConfigured: true,
    currentCheck: check,
    onCheckCreated: vi.fn(),
    onStartNewCheck: vi.fn(),
    onOpenSources: vi.fn(),
    onDiscuss: vi.fn(),
    onNavigate: vi.fn(),
    onToast: vi.fn(),
    onAiConfigurationError: vi.fn(),
    ...overrides
  };
  return { props, ...render(<SymptomChecker {...props} />) };
}

describe('symptom results', () => {
  beforeEach(installSpeechRecognition);
  afterEach(() => {
    removeSpeechRecognition();
    vi.restoreAllMocks();
  });

  it('places dictated symptoms in the editable box without starting analysis', () => {
    const { props } = renderChecker({ currentCheck: null });
    fireEvent.click(screen.getByRole('button', { name: 'Type symptoms by voice' }));

    act(() => {
      FakeSpeechRecognition.instances[0].emitTranscript('I have a headache since this morning');
    });

    expect(screen.getByLabelText('Describe Your Symptoms')).toHaveValue(
      'I have a headache since this morning'
    );
    expect(props.onCheckCreated).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Analyze Symptoms Now' })).toBeInTheDocument();
  });

  it('shows one primary pattern and two lower matches', () => {
    const { container } = renderChecker();
    expect(screen.getByText('Your symptom query')).toBeInTheDocument();
    expect(screen.getByText('Headache and fatigue')).toBeInTheDocument();
    expect(screen.getByText('Closest pattern')).toBeInTheDocument();
    expect(screen.getByText('Other possible matches')).toBeInTheDocument();
    expect(screen.getByText('2 lower matches')).toBeInTheDocument();
    expect(container.querySelectorAll('.cc')).toHaveLength(3);
    expect(container.querySelectorAll('.primary-match')).toHaveLength(1);
    expect(container.querySelectorAll('.secondary-match')).toHaveLength(2);
    expect(screen.getByText('84% match')).toBeInTheDocument();
    expect(screen.getByText('61% match')).toBeInTheDocument();
    expect(screen.getByText(/not the probability of a diagnosis/i)).toBeInTheDocument();
    expect(container.querySelectorAll('.primary-match .interpretation-list li')).toHaveLength(3);
    expect(container.querySelector('#exp-simple')).not.toBeInTheDocument();
    expect(container.querySelector('#exp-detailed')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Open detailed explanation for/i })).toHaveLength(3);
  });

  it('replaces the report with one fresh symptom form and returns to the page top', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const { container, props } = renderChecker();

    fireEvent.click(screen.getByRole('button', { name: 'Check another symptom' }));

    expect(props.onStartNewCheck).toHaveBeenCalledOnce();
    expect(container.querySelector('#v-res')).not.toBeInTheDocument();
    expect(container.querySelectorAll('#v-input')).toHaveLength(1);
    expect(container.querySelectorAll('#tab-symptom')).toHaveLength(1);
    expect(container.querySelectorAll('.banner')).toHaveLength(1);
    expect(screen.queryByText('Possible Conditions')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyze Symptoms Now' })).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    await waitFor(() => expect(screen.getByLabelText('Describe Your Symptoms')).toHaveFocus());
  });

  it('opens the detailed explanation as narrative paragraphs and returns selected sources', () => {
    const { props } = renderChecker();
    const detailedButton = screen.getByRole('button', {
      name: 'Open detailed explanation for Closest pattern'
    });
    detailedButton.focus();
    fireEvent.click(detailedButton);

    const dialog = screen.getByRole('dialog', { name: 'Detailed Pattern Explanation' });
    expect(dialog).toBeInTheDocument();
    const narrative = within(dialog).getByText(/The headache is the clearest reported overlap/i);
    expect(narrative.tagName).toBe('P');
    expect(narrative).toHaveTextContent(/Duration and examination findings remain unknown/i);
    expect(within(dialog).queryByRole('list')).not.toBeInTheDocument();
    expect(within(dialog).getByText(/strong pattern range of 70–89%/i)).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Detailed Pattern Explanation' })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(detailedButton).toHaveFocus();

    fireEvent.click(screen.getAllByRole('button', { name: 'Sources' })[0]);
    expect(props.onOpenSources).toHaveBeenCalledWith([check.sources[0]]);
  });
});
