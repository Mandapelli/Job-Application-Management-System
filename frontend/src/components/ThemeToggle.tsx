import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/app/theme';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/** Three-way switch (light / dark / follow the device), used in the sidebar. */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="Color theme">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          title={`${label} theme`}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
            theme === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only sm:not-sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}

/** One compact button for tight spaces (mobile header, login page): toggles between light and dark. */
export function ThemeButton({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const toDark = resolvedTheme === 'light';
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => setTheme(toDark ? 'dark' : 'light')}
      aria-label={toDark ? 'Switch to dark theme' : 'Switch to light theme'}
      title={toDark ? 'Dark theme' : 'Light theme'}
    >
      {toDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  );
}
