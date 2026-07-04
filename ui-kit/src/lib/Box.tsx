import type { ElementType, ReactNode } from 'react';
import styles from './Box.module.css';

type Spacing = 'none' | 'sm' | 'md' | 'lg';

export interface BoxProps {
  children?: ReactNode;
  className?: string;
  as?: ElementType;
  padding?: Spacing;
  display?: 'block' | 'flex' | 'grid';
  flexDirection?: 'row' | 'column';
  gap?: Spacing;
  align?: 'start' | 'center' | 'stretch';
  justify?: 'start' | 'center' | 'between';
  width?: 'full';
}

export function Box({
  children,
  className,
  as: Component = 'div',
  padding,
  display,
  flexDirection,
  gap,
  align,
  justify,
  width,
}: BoxProps) {
  const classes = [
    styles.box,
    padding && styles[`padding-${padding}`],
    display && styles[`display-${display}`],
    flexDirection && styles[`flex-${flexDirection}`],
    gap && styles[`gap-${gap}`],
    align && styles[`align-${align}`],
    justify && styles[`justify-${justify}`],
    width === 'full' && styles['w-full'],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <Component className={classes}>{children}</Component>;
}
