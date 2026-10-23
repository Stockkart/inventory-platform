import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type FocusEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '../utils/cn';
import { AnchoredPortal } from '../patterns/AnchoredPortal';
import { ChoiceList } from '../patterns/FacetFilter';
import styles from './forms.module.css';

export type SelectOptionDef = {
  value: string;
  label: string;
  disabled?: boolean;
};

export interface SelectProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'defaultValue' | 'onChange'> {
  value?: string | number;
  /** Starting value when `value` is not controlled. */
  defaultValue?: string | number;
  /** Called with the picked value in `event.target.value`, as a native select's change. */
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  /** Submitted with a form through a hidden input. */
  name?: string;
  /** A form will not submit while the value is empty, as with a native required select. */
  required?: boolean;
  hasError?: boolean;
  /** When set, renders options inside ui-kit (no raw `<option>` in domain code). */
  options?: readonly SelectOptionDef[];
  /** `<option>` elements, when `options` is not given. */
  children?: ReactNode;
}

function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      typeof child === 'string' || typeof child === 'number'
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
        ? textOf(child.props.children)
        : '',
    )
    .join('');
}

/** The `<option>` children as option defs (fragments and mapped arrays included). */
function optionsFromChildren(children: ReactNode): SelectOptionDef[] {
  const out: SelectOptionDef[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{
      value?: string | number;
      disabled?: boolean;
      children?: ReactNode;
    }>;
    if (element.type === Fragment) {
      out.push(...optionsFromChildren(element.props.children));
    } else if (element.type === 'option') {
      const label = textOf(element.props.children);
      out.push({
        value: element.props.value != null ? String(element.props.value) : label,
        label,
        disabled: element.props.disabled,
      });
    }
  });
  return out;
}

/**
 * The StockKart dropdown, never the browser's native one: a field-styled button that opens the
 * ui-kit `ChoiceList` (check mark on the chosen option, arrow keys between options) in a panel
 * portalled out of scroll containers and over modals. Keeps a native select's props: `value`,
 * `onChange` with `event.target.value`, `options` or `<option>` children, `id` for `FormField`.
 * Shows the first option while the value matches none, as a native select does.
 */
export function Select({
  hasError,
  className,
  children,
  options,
  value,
  defaultValue,
  onChange,
  name,
  required,
  id,
  disabled,
  ...rest
}: SelectProps) {
  const items = options ?? optionsFromChildren(children);
  const [uncontrolled, setUncontrolled] = useState(
    defaultValue != null ? String(defaultValue) : items[0]?.value ?? '',
  );
  const current = value != null ? String(value) : uncontrolled;
  const selected = items.find((o) => o.value === current) ?? items[0];
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const triggerId = id ?? `select-${autoId}`;
  const listId = `${triggerId}-options`;

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // A select in a modal closes itself, not the modal.
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  // Focus the chosen option once the panel is in place, so arrow keys work at once.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const list = panelRef.current;
      const option =
        list?.querySelector<HTMLButtonElement>('[role="option"][aria-selected="true"]') ??
        list?.querySelector<HTMLButtonElement>('[role="option"]:not(:disabled)');
      option?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const pick = (next: string) => {
    close(true);
    if (next === current) return;
    if (value == null) setUncontrolled(next);
    const target = { value: next, name: name ?? '', id: triggerId } as HTMLSelectElement;
    onChange?.({ target, currentTarget: target } as ChangeEvent<HTMLSelectElement>);
  };

  const onPanelBlur = (e: FocusEvent<HTMLDivElement>) => {
    const to = e.relatedTarget as Node | null;
    if (to && (panelRef.current?.contains(to) || triggerRef.current?.contains(to))) return;
    if (to) setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        className={cn(
          styles.control,
          styles.selectTrigger,
          open && styles.selectTriggerOpen,
          hasError && styles.controlError,
          className,
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={hasError || undefined}
        aria-required={required || undefined}
        disabled={disabled}
        data-sk-select=""
        {...rest}
        onClick={() => setOpen((was) => !was)}
      >
        <span className={styles.selectValue}>{selected?.label ?? ''}</span>
      </button>
      {required ? (
        // Carries the value for the form's own required check; focus goes to the button.
        <input
          className={styles.selectRequiredProxy}
          name={name}
          value={current}
          required
          tabIndex={-1}
          aria-hidden
          onChange={() => undefined}
          onFocus={() => triggerRef.current?.focus()}
        />
      ) : name != null ? (
        <input type="hidden" name={name} value={current} />
      ) : null}
      <AnchoredPortal
        anchorRef={triggerRef}
        open={open}
        offset={4}
        flip
        aboveModals
        panelRef={panelRef}
      >
        <div className={styles.selectPanel} onBlur={onPanelBlur}>
          <ChoiceList
            id={listId}
            aria-label={rest['aria-label']}
            aria-labelledby={rest['aria-label'] ? undefined : triggerId}
            value={selected?.value ?? ''}
            options={items}
            onChange={pick}
          />
        </div>
      </AnchoredPortal>
    </>
  );
}
