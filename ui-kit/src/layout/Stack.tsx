import { Box, type BoxProps } from './Box';

export type StackProps = Omit<BoxProps, 'display' | 'flexDirection'> & {
  direction?: 'row' | 'column';
};

export function Stack({ direction = 'column', ...props }: StackProps) {
  return <Box display="flex" flexDirection={direction} {...props} />;
}

export function Inline(props: Omit<StackProps, 'direction'>) {
  return <Stack direction="row" align="center" {...props} />;
}
