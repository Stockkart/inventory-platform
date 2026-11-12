import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import {
  DrugLicenceFields,
  DrugLicenceSummary,
  drugLicenceComplete,
  formatDlExpiry,
  type DrugLicenceValue,
} from './DrugLicenceFields';

function Harness({ initial, expired }: { initial: DrugLicenceValue; expired?: boolean }) {
  const [value, setValue] = useState<DrugLicenceValue>(initial);
  return (
    <>
      <DrugLicenceFields value={value} onChange={setValue} expired={expired} idPrefix="t" />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

const current = () =>
  JSON.parse(screen.getByTestId('value').textContent || '{}') as DrugLicenceValue;

describe('DrugLicenceFields', () => {
  it('asks for no expiry until a DL No is typed', () => {
    render(<Harness initial={{ dlNo: '' }} />);
    const expiry = screen.getByLabelText(/DL expiry/);
    expect(expiry).toBeDisabled();
    expect(expiry).not.toBeRequired();
  });

  it('requires the expiry once a DL No is typed', () => {
    render(<Harness initial={{ dlNo: '' }} />);
    fireEvent.change(screen.getByLabelText('DL No'), { target: { value: '20B/123' } });
    const expiry = screen.getByLabelText(/DL expiry/);
    expect(expiry).toBeEnabled();
    expect(expiry).toBeRequired();
    fireEvent.change(expiry, { target: { value: '2028-03-31' } });
    expect(current()).toEqual({ dlNo: '20B/123', dlExpiry: '2028-03-31' });
  });

  it('clears the expiry when the DL No is cleared', () => {
    render(<Harness initial={{ dlNo: '20B/123', dlExpiry: '2028-03-31' }} />);
    fireEvent.change(screen.getByLabelText('DL No'), { target: { value: '' } });
    expect(current().dlExpiry).toBe('');
  });

  it('flags an expired licence', () => {
    render(<Harness initial={{ dlNo: '20B/123', dlExpiry: '2020-03-31' }} expired />);
    expect(screen.getByRole('alert')).toHaveTextContent('This licence has expired');
  });
});

describe('drugLicenceComplete', () => {
  it('needs an expiry only with a DL No', () => {
    expect(drugLicenceComplete({})).toBe(true);
    expect(drugLicenceComplete({ dlNo: '  ' })).toBe(true);
    expect(drugLicenceComplete({ dlNo: '20B/123' })).toBe(false);
    expect(drugLicenceComplete({ dlNo: '20B/123', dlExpiry: '' })).toBe(false);
    expect(drugLicenceComplete({ dlNo: '20B/123', dlExpiry: '2028-03-31' })).toBe(true);
  });
});

describe('DrugLicenceSummary', () => {
  it('shows the number, expiry and an expired badge', () => {
    render(<DrugLicenceSummary dlNo="20B/123" dlExpiry="2020-03-31" expired />);
    expect(screen.getByText('20B/123')).toBeInTheDocument();
    expect(screen.getByText(`exp ${formatDlExpiry('2020-03-31')}`)).toBeInTheDocument();
    expect(screen.getByText('DL expired')).toBeInTheDocument();
  });

  it('shows a dash without a number', () => {
    const { container } = render(<DrugLicenceSummary dlNo={null} />);
    expect(container).toHaveTextContent('—');
  });
});

describe('formatDlExpiry', () => {
  it('reads the date without a time zone shift', () => {
    expect(formatDlExpiry('2028-03-31')).toMatch(/31/);
    expect(formatDlExpiry('2028-03-31')).toMatch(/2028/);
  });
});
