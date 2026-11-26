// Worker-app 10.2 / 10.5 / 20.4: the Possible match card of the drawer (R4.3, R4.15).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { hrChrome } from '@inventory-platform/ui-kit';
import type { PossibleMatch } from '@inventory-platform/hr/types';
import { PossibleMatchPanel, linkOrCreateQuestion, matchLabel } from './PossibleMatchPanel';

const RAVI: PossibleMatch = {
  employeeId: 'e14',
  code: 'EMP-014',
  name: 'Ravi',
  status: 'ACTIVE',
  linked: false,
};

describe('PossibleMatchPanel (R4.3)', () => {
  it('shows code, name, status and whether a login is linked, and nothing else', () => {
    render(<PossibleMatchPanel match={RAVI} />);
    expect(screen.getByRole('heading', { name: 'Possible match' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Possible match' })).toHaveClass(
      hrChrome.hrJoinMatchCard,
    );
    expect(screen.getByText('EMP-014 Ravi')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Linked to a login')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.queryByText('e14')).not.toBeInTheDocument();
  });

  it('says Yes for a linked, exited employee', () => {
    render(
      <PossibleMatchPanel
        match={{ employeeId: 'e2', code: 'EMP-002', name: 'Sita', status: 'EXITED', linked: true }}
      />,
    );
    expect(screen.getByText('Exited')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(matchLabel({ code: 'EMP-002', name: 'Sita' })).toBe('EMP-002 Sita');
  });

  it('without onLink / onCreate it is read-only: no buttons, the explanatory line instead', () => {
    render(<PossibleMatchPanel match={RAVI} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(
      screen.getByText(/already has an employee with the same email or phone/),
    ).toBeInTheDocument();
    expect(screen.queryByText(linkOrCreateQuestion(RAVI))).toBeNull();
  });
});

describe('PossibleMatchPanel — inline Link to existing / Create new (R4.4, R4.5, R4.15)', () => {
  it('asks the R4.4 question and runs the handlers from the two buttons', async () => {
    const user = userEvent.setup();
    const onLink = vi.fn();
    const onCreate = vi.fn();
    render(
      <PossibleMatchPanel match={RAVI} onLink={onLink} onCreate={onCreate} linkButtonId="link-1" />,
    );
    expect(screen.getByText('Link to EMP-014 Ravi, or create a new employee?')).toBeInTheDocument();
    const link = screen.getByRole('button', { name: 'Link to existing' });
    expect(link).toHaveAttribute('id', 'link-1');
    await user.click(link);
    expect(onLink).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Create new' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the refusal under the buttons and leaves them enabled', () => {
    render(
      <PossibleMatchPanel
        match={RAVI}
        onLink={vi.fn()}
        onCreate={vi.fn()}
        refusal="EMP-014 is already linked to another login"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'EMP-014 is already linked to another login',
    );
    expect(screen.getByRole('button', { name: 'Link to existing' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Create new' })).toBeEnabled();
  });

  it('while saving, the pressed button spins and the other is disabled', () => {
    render(<PossibleMatchPanel match={RAVI} onLink={vi.fn()} onCreate={vi.fn()} saving="LINK" />);
    expect(screen.getByRole('button', { name: /Link to existing/ })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Create new' })).toBeDisabled();
  });
});
