import { useEffect } from 'react';
import { useUiStore } from '@/stores/uiStore';

export function useTheme(): void {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme === 'light' ? 'light' : 'dark';

    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? 'light' : 'dark');
  }, [theme]);
}
