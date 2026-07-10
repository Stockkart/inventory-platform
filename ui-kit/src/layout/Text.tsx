import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '../utils/cn';
import type { TextColor, TextVariant } from '../utils/types';
import styles from './Text.module.css';

const variantElement: Record<TextVariant, ElementType> = {
  body: 'p',
  caption: 'span',
  label: 'span',
  micro: 'span',
  overline: 'span',
  title: 'h2',
  heading1: 'h1',
  heading2: 'h2',
  heading3: 'h3',
  heading4: 'h4',
};

type TextOwnProps = {
  children?: ReactNode;
  as?: ElementType;
  variant?: TextVariant;
  color?: TextColor;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  truncate?: boolean;
  className?: string;
};

export type TextProps = TextOwnProps & Omit<ComponentPropsWithoutRef<'span'>, keyof TextOwnProps>;

export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  {
    children,
    as,
    variant = 'body',
    color = 'primary',
    weight,
    align,
    truncate = false,
    className,
    ...rest
  },
  ref,
) {
  const Component = as ?? variantElement[variant];

  return (
    <Component
      ref={ref}
      className={cn(
        styles.text,
        styles[`variant-${variant}`],
        styles[`color-${color}`],
        weight && styles[`weight-${weight}`],
        align && styles[`align-${align}`],
        truncate && styles.truncate,
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
});
