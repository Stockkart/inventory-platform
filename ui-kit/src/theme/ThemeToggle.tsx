import { useTheme } from './ThemeProvider';
import { Button } from '../forms/Button';
import type { ButtonProps } from '../forms/Button';

export type ThemeToggleProps = Omit<ButtonProps, 'children' | 'onClick'>;

export function ThemeToggle(props: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      {...props}
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </Button>
  );
}
