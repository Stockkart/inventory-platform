import { List, LayoutGrid } from 'lucide-react';
import { cn } from '../utils/cn';
import { Icon } from '../icons/Icon';
import styles from './ViewModeToggle.module.css';

export type ViewMode = 'list' | 'grid';

export type ViewModeToggleProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  listLabel?: string;
  gridLabel?: string;
  className?: string;
  'aria-label'?: string;
};

export function ViewModeToggle({
  value,
  onChange,
  listLabel = 'List',
  gridLabel = 'Grid',
  className,
  'aria-label': ariaLabel = 'View mode',
}: ViewModeToggleProps) {
  return (
    <div className={cn(styles.track, className)} role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className={cn(styles.btn, value === 'list' && styles.btnActive)}
        aria-pressed={value === 'list'}
        title={listLabel}
        onClick={() => onChange('list')}
      >
        <Icon icon={List} size="sm" />
        <span>{listLabel}</span>
      </button>
      <button
        type="button"
        className={cn(styles.btn, value === 'grid' && styles.btnActive)}
        aria-pressed={value === 'grid'}
        title={gridLabel}
        onClick={() => onChange('grid')}
      >
        <Icon icon={LayoutGrid} size="sm" />
        <span>{gridLabel}</span>
      </button>
    </div>
  );
}
