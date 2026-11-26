// Worker-app 10.2 / 10.5: the shared reject-reason prompt (R4.6, R4.7, D13).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  RejectReasonModal,
  rejectReasonError,
  type RejectReasonModalProps,
} from './RejectReasonModal';

function renderModal(over: Partial<RejectReasonModalProps> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <RejectReasonModal
      open
      count={1}
      requesterName="Priya"
      onClose={onClose}
      onConfirm={onConfirm}
      {...over}
    />,
  );
  return { onConfirm, onClose };
}

describe('RejectReasonModal (R4.7)', () => {
  it('sends a trimmed reason, or null when it is only whitespace', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();
    expect(screen.getByRole('heading', { name: 'Reject request' })).toBeInTheDocument();
    expect(screen.getByText(/Priya will see/)).toBeInTheDocument();

    const reject = screen.getByRole('button', { name: 'Reject' });
    await user.click(reject);
    expect(onConfirm).toHaveBeenLastCalledWith(null);

    const text = screen.getByRole('textbox', { name: /Reason/ });
    await user.type(text, '   ');
    await user.click(reject);
    expect(onConfirm).toHaveBeenLastCalledWith(null);

    await user.clear(text);
    await user.type(text, '  Wrong shop  ');
    expect(screen.getByText(/10 \/ 200/)).toBeInTheDocument();
    await user.click(reject);
    expect(onConfirm).toHaveBeenLastCalledWith('Wrong shop');
  });

  it('refuses 201 characters after trimming and names the bulk count', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal({ count: 3, requesterName: null });
    expect(screen.getByRole('heading', { name: 'Reject 3 requests' })).toBeInTheDocument();
    const text = screen.getByRole('textbox', { name: /Reason/ });
    await user.click(text);
    await user.paste(`${'x'.repeat(201)}  `);
    expect(screen.getByRole('button', { name: 'Reject 3' })).toBeDisabled();
    expect(screen.getByText('The reason must be at most 200 characters')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(rejectReasonError('x'.repeat(200))).toBeNull();
    expect(rejectReasonError(` ${'x'.repeat(200)} `)).toBeNull();
  });

  it('counts 0–200 trimmed characters: whitespace counts for nothing, 200 is still allowed', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();
    const text = screen.getByRole('textbox', { name: /Reason/ });
    expect(screen.getByText(/0 \/ 200/)).toBeInTheDocument();

    await user.type(text, '   ');
    expect(screen.getByText(/0 \/ 200/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();

    await user.clear(text);
    await user.click(text);
    await user.paste(`  ${'y'.repeat(200)}  `);
    expect(screen.getByText(/200 \/ 200/)).toBeInTheDocument();
    expect(screen.queryByText('The reason must be at most 200 characters')).toBeNull();
    const reject = screen.getByRole('button', { name: 'Reject' });
    expect(reject).toBeEnabled();
    await user.click(reject);
    expect(onConfirm).toHaveBeenLastCalledWith('y'.repeat(200));
  });

  it('starts empty every time it opens, so one reason never sticks to the next rejection', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <RejectReasonModal
        open
        count={1}
        requesterName="Priya"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );
    await user.type(screen.getByRole('textbox', { name: /Reason/ }), 'Wrong shop');
    expect(screen.getByText(/10 \/ 200/)).toBeInTheDocument();

    rerender(
      <RejectReasonModal
        open={false}
        count={1}
        requesterName="Priya"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(
      <RejectReasonModal
        open
        count={1}
        requesterName="Ravi"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole('textbox', { name: /Reason/ })).toHaveValue('');
    expect(screen.getByText(/0 \/ 200/)).toBeInTheDocument();
    expect(screen.getByText(/Ravi will see/)).toBeInTheDocument();
  });

  it('Cancel rejects nothing', async () => {
    const user = userEvent.setup();
    const { onConfirm, onClose } = renderModal();
    await user.type(screen.getByRole('textbox', { name: /Reason/ }), 'Wrong shop');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
