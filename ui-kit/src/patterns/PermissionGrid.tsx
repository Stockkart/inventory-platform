import { useId, type ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Checkbox } from '../forms/Label';
import { VisuallyHidden } from '../layout/VisuallyHidden';
import styles from './PermissionGrid.module.css';

export interface PermissionGridRow<P extends string = string> {
  id: P;
  label: string;
  /** Plain-English line under the label, e.g. "See monthly pay and deductions". */
  description?: ReactNode;
}

export interface PermissionGridColumn<R extends string = string> {
  id: R;
  label: string;
}

export interface PermissionGridProps<R extends string = string, P extends string = string> {
  /** Table caption; also the accessible name of the grid. */
  caption: string;
  /** Shows the caption visually (hidden by default when the page has its own heading). */
  showCaption?: boolean;
  /** Columns, e.g. roles. */
  roles: ReadonlyArray<PermissionGridColumn<R>>;
  /** Rows, e.g. permissions. */
  permissions: ReadonlyArray<PermissionGridRow<P>>;
  /** Ticked permissions per role. */
  value: Partial<Record<R, readonly P[]>>;
  onChange: (role: R, permission: P, checked: boolean) => void;
  /** Whole grid read-only (e.g. user cannot manage settings). */
  disabled?: boolean;
  /** Per-cell lock (e.g. a permission that another ticked permission needs). */
  isCellDisabled?: (role: R, permission: P) => boolean;
  /** Header of the first column. Defaults to "Permission". */
  rowHeaderLabel?: string;
  className?: string;
}

/**
 * Checkbox matrix: one row per permission, one column per role. Row and column headers are real
 * `th` cells so screen readers announce "Run payroll, Manager" for each box; the first column
 * stays in place while the grid scrolls sideways on small screens.
 */
export function PermissionGrid<R extends string, P extends string>({
  caption,
  showCaption = false,
  roles,
  permissions,
  value,
  onChange,
  disabled = false,
  isCellDisabled,
  rowHeaderLabel = 'Permission',
  className,
}: PermissionGridProps<R, P>) {
  const idPrefix = useId();

  return (
    <div className={cn(styles.scroll, className)}>
      <table className={styles.table}>
        <caption className={showCaption ? styles.caption : styles.captionHidden}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={cn(styles.headCell, styles.cornerCell)}>
              {rowHeaderLabel}
            </th>
            {roles.map((role) => (
              <th key={role.id} scope="col" className={styles.headCell}>
                {role.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissions.map((permission) => (
            <tr key={permission.id}>
              <th scope="row" className={styles.rowHeadCell}>
                <span className={styles.permissionLabel}>{permission.label}</span>
                {permission.description ? (
                  <span className={styles.permissionDescription}>{permission.description}</span>
                ) : null}
              </th>
              {roles.map((role) => {
                const checked = value[role.id]?.includes(permission.id) ?? false;
                const cellDisabled =
                  disabled || (isCellDisabled?.(role.id, permission.id) ?? false);
                return (
                  <td key={role.id} className={styles.cell}>
                    <Checkbox
                      id={`${idPrefix}-${role.id}-${permission.id}`}
                      className={styles.checkbox}
                      // The visible headers give context; the hidden label names the box on its own.
                      label={
                        <VisuallyHidden>{`${permission.label}, ${role.label}`}</VisuallyHidden>
                      }
                      checked={checked}
                      disabled={cellDisabled}
                      onChange={(e) => onChange(role.id, permission.id, e.target.checked)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
