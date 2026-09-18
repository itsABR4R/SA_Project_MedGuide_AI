import { useI18n } from '../i18n/context.js';

export default function LanguageToggle({ className = '' }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={`language-toggle${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={t('Choose interface language')}
    >
      <button
        className={language === 'en' ? 'active' : ''}
        type="button"
        aria-pressed={language === 'en'}
        onClick={() => setLanguage('en')}
      >
        {t('English')}
      </button>
      <button
        className={language === 'bn' ? 'active' : ''}
        type="button"
        aria-pressed={language === 'bn'}
        onClick={() => setLanguage('bn')}
      >
        বাংলা
      </button>
    </div>
  );
}
