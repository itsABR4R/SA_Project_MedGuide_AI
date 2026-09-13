import { useCallback, useRef, useState } from 'react';
import { api } from '../../api/client.js';
import { cleanAiText } from '../../ai-text.js';
import { AlertIcon } from '../../components/Icons.jsx';
import VoiceInputButton from '../../components/VoiceInputButton.jsx';
import { useI18n } from '../../i18n/context.js';
import DetailedExplanationModal from './DetailedExplanationModal.jsx';

const severities = ['mild', 'moderate', 'severe'];
const quickTags = ['Stress', 'Headache', 'Fever'];
const matchLabels = { strong: 'Strong pattern', possible: 'Possible pattern', limited: 'Limited pattern' };
const matchClasses = { strong: 'strong', possible: 'partial', limited: 'lowm' };
const urgencyLabels = { routine: 'Routine', soon: 'Soon', urgent: 'Urgent' };
const urgencyClasses = { routine: 'ul', soon: 'um', urgent: 'uh' };

function simpleExplanationPoints(condition) {
  const supplied = condition.simpleExplanationPoints;
  if (Array.isArray(supplied) && supplied.length) return supplied;
  const fallback = condition.simpleExplanation;
  return (String(fallback || '').match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [String(fallback || '')])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function displayedMatchPercentage(condition, index) {
  const requested = Number(condition.matchPercentage);
  if (Number.isFinite(requested) && requested >= 20 && requested <= 89) return Math.round(requested);
  const fallback = { strong: 84, possible: 62, limited: 38 }[condition.matchLevel] || 55;
  return Math.max(20, fallback - index * 3);
}

function ConditionCard({
  condition,
  index,
  open,
  onToggle,
  onSources,
  onDiscuss,
  onDetailed,
  t,
  formatNumber
}) {
  const points = simpleExplanationPoints(condition);
  const percentage = displayedMatchPercentage(condition, index);
  const displayedPercentage = formatNumber(percentage);
  const urgency = t(urgencyLabels[condition.urgency] || 'Soon');
  return (
    <div
      className={`cc ${index === 0 ? 'primary-match' : 'secondary-match'}${open ? ' open' : ''}`}
      id={`condition-${index}`}
    >
      <div
        className="ch"
        tabIndex="0"
        role="button"
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="cl">
          <div className="cn">{cleanAiText(condition.name)}</div>
          <div className={`cu ${urgencyClasses[condition.urgency] || 'um'}`}>
            {t('Follow-up: {urgency}', { urgency })}
          </div>
        </div>
        <div className="cr">
          <span
            className={`match-percentage ${matchClasses[condition.matchLevel] || 'partial'}`}
            title={t('Relative overlap with the symptoms you reported—not a diagnostic probability')}
            aria-label={t('{percentage} percent symptom-pattern match; not a diagnostic probability', {
              percentage: displayedPercentage
            })}
          >
            {t('{percentage}% match', { percentage: displayedPercentage })}
          </span>
          <span className={`badge ${matchClasses[condition.matchLevel] || 'partial'}`}>
            {t(matchLabels[condition.matchLevel] || 'Possible pattern')}
          </span>
          <span className="chev" aria-hidden="true">
            ⌄
          </span>
        </div>
      </div>
      <div className="cb">
        <div className="es">
          <div className="el">{t('Matched symptoms')}</div>
          <div className="chips">
            {(condition.matchedSymptoms?.length ? condition.matchedSymptoms : ['Reported details']).map(
              (symptom) => (
                <span className="chip" key={symptom}>
                  {cleanAiText(t(symptom))}
                </span>
              )
            )}
          </div>
        </div>
        <div className="es">
          <div className="el">{t('How the AI interpreted this pattern')}</div>
          <div className="at">
            <ul className="interpretation-list">
              {points.map((point, pointIndex) => (
                <li key={`${point}-${pointIndex}`}>{cleanAiText(point)}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="cb-btns">
          <button className="btn-src" type="button" onClick={onSources}>
            {t('Sources')}
          </button>
          <button className="btn-chat" type="button" onClick={onDiscuss}>
            {t('Discuss with AI')}
          </button>
          <button
            className="btn-detail"
            type="button"
            onClick={onDetailed}
            aria-label={t('Open detailed explanation for {name}', { name: cleanAiText(condition.name) })}
          >
            {t('Detailed')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConditionsList({ check, onSources, onDiscuss, onDetailed, t, formatNumber }) {
  const [openIndex, setOpenIndex] = useState(0);
  const conditions = check.analysis.conditions || [];

  if (!conditions.length) {
    return (
      <div className="clist" id="conditions-list">
        <div className="empty-state">
          <h3>{t('No condition pattern shown')}</h3>
          <p>
            {t(
              'The details may be insufficient, or the report may need direct medical assessment. Review the next-step guidance below.'
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="clist" id="conditions-list">
      <div className="match-score-note">
        {t(
          'Match percentages compare overlap with your reported symptoms. They are not the probability of a diagnosis.'
        )}
      </div>
      {conditions.map((condition, index) => (
        <div className="condition-entry" key={`${condition.name}-${index}`}>
          {index === 1 && (
            <div className="other-matches-heading">
              <div>
                <strong>{t('Other possible matches')}</strong>
                <span>{t('Lower matches are included for comparison and are not diagnoses.')}</span>
              </div>
              <div className="match-count">
                {t(conditions.length - 1 === 1 ? '{count} lower match' : '{count} lower matches', {
                  count: formatNumber(conditions.length - 1)
                })}
              </div>
            </div>
          )}
          <ConditionCard
            condition={condition}
            index={index}
            open={openIndex === index}
            onToggle={() => setOpenIndex((current) => (current === index ? -1 : index))}
            onSources={() => onSources(condition.sourceIds || [])}
            onDiscuss={() => onDiscuss(condition)}
            onDetailed={() =>
              onDetailed({ condition, percentage: displayedMatchPercentage(condition, index) })
            }
            t={t}
            formatNumber={formatNumber}
          />
        </div>
      ))}
    </div>
  );
}

function Tips({ items, alert = false, t }) {
  const safeItems = items?.length
    ? items
    : [t('No additional guidance was returned. Contact a clinician if you are concerned.')];
  return safeItems.map((text, index) => (
    <div className="tip-item" key={`${text}-${index}`}>
      <div className={`tip-dot${alert ? ' alert' : ''}`} />
      <div className="tip-txt">{cleanAiText(text)}</div>
    </div>
  ));
}

export default function SymptomChecker({
  active,
  aiConfigured,
  currentCheck,
  revision = 0,
  onCheckCreated,
  onStartNewCheck,
  onOpenSources,
  onDiscuss,
  onNavigate,
  onToast,
  onAiConfigurationError
}) {
  const { t, formatNumber } = useI18n();
  const scopeKey = `${currentCheck?.id || 'new'}:${revision}`;
  const [stageState, setStageState] = useState(() => ({
    scopeKey,
    value: currentCheck ? 'results' : 'input'
  }));
  const stage = stageState.scopeKey === scopeKey ? stageState.value : currentCheck ? 'results' : 'input';
  const [symptoms, setSymptoms] = useState('');
  const [severity, setSeverity] = useState('mild');
  const [tags, setTags] = useState([]);
  const [detailedCondition, setDetailedCondition] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef(null);
  const closeDetailed = useCallback(() => setDetailedCondition(null), []);

  function setStage(value) {
    setStageState({ scopeKey, value });
  }

  function checkAnotherSymptom() {
    setStage('input');
    setSymptoms('');
    setSeverity('mild');
    setTags([]);
    setInvalid(false);
    setDetailedCondition(null);
    onStartNewCheck?.();
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    window.requestAnimationFrame(() => {
      document.getElementById('sym-in')?.focus({ preventScroll: true });
    });
  }

  function toggleTag(tag) {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  }

  async function analyze() {
    const cleanSymptoms = symptoms.trim();
    if (!cleanSymptoms && tags.length === 0) {
      setInvalid(true);
      inputRef.current?.focus();
      onToast(t('Describe your symptoms or select a quick tag.'), true);
      window.setTimeout(() => setInvalid(false), 1800);
      return;
    }
    setStage('loading');
    try {
      const payload = await api('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ symptoms: cleanSymptoms, severity, tags })
      });
      await onCheckCreated(payload.check);
    } catch (error) {
      setStage('input');
      if (error.code === 'AI_NOT_CONFIGURED') onAiConfigurationError();
      onToast(error.message, true);
    }
  }

  function showSources(sourceIds) {
    const allowed = new Set(sourceIds || []);
    const sources = (currentCheck?.sources || []).filter(
      (source) => allowed.size === 0 || allowed.has(source.id)
    );
    onOpenSources(sources);
  }

  return (
    <div className={`tab${active ? ' active' : ''}`} id="tab-symptom">
      <div className="banner">
        <div className="bdot" />
        <span>
          {t(
            'This tool is for informational AI guidance only. It does not replace professional medical advice.'
          )}
        </span>
      </div>
      <div className={`setup-warning${!aiConfigured ? ' show' : ''}`} id="ai-config-warning">
        <strong>{t('One setup step remains:')}</strong>{' '}
        {t('add your private OpenRouter API key to the server environment to enable real analysis and chat.')}
      </div>

      <div className="symptom-stage" key={stage}>
        {stage === 'input' && (
          <div id="v-input" className="view-stack">
            <div className="input-desktop-grid">
              <div className="input-main-col">
                <div className="card">
                  <div className="ttl">{t('How are you feeling today?')}</div>
                  <div className="sub">{t('Describe your symptoms in detail for AI health analysis')}</div>
                </div>
                <div className="card">
                  <label className="lbl" htmlFor="sym-in">
                    {t('Describe Your Symptoms')}
                  </label>
                  <div className="voice-textarea-wrap">
                    <textarea
                      id="sym-in"
                      ref={inputRef}
                      className={invalid ? 'input-invalid' : ''}
                      value={symptoms}
                      maxLength="4000"
                      onChange={(event) => setSymptoms(event.target.value)}
                      placeholder={t(
                        'e.g. I have a persistent headache, feel fatigued, and noticed a slight fever since yesterday morning...'
                      )}
                    />
                    <VoiceInputButton
                      value={symptoms}
                      onChange={setSymptoms}
                      onError={(message) => onToast(message, true)}
                      maxLength={4000}
                      disabled={!active}
                      context="symptoms"
                    />
                  </div>
                </div>
                <button className="btn-p" id="analyze-button" type="button" onClick={analyze}>
                  {t('Analyze Symptoms Now')}
                </button>
              </div>
              <div className="input-side-col">
                <div className="card" id="severity-panel">
                  <div className="lbl">{t('Symptom Severity')}</div>
                  <div className="sev-row">
                    {severities.map((item) => (
                      <button
                        className={`sev ${item}${severity === item ? ' on' : ''}`}
                        type="button"
                        key={item}
                        onClick={() => setSeverity(item)}
                      >
                        {t(item[0].toUpperCase() + item.slice(1))}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="lbl">{t('Quick Add Tags')}</div>
                  <div className="tags">
                    {quickTags.map((tag) => (
                      <button
                        className={`tag${tags.includes(tag) ? ' on' : ''}`}
                        type="button"
                        key={tag}
                        aria-pressed={tags.includes(tag)}
                        onClick={() => toggleTag(tag)}
                      >
                        {t(tag)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="card analysis-tip">
                  <div className="lbl">{t('Analysis Tip')}</div>
                  <p>
                    {t(
                      "Include details like how long you've felt sick, what makes it better or worse, and any severity factors."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {stage === 'loading' && (
          <div className="loader on" id="v-load" role="status">
            <div className="spin" />
            <div className="loader-copy">{t('Analyzing your symptoms with AI models…')}</div>
          </div>
        )}

        {stage === 'results' && currentCheck && (
          <div id="v-res" className="view-stack">
            <div className="card">
              <div className="rh">
                <div className="flex-fill">
                  <div className="ttl">{t('Possible Conditions')}</div>
                  <div className="sub">{t('Based on your reported symptoms')}</div>
                </div>
                <div className="results-navigation">
                  <button
                    className="symptom-navigation-button primary"
                    type="button"
                    onClick={checkAnotherSymptom}
                  >
                    <span aria-hidden="true">←</span>
                    <span>{t('Check another symptom')}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="card symptom-query-card" id="symptom-query-card">
              <div className="lbl">{t('Your symptom query')}</div>
              <div className="symptom-query-text">
                {currentCheck.symptoms?.trim() ||
                  currentCheck.tags?.join(', ') ||
                  t('No written symptom query was saved.')}
              </div>
            </div>
            <div className="card">
              <div className="lbl">{t('AI Guidance Summary')}</div>
              <div className="result-summary" id="analysis-summary">
                {cleanAiText(currentCheck.analysis.summary)}
              </div>
            </div>
            {currentCheck.analysis.urgent && currentCheck.analysis.urgentMessage && (
              <div className="urgent-result show" id="urgent-result" role="alert">
                {cleanAiText(currentCheck.analysis.urgentMessage)}
              </div>
            )}
            <ConditionsList
              key={currentCheck.id}
              check={currentCheck}
              onSources={showSources}
              onDiscuss={onDiscuss}
              onDetailed={setDetailedCondition}
              t={t}
              formatNumber={formatNumber}
            />
            <button className="btn-nxt" type="button" onClick={() => setStage('steps')}>
              {t('View Action Plan & Next Steps')}
            </button>
          </div>
        )}

        {stage === 'steps' && currentCheck && (
          <div id="v-steps" className="view-stack">
            <div className="card">
              <div className="rh">
                <div className="flex-fill">
                  <div className="ttl">{t('Action Plan')}</div>
                  <div className="sub">{t('Recommended next steps & guidelines')}</div>
                </div>
                <div className="results-navigation">
                  <button
                    className="symptom-navigation-button"
                    type="button"
                    onClick={() => setStage('results')}
                  >
                    <span aria-hidden="true">←</span>
                    <span>{t('Back to results')}</span>
                  </button>
                  <button
                    className="symptom-navigation-button primary"
                    type="button"
                    onClick={checkAnotherSymptom}
                  >
                    {t('Check another symptom')}
                  </button>
                </div>
              </div>
            </div>
            <div className="steps-desktop-grid">
              <div className="card tips-card">
                <div className="tips-header">
                  <div className="lbl no-margin">{t('Home Care Tips')}</div>
                </div>
                <div className="tips-list" id="self-care-list">
                  <Tips items={currentCheck.analysis.selfCare} t={t} />
                </div>
              </div>
              <div className="card tips-card clinician-card">
                <div className="tips-header clinician-header">
                  <AlertIcon />
                  <div className="lbl no-margin danger-text">{t('When to see a doctor')}</div>
                </div>
                <div className="tips-list" id="clinician-list">
                  <Tips items={currentCheck.analysis.seeClinician} alert t={t} />
                </div>
              </div>
            </div>
            <button className="btn-p" type="button" onClick={() => onNavigate('chat')}>
              {t('Discuss Details with AI Assistant')}
            </button>
          </div>
        )}
      </div>
      <DetailedExplanationModal detail={detailedCondition} onClose={closeDetailed} />
    </div>
  );
}
