import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useI18n } from './context.js';
import { I18nProvider } from './I18nProvider.jsx';

function LanguageProbe() {
  const { formatNumber, t } = useI18n();
  return (
    <>
      <span>{t('Symptom Checker')}</span>
      <span>{formatNumber(12)}</span>
    </>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = 'en';
});

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.lang = 'en';
});

it('switches the complete interface to Bangla and persists the choice', async () => {
  const user = userEvent.setup();
  const view = render(
    <I18nProvider>
      <LanguageToggle />
      <LanguageProbe />
    </I18nProvider>
  );

  expect(screen.getByText('Symptom Checker')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'বাংলা' }));

  expect(screen.getByText('উপসর্গ পরীক্ষক')).toBeInTheDocument();
  expect(screen.getByText('১২')).toBeInTheDocument();
  expect(window.localStorage.getItem('medguide.language')).toBe('bn');
  await waitFor(() => expect(document.documentElement.lang).toBe('bn'));

  view.unmount();
  render(
    <I18nProvider>
      <LanguageToggle />
      <LanguageProbe />
    </I18nProvider>
  );
  expect(screen.getByText('উপসর্গ পরীক্ষক')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'বাংলা' })).toHaveAttribute('aria-pressed', 'true');
});
