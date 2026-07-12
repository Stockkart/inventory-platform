import { useEffect, useState } from 'react';
import { QtyStepper } from './QtyStepper';

export interface CartQtyStepperProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  onCommit: (newQty: number) => void | Promise<void>;
  disabled?: boolean;
}

/** Quantity stepper with draft/commit behavior for cart line edits. */
export function CartQtyStepper({
  value,
  onDecrement,
  onIncrement,
  onCommit,
  disabled,
}: CartQtyStepperProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = async () => {
    const qty = Number(draft);
    if (!Number.isFinite(qty) || qty <= 0 || qty === value) {
      setDraft(String(value));
      return;
    }
    try {
      await onCommit(qty);
    } catch {
      setDraft(String(value));
    }
  };

  return (
    <QtyStepper
      value={draft}
      disabled={disabled}
      onDecrement={onDecrement}
      onIncrement={onIncrement}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          void commit();
          e.currentTarget.blur();
        }
      }}
      inputProps={{ min: 1, onFocus: (e) => e.currentTarget.select() }}
    />
  );
}
