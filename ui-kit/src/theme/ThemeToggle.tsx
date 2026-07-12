import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { Button } from '../forms/Button';
import { Icon } from '../icons';
import type { ButtonProps } from '../forms/Button';

export type ThemeToggleProps = Omit<ButtonProps, 'children' | 'onClick' | 'leftIcon' | 'rightIcon'>;

export function ThemeToggle({
  variant = 'ghost',
  size = 'sm',
  'aria-label': ariaLabel,
  ...props
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label={ariaLabel ?? (isDark ? 'Switch to light mode' : 'Switch to dark mode')}
      onClick={toggleTheme}
      {...props}
    >
      <Icon icon={isDark ? Sun : Moon} size={size === 'lg' ? 'md' : 'sm'} />
    </Button>
  );
}
