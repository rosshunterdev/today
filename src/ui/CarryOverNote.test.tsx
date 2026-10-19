// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CarryOverNote } from './CarryOverNote';

const items = [
  { id: 'a', text: 'assignment' },
  { id: 'b', text: 'run 3x' },
];

describe('CarryOverNote', () => {
  it('brings all items in one tap', async () => {
    const onBring = vi.fn();
    render(<CarryOverNote label="Last week" items={items} onBring={onBring} onDismiss={() => {}} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Bring all' }));
    expect(onBring).toHaveBeenCalledWith(['a', 'b']);
  });

  it('uses fromLabel inside the picker', async () => {
    const onBring = vi.fn();
    const user = userEvent.setup();
    render(<CarryOverNote label="Last week" fromLabel="last week" items={items} onBring={onBring} onDismiss={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Last week: 2 left' }));
    expect(screen.getByText('Bring over from last week:')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'run 3x' }));
    await user.click(screen.getByRole('button', { name: 'Bring over' }));
    expect(onBring).toHaveBeenCalledWith(['b']);
  });
});
