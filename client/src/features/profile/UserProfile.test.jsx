import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client.js';
import UserProfile from './UserProfile.jsx';

vi.mock('../../api/client.js', () => ({ api: vi.fn() }));

describe('guest profile', () => {
  beforeEach(() => api.mockReset());

  it('shows and saves the required guest occupation', async () => {
    const user = userEvent.setup();
    const guest = {
      id: 'guest-1',
      accountType: 'guest',
      name: 'Guest Tester',
      email: '',
      age: 29,
      occupation: 'Student',
      bloodType: '',
      allergies: ''
    };
    api.mockResolvedValue({ user: { ...guest, occupation: 'UX researcher' } });
    const onUserUpdated = vi.fn();

    render(
      <UserProfile
        active
        user={guest}
        checkCount={0}
        onUserUpdated={onUserUpdated}
        onSignOut={vi.fn()}
        onToast={vi.fn()}
      />
    );

    expect(screen.getByText('Guest testing account')).toBeInTheDocument();
    expect(screen.getByLabelText('Age')).toBeRequired();
    const occupation = screen.getByLabelText('Occupation');
    expect(occupation).toHaveValue('Student');
    await user.clear(occupation);
    await user.type(occupation, 'UX researcher');
    await user.click(screen.getByRole('button', { name: 'Save Profile' }));

    await waitFor(() => expect(onUserUpdated).toHaveBeenCalled());
    const requestBody = JSON.parse(api.mock.calls[0][1].body);
    expect(requestBody.occupation).toBe('UX researcher');
  });
});
