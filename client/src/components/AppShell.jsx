import { ChatIcon, HistoryIcon, ProfileIcon, PulseIcon } from './Icons.jsx';
import LanguageToggle from './LanguageToggle.jsx';
import { useI18n } from '../i18n/context.js';
import { initials } from '../utils.js';

const navigation = [
  { name: 'symptom', label: 'Symptom Checker', Icon: PulseIcon },
  { name: 'chat', label: 'AI Health Assistant', Icon: ChatIcon },
  { name: 'history', label: 'Check History', Icon: HistoryIcon },
  { name: 'profile', label: 'User Profile', Icon: ProfileIcon }
];

export default function AppShell({ user, activeView, onNavigate, children }) {
  const { t } = useI18n();

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-icon">
              <PulseIcon />
            </div>
            <div className="brand-text">
              <span className="brand-title">MedGuide AI</span>
            </div>
          </div>
          <LanguageToggle className="sidebar-language-toggle" />
          <nav className="bottom-nav" aria-label={t('Primary navigation')}>
            {navigation.map(({ name, label, Icon }) => (
              <button
                className={`nav-btn${activeView === name ? ' active' : ''}`}
                id={`nav-${name}`}
                type="button"
                key={name}
                aria-current={activeView === name ? 'page' : undefined}
                onClick={() => onNavigate(name)}
              >
                <Icon />
                <span>{t(label)}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <button
            className="mini-avatar mini-avatar-button"
            id="mini-avatar"
            type="button"
            onClick={() => onNavigate('profile')}
            aria-label={t('Open user profile for {name}', { name: user.name })}
            title={t('Open user profile')}
          >
            {initials(user.name)}
          </button>
          <div className="mini-user-info">
            <span className="mini-user-name" id="mini-user-name">
              {user.name}
            </span>
            <span className="mini-user-badge">
              {t(user.accountType === 'guest' ? 'Guest testing account' : 'Private account')}
            </span>
          </div>
        </div>
      </aside>
      <main className="content" id="main-content">
        {children}
      </main>
    </div>
  );
}
