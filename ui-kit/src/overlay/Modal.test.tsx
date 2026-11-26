// Worker-app 20.4: `Drawer` size, focus trap and focus return (design DD18, R4.17).
import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Drawer, Modal } from './Modal';
import styles from './overlay.module.css';

afterEach(() => cleanup());

function Harness({ size }: { size?: 'md' | 'lg' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open row
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} side="right" size={size}>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Drawer>
    </>
  );
}

describe('Drawer', () => {
  it('renders nothing while closed and a dialog when open', () => {
    const { rerender } = render(
      <Drawer open={false}>
        <span>body</span>
      </Drawer>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(
      <Drawer open>
        <span>body</span>
      </Drawer>,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('is 400 px by default and adds the lg class for size="lg"', () => {
    const { rerender } = render(
      <Drawer open side="right">
        <span>body</span>
      </Drawer>,
    );
    expect(screen.getByRole('dialog')).toHaveClass(styles.drawer, styles.drawerRight);
    expect(screen.getByRole('dialog')).not.toHaveClass(styles.drawerLg);
    rerender(
      <Drawer open side="right" size="lg">
        <span>body</span>
      </Drawer>,
    );
    expect(screen.getByRole('dialog')).toHaveClass(styles.drawer, styles.drawerLg);
  });

  it('moves focus into the dialog on open, traps Tab, and returns focus to the opener on Esc', async () => {
    const user = userEvent.setup();
    render(<Harness size="lg" />);
    const opener = screen.getByRole('button', { name: 'Open row' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
    // Wraps instead of leaving the dialog.
    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('closes on the backdrop and not on a click inside', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose}>
        <button type="button">Inside</button>
      </Drawer>,
    );
    await user.click(screen.getByRole('button', { name: 'Inside' }));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Modal', () => {
  it('labels the dialog by its header and closes on Esc', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} size="sm">
        <Modal.Header title="Edit vendor" />
        <Modal.Body>body</Modal.Body>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Edit vendor' })).toHaveClass(styles['size-sm']);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
