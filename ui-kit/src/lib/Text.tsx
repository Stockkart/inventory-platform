import type { ElementType, ReactNode } from 'react';
import styles from './Text.module.css';

type TextVariant = 'body' | 'caption' | 'heading' | 'title';

export interface TextProps {
  children?: ReactNode;
  as?: ElementType;
  variant?: TextVariant;
  truncate?: boolean;
  className?: string;
}

export function Text({
  children,
  as: Component = 'span',
  variant = 'body',
  truncate = false,
  className,
}: TextProps) {
  const classes = [
    styles.text,
    styles[`variant-${variant}`],
    truncate && styles.truncate,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Component className={classes}>{children}</Component>;
}
