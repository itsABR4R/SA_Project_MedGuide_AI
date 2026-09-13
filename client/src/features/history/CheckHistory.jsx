import { formatCheckDate, historyTitle } from '../../utils.js';
import { useI18n } from '../../i18n/context.js';

export default function CheckHistory({ active, checks, onOpen, onOpenChats, onOpenOtherChats, onDelete }) {
  const { locale, t } = useI18n();

  return (
    <div className={`tab${active ? ' active' : ''}`} id="tab-history">
      <div className="card">
        <div className="ttl">{t('Your Check History')}</div>
        <div className="sub">
          {t('Open or remove symptom checks saved securely to your account on this server.')}
        </div>
      </div>
      <div className="history-list" id="history-list">
        {checks.length === 0 ? (
          <div className="empty-state">
            <h3>{t('No saved checks yet')}</h3>
            <p>{t('Complete a symptom check and it will be saved to your account here.')}</p>
          </div>
        ) : (
          checks.map((check) => (
            <article className="history-card" key={check.id}>
              <div>
                <div className="history-date">{formatCheckDate(check.createdAt, locale)}</div>
                <div className="history-title">{historyTitle(check, t('Symptom check'))}</div>
                <div className="history-meta">
                  <span className="chip">{t(check.severity[0].toUpperCase() + check.severity.slice(1))}</span>
                  {(check.tags || []).slice(0, 4).map((tag) => (
                    <span className="chip" key={tag}>
                      {t(tag)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="history-actions">
                <button className="btn-small" type="button" onClick={() => onOpen(check)}>
                  {t('Open report')}
                </button>
                <button className="btn-small" type="button" onClick={() => onOpenChats(check)}>
                  {t('Open chats')}
                </button>
                <button className="btn-small danger" type="button" onClick={() => onDelete(check)}>
                  {t('Delete')}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
      <div className="card">
        <div className="lbl">{t('Other saved conversations')}</div>
        <p className="sub">{t('General chats and older conversations without a linked symptom report.')}</p>
        <button className="btn-small" type="button" onClick={onOpenOtherChats}>
          {t('Open other saved chats')}
        </button>
      </div>
    </div>
  );
}
