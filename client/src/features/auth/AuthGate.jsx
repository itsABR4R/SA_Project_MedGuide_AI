import { useRef, useState } from 'react';
import { api } from '../../api/client.js';
import LanguageToggle from '../../components/LanguageToggle.jsx';
import { PulseIcon } from '../../components/Icons.jsx';
import { useI18n } from '../../i18n/context.js';

export default function AuthGate({ initialError = '', onAuthenticated, onToast }) {
  const { t } = useI18n();
  const [mode, setMode] = useState('login');
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const loginEmailRef = useRef(null);
  const registerNameRef = useRef(null);
  const guestNameRef = useRef(null);

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
    const focusRef = {
      login: loginEmailRef,
      register: registerNameRef,
      guest: guestNameRef
    }[nextMode];
    window.setTimeout(() => focusRef.current?.focus(), 0);
  }

  async function submit(event, endpoint) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      let body;
      if (endpoint === '/api/login') {
        body = { email: data.get('email'), password: data.get('password') };
      } else if (endpoint === '/api/guest-register') {
        body = { name: data.get('name'), age: data.get('age'), occupation: data.get('occupation') };
      } else {
        body = { name: data.get('name'), email: data.get('email'), password: data.get('password') };
      }
      const [payload, health] = await Promise.all([
        api(endpoint, { method: 'POST', body: JSON.stringify(body) }),
        api('/api/health')
      ]);
      form.reset();
      onAuthenticated(payload.user, health.aiConfigured);
      if (endpoint === '/api/register') onToast(t('Account created.'));
      if (endpoint === '/api/guest-register') onToast(t('Guest account created.'));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const login = mode === 'login';
  const register = mode === 'register';
  const guest = mode === 'guest';
  return (
    <section className="auth-gate" id="auth-gate" aria-label={t('Account access')}>
      <div className="auth-shell">
        <LanguageToggle className="auth-language-toggle" />
        <div className="auth-brand">
          <div className="brand-icon">
            <PulseIcon />
          </div>
          <div>
            <div className="auth-title">MedGuide AI</div>
            <div className="brand-sub">{t('Private MVP')}</div>
          </div>
        </div>
        <p className="auth-copy">
          {t(
            'Sign in to keep your profile and symptom checks attached to your account. This tool gives informational guidance, not a diagnosis.'
          )}
        </p>
        <div className="auth-tabs" role="tablist" aria-label={t('Account access options')}>
          <button
            className={`auth-tab${login ? ' active' : ''}`}
            id="login-tab"
            type="button"
            role="tab"
            aria-selected={login}
            onClick={() => switchMode('login')}
          >
            {t('Sign In')}
          </button>
          <button
            className={`auth-tab${register ? ' active' : ''}`}
            id="register-tab"
            type="button"
            role="tab"
            aria-selected={register}
            onClick={() => switchMode('register')}
          >
            {t('Create Account')}
          </button>
          <button
            className={`auth-tab${guest ? ' active' : ''}`}
            id="guest-register-tab"
            type="button"
            role="tab"
            aria-selected={guest}
            onClick={() => switchMode('guest')}
          >
            {t('Sign Up as a Guest')}
          </button>
        </div>

        <form
          className={`auth-form${login ? ' active' : ''}`}
          id="login-form"
          onSubmit={(event) => submit(event, '/api/login')}
        >
          <div className={`form-error${login && error ? ' show' : ''}`} id="login-error" role="alert">
            {login ? error : ''}
          </div>
          <div className="field">
            <label htmlFor="login-email">{t('Email')}</label>
            <input
              ref={loginEmailRef}
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength="180"
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">{t('Password')}</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength="200"
            />
          </div>
          <button className="btn-p" type="submit" disabled={busy}>
            {busy && login ? t('Signing In…') : t('Sign In')}
          </button>
        </form>

        <form
          className={`auth-form${register ? ' active' : ''}`}
          id="register-form"
          onSubmit={(event) => submit(event, '/api/register')}
        >
          <div className={`form-error${register && error ? ' show' : ''}`} id="register-error" role="alert">
            {register ? error : ''}
          </div>
          <div className="field">
            <label htmlFor="register-name">{t('Name')}</label>
            <input
              ref={registerNameRef}
              id="register-name"
              name="name"
              autoComplete="name"
              required
              maxLength="80"
            />
          </div>
          <div className="field">
            <label htmlFor="register-email">{t('Email')}</label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength="180"
            />
          </div>
          <div className="field">
            <label htmlFor="register-password">{t('Password')}</label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength="8"
              maxLength="200"
            />
          </div>
          <button className="btn-p" type="submit" disabled={busy}>
            {busy && register ? t('Creating Account…') : t('Create Account')}
          </button>
        </form>

        <form
          className={`auth-form${guest ? ' active' : ''}`}
          id="guest-register-form"
          onSubmit={(event) => submit(event, '/api/guest-register')}
        >
          <div
            className={`form-error${guest && error ? ' show' : ''}`}
            id="guest-register-error"
            role="alert"
          >
            {guest ? error : ''}
          </div>
          <div className="field">
            <label htmlFor="guest-name">{t('Name')}</label>
            <input
              ref={guestNameRef}
              id="guest-name"
              name="name"
              autoComplete="name"
              required
              maxLength="80"
            />
          </div>
          <div className="field">
            <label htmlFor="guest-age">{t('Age')}</label>
            <input id="guest-age" name="age" type="number" min="13" max="120" required />
          </div>
          <div className="field">
            <label htmlFor="guest-occupation">{t('Occupation')}</label>
            <input
              id="guest-occupation"
              name="occupation"
              autoComplete="organization-title"
              required
              maxLength="120"
            />
          </div>
          <button className="btn-p" type="submit" disabled={busy}>
            {busy && guest ? t('Creating Guest Account…') : t('Sign Up as a Guest')}
          </button>
        </form>
        <p className="account-note">
          {guest
            ? t(
                'No email or password is required. Your guest profile, session, symptom checks, and chats are saved for user testing.'
              )
            : t(
                'Use test details for this MVP. Passwords are hashed; sessions use secure HTTP-only cookies.'
              )}
        </p>
      </div>
    </section>
  );
}
