import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n/context.js';

export default function SourceModal({ sources, onClose }) {
  const { t } = useI18n();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!sources) return undefined;
    closeRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [sources, onClose]);

  if (!sources) return null;
  return (
    <div
      className="modal-overlay active react-modal-open"
      id="src-modal"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="source-modal-title">
        <div className="modal-hdr">
          <div className="modal-ttl" id="source-modal-title">
            {t('Reviewed Health Sources')}
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            ref={closeRef}
            aria-label={t('Close sources')}
          >
            ×
          </button>
        </div>
        <div className="modal-body" id="source-modal-body">
          {sources.length === 0 ? (
            <div className="empty-state">
              <h3>{t('No source selected')}</h3>
              <p>{t('The AI did not select a reviewed source for this part of the guidance.')}</p>
            </div>
          ) : (
            sources.map((source) => (
              <div className="src-item" key={source.id || source.url}>
                <a href={source.url} className="src-ttl" target="_blank" rel="noopener noreferrer">
                  {t(source.title)}
                  <span className="source-link-icon">↗</span>
                </a>
                <div className="src-desc">{t(source.description)}</div>
                <div className="src-meta">
                  <span className="src-date">{t(source.organization)}</span>
                  <span className="src-conf">{t('REVIEWED')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
