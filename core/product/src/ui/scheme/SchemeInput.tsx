import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Input } from '@inventory-platform/ui-kit';
import { itemAdditionalInputStyle } from '../scanSellStyles';

export type SchemeTypeCart = 'FIXED_UNITS' | 'PERCENTAGE';

export function SchemeInput({
  id,
  schemeType,
  payFor,
  free,
  percentage,
  onCommitUnits,
  onCommitPercentage,
  disabled,
}: {
  id?: string;
  schemeType: SchemeTypeCart | null;
  payFor: number | null;
  free: number | null;
  percentage: number | null;
  onCommitUnits: (payFor: number | null, free: number | null) => void;
  onCommitPercentage: (percentage: number | null) => void;
  disabled: boolean;
}) {
  const formatFromProps = () => {
    // Use schemeType first to decide what to show (API can return both values)
    if (schemeType === 'PERCENTAGE' && percentage != null && percentage !== undefined) {
      return `${percentage}%`;
    }
    if ((schemeType === 'FIXED_UNITS' || schemeType == null) && (payFor != null || free != null)) {
      const payStr = (payFor ?? 0).toString();
      const freeStr = (free ?? 0).toString();
      return `${payStr} + ${freeStr}`;
    }
    return '';
  };

  const [draft, setDraft] = useState(formatFromProps());
  const skipNextBlurCommitRef = useRef(false);

  useEffect(() => {
    setDraft(formatFromProps());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemeType, payFor, free, percentage]);

  const handleChange = (value: string) => {
    // Allow only digits, spaces, '+', and '%'
    if (!/^[0-9+%\s]*$/.test(value)) {
      return;
    }
    const plusCount = (value.match(/\+/g) ?? []).length;
    const percCount = (value.match(/%/g) ?? []).length;
    // At most one '+' and at most one '%'
    if (plusCount > 1 || percCount > 1) {
      return;
    }
    // Do not allow mixing '+' and '%'
    if (plusCount > 0 && percCount > 0) {
      return;
    }
    setDraft(value);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      onCommitUnits(null, null);
      onCommitPercentage(null);
      return;
    }

    // Percentage format e.g. "10%" or "10 %"
    if (trimmed.includes('%')) {
      const numStr = trimmed.replace('%', '').trim();
      const num = parseFloat(numStr);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        onCommitPercentage(num);
        return;
      }
      setDraft(formatFromProps());
      return;
    }

    // Fixed units format e.g. "10 + 1" or "10+1"
    const plusIndex = trimmed.indexOf('+');
    if (plusIndex !== -1) {
      const left = trimmed.slice(0, plusIndex).trim();
      const right = trimmed.slice(plusIndex + 1).trim();
      const pay = parseInt(left, 10);
      const freeVal = parseInt(right, 10);
      if (
        !isNaN(pay) &&
        !isNaN(freeVal) &&
        pay >= 0 &&
        freeVal >= 0 &&
        Number.isInteger(pay) &&
        Number.isInteger(freeVal)
      ) {
        onCommitUnits(pay, freeVal);
        return;
      }
      setDraft(formatFromProps());
      return;
    }

    // Plain number: treat as percentage (e.g. 0, 5, 10 → schemeType PERCENTAGE, schemePercentage that number)
    const num = parseFloat(trimmed);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      onCommitUnits(null, null);
      onCommitPercentage(num);
      return;
    }

    // Invalid format, reset to last valid representation
    setDraft(formatFromProps());
  };

  return (
    <Input
      id={id}
      type="text"
      className={itemAdditionalInputStyle}
      value={draft}
      placeholder="0, 10, 10 + 1 (number = %)"
      disabled={disabled}
      onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)}
      onBlur={() => {
        if (skipNextBlurCommitRef.current) {
          skipNextBlurCommitRef.current = false;
          return;
        }
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          skipNextBlurCommitRef.current = true;
          commit();
          e.currentTarget.blur();
        }
      }}
    />
  );
}
