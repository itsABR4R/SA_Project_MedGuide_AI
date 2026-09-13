import { useEffect, useRef } from 'react';
import { cleanAiText } from '../../ai-text.js';
import { useI18n } from '../../i18n/context.js';

const matchLabels = {
  strong: 'Strong pattern',
  possible: 'Possible pattern',
  limited: 'Limited pattern'
};
const matchClasses = { strong: 'strong', possible: 'partial', limited: 'lowm' };
const matchRanges = { strong: '70–89%', possible: '45–69%', limited: '20–44%' };

function detailedNarrative(condition, t) {
  const points = Array.isArray(condition?.detailedExplanationPoints)
    ? condition.detailedExplanationPoints.map((point) => String(point || '').trim()).filter(Boolean)
    : [];
  if (points.length) return points.join(' ');
  if (condition?.detailedExplanation) return String(condition.detailedExplanation).trim();

  const simplePoints = Array.isArray(condition?.simpleExplanationPoints)
    ? condition.simpleExplanationPoints.map((point) => String(point || '').trim()).filter(Boolean)
    : [];
  return (
    simplePoints.join(' ') ||
    condition?.simpleExplanation ||
    t('The available report does not contain an additional detailed explanation for this pattern.')
  );
}

function symptomPhrase(condition, language, t) {
  const symptoms = (condition?.matchedSymptoms || []).map(cleanAiText).filter(Boolean);
  if (!symptoms.length) return t('the details in your symptom report');
  if (symptoms.length === 1) return symptoms[0];
  const conjunction = language === 'bn' ? 'ও' : 'and';
  if (symptoms.length === 2) return `${symptoms[0]} ${conjunction} ${symptoms[1]}`;
  return `${symptoms.slice(0, -1).join(', ')}, ${conjunction} ${symptoms.at(-1)}`;
}

export default function DetailedExplanationModal({ detail, onClose }) {
  const { language, t, formatNumber } = useI18n();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!detail) return undefined;
    const previousOverflow = document.body.style.overflow;
    const returnFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      if (returnFocus instanceof HTMLElement) returnFocus.focus();
    };
  }, [detail, onClose]);

  if (!detail) return null;
  const { condition, percentage } = detail;
  const level = ['strong', 'possible', 'limited'].includes(condition.matchLevel)
    ? condition.matchLevel
    : 'possible';
  const levelLabel = matchLabels[level];
  const displayedPercentage = formatNumber(percentage);

  return (
    <div
      className="modal-overlay active react-modal-open"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal detailed-explanation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detailed-explanation-title"
      >
        <div className="modal-hdr">
          <div className="modal-ttl" id="detailed-explanation-title">
            {t('Detailed Pattern Explanation')}
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            ref={closeRef}
            aria-label={t('Close detailed explanation')}
          >
            ×
          </button>
        </div>
        <div className="modal-body detailed-explanation-body">
          <div className="detailed-pattern-heading">
            <div>
              <div className="detailed-pattern-name">{cleanAiText(condition.name)}</div>
              <div className="detailed-pattern-subtitle">{t('Informational symptom-pattern comparison')}</div>
            </div>
            <div className="detailed-pattern-badges">
              <span className={`match-percentage ${matchClasses[level]}`}>
                {t('{percentage}% match', { percentage: displayedPercentage })}
              </span>
              <span className={`badge ${matchClasses[level]}`}>{t(levelLabel)}</span>
            </div>
          </div>

          <section className="detailed-explanation-section">
            <h3>{t('How your symptoms were interpreted')}</h3>
            <p>{cleanAiText(detailedNarrative(condition, t))}</p>
          </section>

          <section className="detailed-explanation-section">
            <h3>{t('How this result was formed')}</h3>
            <p>
              {t(
                'The analysis compared {symptoms} with the features associated with this possible pattern. The returned overlap score was {percentage}%, which places it in the {level} range of {range}. The score is kept within that range by the application so patterns can be compared consistently.',
                {
                  symptoms: symptomPhrase(condition, language, t),
                  percentage: displayedPercentage,
                  level: t(`${level} pattern`),
                  range: t(matchRanges[level])
                }
              )}
            </p>
          </section>

          <section className="detailed-explanation-section detailed-explanation-caution">
            <h3>{t('What the result does and does not mean')}</h3>
            <p>
              {t(
                'This percentage describes relative overlap with the symptoms you reported. It is not the probability of a diagnosis and cannot account for a physical examination, laboratory tests, the complete timeline, or your full medical history. A qualified healthcare professional must evaluate those details before identifying a cause.'
              )}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
