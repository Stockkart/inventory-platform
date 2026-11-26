import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MarkReasonModal, type MarkReasonModalProps } from './MarkReasonModal';

function renderModal(over: Partial<MarkReasonModalProps> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <MarkReasonModal
      open
      employeeNames={['Asha']}
      onClose={onClose}
      onConfirm={onConfirm}
      {...over}
    />,
  );
  return { onConfirm, onClose };
}

const saveButton = () => screen.getByRole('button', { name: 'Save' });

describe('MarkReasonModal (R7.2–R7.4)', () => {
  it('lists exactly the five quick picks in order and names who it is for', () => {
    renderModal({ employeeNames: ['Asha', 'Ravi', 'Meena'] });
    expect(screen.getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual([
      'Forgot phone',
      'Phone not working',
      'No network',
      'Biometric not working',
      'Other',
    ]);
    expect(screen.getByText(/Asha, Ravi and 1 other use the Attendance app/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('keeps Save disabled until a quick pick is chosen, then sends it without text', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();
    expect(saveButton()).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: 'Forgot phone' }));
    expect(saveButton()).toBeEnabled();
    await user.click(saveButton());
    expect(onConfirm).toHaveBeenCalledWith({ reason: 'FORGOT_PHONE', reasonText: null });
  });

  it('"Other" needs text: empty and whitespace-only are refused, 200 characters pass', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();

    await user.click(screen.getByRole('radio', { name: 'Other' }));
    const text = screen.getByRole('textbox', { name: /Reason/ });
    expect(saveButton()).toBeDisabled();

    await user.type(text, '   ');
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText('Please say why in a few words')).toBeInTheDocument();

    await user.clear(text);
    await user.paste('x'.repeat(200));
    expect(saveButton()).toBeEnabled();
    await user.click(saveButton());
    expect(onConfirm).toHaveBeenCalledWith({ reason: 'OTHER', reasonText: 'x'.repeat(200) });
  });

  it('refuses 201 characters and trims the text it sends', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();

    await user.click(screen.getByRole('radio', { name: 'Other' }));
    const text = screen.getByRole('textbox', { name: /Reason/ });
    await user.click(text);
    await user.paste('x'.repeat(201));
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText('A reason may have at most 200 characters')).toBeInTheDocument();

    await user.clear(text);
    await user.paste('  phone fell in water  ');
    await user.click(saveButton());
    expect(onConfirm).toHaveBeenCalledWith({ reason: 'OTHER', reasonText: 'phone fell in water' });
  });

  it('Cancel closes without confirming', async () => {
    const user = userEvent.setup();
    const { onConfirm, onClose } = renderModal();
    await user.click(screen.getByRole('radio', { name: 'No network' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows the caller’s save label and blocks the buttons while saving', () => {
    renderModal({ saveLabel: 'Save 2 changes', saving: true });
    expect(screen.getByRole('button', { name: /Save 2 changes/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
