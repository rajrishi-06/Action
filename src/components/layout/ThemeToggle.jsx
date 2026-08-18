import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { IconButton } from '../ui/Button';

const ICONS = { light: Sun, dark: Moon, system: Monitor };
const NEXT = { light: 'dark', dark: 'system', system: 'light' };

/** Cycles light → dark → system and announces the current choice. */
export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();
  const Icon = ICONS[theme] ?? Monitor;

  return (
    <IconButton
      label={`Theme: ${theme}. Switch to ${NEXT[theme]}.`}
      size="sm"
      onClick={cycleTheme}
    >
      <Icon className="h-4 w-4" />
    </IconButton>
  );
}
