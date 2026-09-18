import { useCallback, useEffect } from 'react';
import { MicrophoneIcon, StopIcon } from './Icons.jsx';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js';
import { useI18n } from '../i18n/context.js';

export default function VoiceInputButton({
  value,
  onChange,
  onError,
  maxLength,
  disabled = false,
  context = 'text'
}) {
  const { language, t } = useI18n();
  const localizedError = useCallback((message) => onError?.(t(message)), [onError, t]);
  const { listening, supported, stop, toggle } = useSpeechRecognition({
    value,
    onChange,
    onError: localizedError,
    maxLength,
    language
  });
  const action = listening ? t('Stop voice typing') : t('Type {context} by voice', { context: t(context) });

  useEffect(() => {
    if (disabled && listening) stop();
  }, [disabled, listening, stop]);

  return (
    <button
      className={`voice-input-button${listening ? ' listening' : ''}${!supported ? ' unsupported' : ''}`}
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={action}
      aria-pressed={listening}
      title={supported ? action : t('Voice typing is not supported by this browser')}
    >
      {listening ? <StopIcon /> : <MicrophoneIcon />}
      <span>{listening ? t('Listening…') : t('Voice type')}</span>
    </button>
  );
}
