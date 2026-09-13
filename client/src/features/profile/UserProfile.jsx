import { useState } from 'react';
import { api } from '../../api/client.js';
import { useI18n } from '../../i18n/context.js';
import { initials } from '../../utils.js';

const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

function formValues(user) {
  return {
    name: user.name || '',
    age: user.age ?? '',
    occupation: user.occupation || '',
    bloodType: user.bloodType || '',
    allergies: user.allergies || ''
  };
}

export default function UserProfile({ active, user, checkCount, onUserUpdated, onSignOut, onToast }) {
  const { t, formatNumber } = useI18n();
  const guest = user.accountType === 'guest';
  const [form, setForm] = useState(() => formValues(user));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setStatus(t('Saving…'));
    try {
      const payload = await api('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(form)
      });
      onUserUpdated(payload.user);
      setForm(formValues(payload.user));
      setStatus(t('Saved'));
      window.setTimeout(() => setStatus(''), 1800);
    } catch (error) {
      setStatus('');
      onToast(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`tab${active ? ' active' : ''}`} id="tab-profile">
      <div className="profile-desktop-grid">
        <div className="profile-side">
          <div className="card">
            <div className="prof-avatar" id="profile-avatar">
              {initials(user.name)}
            </div>
            <div className="prof-name" id="profile-name">
              {user.name}
            </div>
            <div className="prof-email" id="profile-email">
              {guest ? t('Guest testing account') : user.email}
            </div>
          </div>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-num" id="checks-count">
                {formatNumber(checkCount)}
              </div>
              <div className="stat-lbl">{t('Checks Done')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{t('{count}d', { count: formatNumber(7) })}</div>
              <div className="stat-lbl">{t('Session')}</div>
            </div>
          </div>
          <button className="btn-logout" id="sign-out" type="button" onClick={onSignOut}>
            {t('Sign Out')}
          </button>
        </div>
        <div className="profile-main">
          <div className="card">
            <div className="lbl">{t('Personal Information')}</div>
            <form className="profile-form" id="profile-form" onSubmit={save}>
              <div className="field full">
                <label htmlFor="profile-name-input">{t('Display name')}</label>
                <input
                  id="profile-name-input"
                  name="name"
                  autoComplete="name"
                  required
                  maxLength="80"
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                />
              </div>
              {guest ? (
                <div className="field full">
                  <label htmlFor="profile-occupation">{t('Occupation')}</label>
                  <input
                    id="profile-occupation"
                    name="occupation"
                    autoComplete="organization-title"
                    required
                    maxLength="120"
                    value={form.occupation}
                    onChange={(event) => update('occupation', event.target.value)}
                  />
                </div>
              ) : null}
              <div className="field">
                <label htmlFor="profile-age">{t('Age')}</label>
                <input
                  id="profile-age"
                  name="age"
                  type="number"
                  min="13"
                  max="120"
                  placeholder={guest ? undefined : t('Optional')}
                  required={guest}
                  value={form.age}
                  onChange={(event) => update('age', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="profile-blood">{t('Blood type')}</label>
                <select
                  id="profile-blood"
                  name="bloodType"
                  value={form.bloodType}
                  onChange={(event) => update('bloodType', event.target.value)}
                >
                  <option value="">{t('Not provided')}</option>
                  {bloodTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="field full">
                <label htmlFor="profile-allergies">{t('Known allergies')}</label>
                <input
                  id="profile-allergies"
                  name="allergies"
                  maxLength="500"
                  placeholder={t('e.g. penicillin, peanuts — or leave blank')}
                  value={form.allergies}
                  onChange={(event) => update('allergies', event.target.value)}
                />
              </div>
              <div className="profile-save-row">
                <span className="save-status" id="profile-save-status" aria-live="polite">
                  {status}
                </span>
                <button className="btn-chat" type="submit" disabled={busy}>
                  {t('Save Profile')}
                </button>
              </div>
            </form>
          </div>
          <div className="card privacy-card">
            <div className="lbl">{t('Privacy note')}</div>
            <p>
              {guest
                ? t(
                    "This guest profile and all linked symptom checks, chats, and branches are stored in this app's configured MongoDB database for user testing."
                  )
                : t(
                    "Profile details and check history stay in this app's configured MongoDB database. Do not use real patient data until you have reviewed the hosting, privacy, and compliance requirements for your region."
                  )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
