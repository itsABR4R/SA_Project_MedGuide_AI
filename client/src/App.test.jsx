import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('application boot', () => {
  it('restores the account and opens the one-time tour for an unfinished user', async () => {
    const user = {
      id: 'user-1',
      name: 'Nafiz Abdullah',
      email: 'nafiz@example.test',
      age: null,
      bloodType: '',
      allergies: '',
      onboardingCompleted: false
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path) => {
        if (path === '/api/me') return jsonResponse({ user, aiConfigured: true, checkCount: 0 });
        if (path === '/api/checks') return jsonResponse({ checks: [] });
        throw new Error(`Unexpected request: ${path}`);
      })
    );

    render(<App />);

    expect(await screen.findByText('Nafiz Abdullah', { selector: '#mini-user-name' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Welcome to MedGuide AI' })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/me', expect.any(Object));
    expect(fetch).toHaveBeenCalledWith('/api/checks', expect.any(Object));
  });

  it('fully replaces an opened report when starting another symptom check', async () => {
    const userEventDriver = userEvent.setup();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const user = {
      id: 'user-2',
      name: 'Test User',
      email: 'test@example.test',
      age: null,
      bloodType: '',
      allergies: '',
      onboardingCompleted: true
    };
    const check = {
      id: 'check-1',
      symptoms: 'Headache since this morning',
      severity: 'mild',
      tags: ['Headache'],
      createdAt: '2026-09-11T10:00:00.000Z',
      sources: [],
      analysis: {
        summary: 'An informational summary.',
        urgent: false,
        urgentMessage: '',
        selfCare: ['Rest.'],
        seeClinician: ['Seek help if it worsens.'],
        conditions: []
      }
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path) => {
        if (path === '/api/me') return jsonResponse({ user, aiConfigured: true, checkCount: 1 });
        if (path === '/api/checks') return jsonResponse({ checks: [check] });
        throw new Error(`Unexpected request: ${path}`);
      })
    );

    render(<App />);
    await screen.findByText('Test User', { selector: '#mini-user-name' });
    await userEventDriver.click(screen.getByRole('button', { name: 'Check History' }));
    await userEventDriver.click(await screen.findByRole('button', { name: 'Open report' }));
    expect(await screen.findByText('Possible Conditions')).toBeInTheDocument();

    await userEventDriver.click(screen.getByRole('button', { name: 'Check another symptom' }));

    await waitFor(() => expect(screen.queryByText('Possible Conditions')).not.toBeInTheDocument());
    expect(document.querySelector('#v-res')).not.toBeInTheDocument();
    expect(document.querySelectorAll('#v-input')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Analyze Symptoms Now' })).toBeInTheDocument();
  });
});
