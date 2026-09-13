import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CheckHistory from './CheckHistory.jsx';

describe('check history chat navigation', () => {
  it('opens chats for one check separately from general and legacy conversations', async () => {
    const user = userEvent.setup();
    const check = {
      id: 'check-1',
      createdAt: '2026-09-11T00:00:00.000Z',
      symptoms: 'Headache since morning',
      severity: 'mild',
      tags: []
    };
    const onOpen = vi.fn();
    const onOpenChats = vi.fn();
    const onOpenOtherChats = vi.fn();
    const onDelete = vi.fn();

    render(
      <CheckHistory
        active
        checks={[check]}
        onOpen={onOpen}
        onOpenChats={onOpenChats}
        onOpenOtherChats={onOpenOtherChats}
        onDelete={onDelete}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Open chats' }));
    expect(onOpenChats).toHaveBeenCalledWith(check);
    expect(onOpen).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Open other saved chats' }));
    expect(onOpenOtherChats).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(check);
  });
});
