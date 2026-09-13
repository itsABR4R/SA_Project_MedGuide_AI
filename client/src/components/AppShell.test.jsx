import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import AppShell from './AppShell.jsx';

it('opens the profile when the account initials button is pressed', async () => {
  const user = userEvent.setup();
  const onNavigate = vi.fn();

  render(
    <AppShell user={{ name: 'Nafiz Abdullah' }} activeView="symptom" onNavigate={onNavigate}>
      <div>Content</div>
    </AppShell>
  );

  await user.click(screen.getByRole('button', { name: 'Open user profile for Nafiz Abdullah' }));
  expect(onNavigate).toHaveBeenCalledWith('profile');
});

it('clearly labels a signed-in guest testing account', () => {
  render(
    <AppShell user={{ name: 'Guest Tester', accountType: 'guest' }} activeView="symptom" onNavigate={vi.fn()}>
      <div>Content</div>
    </AppShell>
  );

  expect(screen.getByText('Guest testing account')).toBeInTheDocument();
});
