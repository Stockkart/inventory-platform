export type Theme = 'light' | 'dark';

export type ThemeMode = Theme | 'system';

export interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}
