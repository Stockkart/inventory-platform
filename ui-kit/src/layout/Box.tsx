import type { CSSProperties, ElementType, ReactNode } from 'react';
import { cn } from '../utils/cn';
import type { SpacingScale } from '../utils/types';
import styles from './Box.module.css';

export interface BoxProps {
  children?: ReactNode;
  className?: string;
  as?: ElementType;
  padding?: SpacingScale;
  margin?: SpacingScale;
  display?: 'block' | 'flex' | 'grid' | 'inline-flex';
  flexDirection?: 'row' | 'column';
  flexWrap?: boolean;
  gap?: SpacingScale;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between';
  width?: 'full';
  height?: 'full';
  bg?: 'canvas' | 'surface' | 'elevated' | 'muted';
  border?: boolean;
  rounded?: 'sm' | 'md' | 'lg';
  overflow?: 'hidden' | 'auto';
  position?: 'relative' | 'absolute';
  style?: CSSProperties;
}

export function Box({
  children,
  className,
  as: Component = 'div',
  padding,
  margin,
  display,
  flexDirection,
  flexWrap,
  gap,
  align,
  justify,
  width,
  height,
  bg,
  border,
  rounded,
  overflow,
  position,
  style,
}: BoxProps) {
  return (
    <Component
      style={style}
      className={cn(
        styles.box,
        padding && styles[`padding-${padding}`],
        margin && styles[`margin-${margin}`],
        display && styles[`display-${display}`],
        flexDirection && styles[`flex-${flexDirection}`],
        flexWrap && styles['flex-wrap'],
        gap && styles[`gap-${gap}`],
        align && styles[`align-${align}`],
        justify && styles[`justify-${justify}`],
        width === 'full' && styles['w-full'],
        height === 'full' && styles['h-full'],
        bg && styles[`bg-${bg}`],
        border && styles['border-default'],
        rounded && styles[`rounded-${rounded}`],
        overflow && styles[`overflow-${overflow}`],
        position && styles[`position-${position}`],
        className
      )}
    >
      {children}
    </Component>
  );
}
