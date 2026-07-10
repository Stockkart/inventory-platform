import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from 'react';
import { cn } from '../utils/cn';
import type { SpacingScale } from '../utils/types';
import styles from './Box.module.css';

type BoxOwnProps = {
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
  /** Constrains width; pair with mx="auto" for centered page shells. */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  mx?: 'auto';
  bg?: 'canvas' | 'surface' | 'elevated' | 'muted';
  border?: boolean;
  rounded?: 'sm' | 'md' | 'lg';
  overflow?: 'hidden' | 'auto';
  position?: 'relative' | 'absolute';
  style?: CSSProperties;
};

export type BoxProps = BoxOwnProps & Omit<ComponentPropsWithoutRef<'div'>, keyof BoxOwnProps>;

export const Box = forwardRef<HTMLElement, BoxProps>(function Box(
  {
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
    maxWidth,
    mx,
    bg,
    border,
    rounded,
    overflow,
    position,
    style,
    ...rest
  },
  ref,
) {
  return (
    <Component
      ref={ref}
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
        maxWidth && styles[`max-w-${maxWidth}`],
        mx === 'auto' && styles['mx-auto'],
        bg && styles[`bg-${bg}`],
        border && styles['border-default'],
        rounded && styles[`rounded-${rounded}`],
        overflow && styles[`overflow-${overflow}`],
        position && styles[`position-${position}`],
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
});
