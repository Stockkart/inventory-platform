import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '../utils/cn';
import styles from './QtyStepper.module.css';

export type QtyStepperProps = {
  value: number | string;
  onDecrement?: () => void;
  onIncrement?: () => void;
  onChange?: InputHTMLAttributes<HTMLInputElement>['onChange'];
  onBlur?: InputHTMLAttributes<HTMLInputElement>['onBlur'];
  onKeyDown?: InputHTMLAttributes<HTMLInputElement>['onKeyDown'];
  disabled?: boolean;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'onBlur' | 'onKeyDown' | 'disabled' | 'className'
  >;
  className?: string;
  decrementLabel?: ReactNode;
  incrementLabel?: ReactNode;
};

export const QtyStepper = forwardRef<HTMLInputElement, QtyStepperProps>(function QtyStepper(
  {
    value,
    onDecrement,
    onIncrement,
    onChange,
    onBlur,
    onKeyDown,
    disabled,
    decrementDisabled,
    incrementDisabled,
    inputProps,
    className,
    decrementLabel = '−',
    incrementLabel = '+',
  },
  ref,
) {
  return (
    <div className={cn(styles.root, className)}>
      <button
        type="button"
        className={styles.btn}
        onClick={onDecrement}
        disabled={disabled || decrementDisabled}
        aria-label="Decrease quantity"
      >
        {decrementLabel}
      </button>
      <input
        ref={ref}
        type="number"
        className={styles.input}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        disabled={disabled}
        {...inputProps}
      />
      <button
        type="button"
        className={styles.btn}
        onClick={onIncrement}
        disabled={disabled || incrementDisabled}
        aria-label="Increase quantity"
      >
        {incrementLabel}
      </button>
    </div>
  );
});

export type QtyStepperButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;
