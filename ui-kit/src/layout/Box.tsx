import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from 'react';
import { cn } from '../utils/cn';
import type { SpacingScale } from '../utils/types';
import styles from './Box.module.css';

type BoxOwnProps = {
  children?: ReactNode;
  className?: string;
  as?: ElementType;
  /** All-sides padding. Prefer `px`/`py`/`pt`/… for directional control. */
  padding?: SpacingScale;
  pt?: SpacingScale;
  pb?: SpacingScale;
  pl?: SpacingScale;
  pr?: SpacingScale;
  px?: SpacingScale;
  py?: SpacingScale;
  /** All-sides margin. Prefer `mx`/`my`/`mt`/… for directional control. */
  margin?: SpacingScale;
  mt?: SpacingScale;
  mb?: SpacingScale;
  ml?: SpacingScale;
  mr?: SpacingScale;
  /** Horizontal margin. Use `"auto"` to center block layouts. */
  mx?: SpacingScale | 'auto';
  my?: SpacingScale;
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
  bg?: 'canvas' | 'surface' | 'elevated' | 'muted';
  /** Full border on all sides. */
  border?: boolean;
  borderTop?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  borderRight?: boolean;
  rounded?: 'sm' | 'md' | 'lg';
  overflow?: 'hidden' | 'auto';
  overflowY?: 'hidden' | 'auto' | 'scroll';
  overflowX?: 'hidden' | 'auto' | 'scroll';
  position?: 'relative' | 'absolute' | 'sticky' | 'fixed';
  flex?: '1' | 'none';
  flexShrink?: 0 | 1;
  flexGrow?: 0 | 1;
  minWidth?: '0';
  minHeight?: '0' | 'full' | 'screen';
  textAlign?: 'left' | 'center' | 'right';
  zIndex?: 'dropdown' | 'sticky' | 'modal';
  /** Escape hatch — prefer token props. */
  style?: CSSProperties;
};

export type BoxProps = BoxOwnProps & Omit<ComponentPropsWithoutRef<'div'>, keyof BoxOwnProps>;

function spaceClass(prefix: string, value: SpacingScale | 'auto' | undefined): string | undefined {
  if (!value) return undefined;
  return styles[`${prefix}-${value}` as keyof typeof styles];
}

export const Box = forwardRef<HTMLElement, BoxProps>(function Box(
  {
    children,
    className,
    as: Component = 'div',
    padding,
    pt,
    pb,
    pl,
    pr,
    px,
    py,
    margin,
    mt,
    mb,
    ml,
    mr,
    mx,
    my,
    display,
    flexDirection,
    flexWrap,
    gap,
    align,
    justify,
    width,
    height,
    maxWidth,
    bg,
    border,
    borderTop,
    borderBottom,
    borderLeft,
    borderRight,
    rounded,
    overflow,
    overflowY,
    overflowX,
    position,
    flex,
    flexShrink,
    flexGrow,
    minWidth,
    minHeight,
    textAlign,
    zIndex,
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
        spaceClass('padding', padding),
        spaceClass('pt', pt),
        spaceClass('pb', pb),
        spaceClass('pl', pl),
        spaceClass('pr', pr),
        spaceClass('px', px),
        spaceClass('py', py),
        spaceClass('margin', margin),
        spaceClass('mt', mt),
        spaceClass('mb', mb),
        spaceClass('ml', ml),
        spaceClass('mr', mr),
        spaceClass('mx', mx),
        spaceClass('my', my),
        display && styles[`display-${display}`],
        flexDirection && styles[`flex-${flexDirection}`],
        flexWrap && styles['flex-wrap'],
        spaceClass('gap', gap),
        align && styles[`align-${align}`],
        justify && styles[`justify-${justify}`],
        width === 'full' && styles['w-full'],
        height === 'full' && styles['h-full'],
        maxWidth && styles[`max-w-${maxWidth}`],
        bg && styles[`bg-${bg}`],
        border && styles['border-default'],
        borderTop && styles['border-top'],
        borderBottom && styles['border-bottom'],
        borderLeft && styles['border-left'],
        borderRight && styles['border-right'],
        rounded && styles[`rounded-${rounded}`],
        overflow && styles[`overflow-${overflow}`],
        overflowY && styles[`overflow-y-${overflowY}`],
        overflowX && styles[`overflow-x-${overflowX}`],
        position && styles[`position-${position}`],
        flex === '1' && styles['flex-1'],
        flex === 'none' && styles['flex-none'],
        flexShrink === 0 && styles['flex-shrink-0'],
        flexShrink === 1 && styles['flex-shrink-1'],
        flexGrow === 0 && styles['flex-grow-0'],
        flexGrow === 1 && styles['flex-grow-1'],
        minWidth === '0' && styles['min-w-0'],
        minHeight === '0' && styles['min-h-0'],
        minHeight === 'full' && styles['min-h-full'],
        minHeight === 'screen' && styles['min-h-screen'],
        textAlign && styles[`text-${textAlign}`],
        zIndex && styles[`z-${zIndex}`],
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
});
