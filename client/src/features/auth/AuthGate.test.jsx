import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client.js';
import AuthGate from './AuthGate.jsx';

vi.mock('../../api/client.js', () => ({ api: vi.fn() }));

describe('account access', () => {
  beforeEach(() => {
    api.mockReset();
  });

  it('completes account creation after the asynchronous request returns', async () => {
    const user = userEvent.setup();
    const account = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      onboardingCompleted: false
    };
    api.mockImplementation(async (path) => {
      if (path === '/api/register') return { user: account };
      if (path === '/api/health') return { aiConfigured: true };
      throw new Error(`Unexpected request: ${path}`);
    });
    const onAuthenticated = vi.fn();

    render(<AuthGate onAuthenticated={onAuthenticated} onToast={vi.fn()} />);
    await user.click(screen.getByRole('tab', { name: 'Create Account' }));
    const form = within(document.getElementById('register-form'));
    await user.type(form.getByLabelText('Name'), account.name);
    await user.type(form.getByLabelText('Email'), account.email);
    await user.type(form.getByLabelText('Password'), 'correct-horse-42');
    await user.click(form.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(account, true));
    expect(screen.queryByText(/Cannot read properties of null/i)).not.toBeInTheDocument();
  });

  it('completes sign in after the asynchronous request returns', async () => {
    const user = userEvent.setup();
    const account = {
      id: 'user-2',
      name: 'Existing User',
      email: 'existing@example.com',
      onboardingCompleted: true
    };
    api.mockImplementation(async (path) => {
      if (path === '/api/login') return { user: account };
      if (path === '/api/health') return { aiConfigured: true };
      throw new Error(`Unexpected request: ${path}`);
    });
    const onAuthenticated = vi.fn();

    render(<AuthGate onAuthenticated={onAuthenticated} onToast={vi.fn()} />);
    const form = within(document.getElementById('login-form'));
    await user.type(form.getByLabelText('Email'), account.email);
    await user.type(form.getByLabelText('Password'), 'correct-horse-42');
    await user.click(form.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(account, true));
    expect(screen.queryByText(/Cannot read properties of null/i)).not.toBeInTheDocument();
  });

  it('creates a persistent guest account from name, age, and occupation only', async () => {
    const user = userEvent.setup();
    const account = {
      id: 'guest-1',
      accountType: 'guest',
      name: 'Guest Tester',
      email: '',
      age: 29,
      occupation: 'Student',
      onboardingCompleted: false
    };
    api.mockImplementation(async (path) => {
      if (path === '/api/guest-register') return { user: account };
      if (path === '/api/health') return { aiConfigured: true };
      throw new Error(`Unexpected request: ${path}`);
    });
    const onAuthenticated = vi.fn();
    const onToast = vi.fn();

    render(<AuthGate onAuthenticated={onAuthenticated} onToast={onToast} />);
    await user.click(screen.getByRole('tab', { name: 'Sign Up as a Guest' }));
    const form = within(document.getElementById('guest-register-form'));
    expect(form.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(form.queryByLabelText('Password')).not.toBeInTheDocument();
    await user.type(form.getByLabelText('Name'), account.name);
    await user.type(form.getByLabelText('Age'), String(account.age));
    await user.type(form.getByLabelText('Occupation'), account.occupation);
    await user.click(form.getByRole('button', { name: 'Sign Up as a Guest' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(account, true));
    const request = api.mock.calls.find(([path]) => path === '/api/guest-register');
    expect(JSON.parse(request[1].body)).toEqual({
      name: account.name,
      age: String(account.age),
      occupation: account.occupation
    });
    expect(onToast).toHaveBeenCalledWith('Guest account created.');
  });
});
