import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import type { PackagingUnit } from '@inventory-platform/types';
import styles from './dashboard.product-registration.module.css';

/** Map free-text or datalist selection to a UQC code (catalog or legacy). */
export function resolvePackagingUqc(
  raw: string,
  catalog: PackagingUnit[]
): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  const byUqc = catalog.find((u) => u.uqc === upper);
  if (byUqc) return byUqc.uqc;
  const byFull = catalog.find(
    (u) => `${u.uqc} — ${u.label}`.toUpperCase() === upper
  );
  if (byFull) return byFull.uqc;
  const byLabel = catalog.find((u) => u.label.toUpperCase() === upper);
  if (byLabel) return byLabel.uqc;
  const codePart = trimmed.split(/[—–-]/)[0]?.trim().toUpperCase();
  if (codePart && catalog.some((u) => u.uqc === codePart)) {
    return codePart;
  }
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  return upper;
}

function formatUnitOption(u: PackagingUnit): string {
  return `${u.uqc} — ${u.label}`;
}

function displayUnitValue(uqc: string, catalog: PackagingUnit[]): string {
  const code = uqc.trim();
  if (!code) return '';
  const upper = code.toUpperCase();
  const def = catalog.find((u) => u.uqc === upper);
  return def ? formatUnitOption(def) : code;
}

function filterPackagingUnits(
  catalog: PackagingUnit[],
  query: string
): PackagingUnit[] {
  const q = query.trim().toLowerCase();
  if (!q) return catalog;
  return catalog.filter(
    (u) =>
      u.uqc.toLowerCase().includes(q) ||
      u.label.toLowerCase().includes(q) ||
      formatUnitOption(u).toLowerCase().includes(q)
  );
}

/** unitsPerPack stored on product; 0 means “1 × unit” with no pack conversion. */
export function packagingFactorForDisplay(
  unitsPerPack: number | undefined
): number {
  const n = Number(unitsPerPack) || 0;
  return n > 0 ? n : 1;
}

export function packagingFactorToUnitsPerPack(
  factor: number,
  unitDef: PackagingUnit | undefined
): number {
  const n = Math.floor(Number(factor)) || 0;
  if (n <= 1) return 0;
  // Keep factor while user has not picked a unit yet.
  if (!unitDef) return n;
  if (!unitDef.allowsUnitsPerPack) return 0;
  return n;
}

type PackagingUnitInputProps = {
  label?: string;
  hint?: string;
  packagingUnits: PackagingUnit[];
  baseUnit: string;
  /** Displayed number after “1 ×” (1 = single base unit, 50 = 50 per pack). */
  factor: number;
  onChange: (baseUnit: string, factor: number) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  compact?: boolean;
};

/** Single field: fixed {@code 1 ×} then quantity and unit (e.g. {@code 1 × 50 TBS}). */
export function PackagingUnitInput({
  label = 'Packaging',
  hint,
  packagingUnits,
  baseUnit,
  factor,
  onChange,
  disabled = false,
  required = false,
  id,
  compact = false,
}: PackagingUnitInputProps) {
  const [unitDraft, setUnitDraft] = useState(() =>
    displayUnitValue(baseUnit, packagingUnits)
  );
  const [listOpen, setListOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const unitWrapRef = useRef<HTMLDivElement>(null);
  const unitInputRef = useRef<HTMLInputElement>(null);
  const unitFocusedRef = useRef(false);
  const qtyFocusedRef = useRef(false);
  const lastSyncedBaseUnitRef = useRef(baseUnit);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const [qtyDraft, setQtyDraft] = useState(() =>
    factor > 1 ? String(factor) : ''
  );

  const unitDef = useMemo(() => {
    const code = baseUnit.trim().toUpperCase();
    if (!code) return undefined;
    return packagingUnits.find((u) => u.uqc === code);
  }, [baseUnit, packagingUnits]);

  /** Middle number only for units that support pack size (e.g. TBS, MLT). */
  const showQtyInput = !unitDef || unitDef.allowsUnitsPerPack;

  useEffect(() => {
    if (qtyFocusedRef.current) return;
    setQtyDraft(factor > 1 ? String(factor) : '');
  }, [factor]);

  // Sync from parent only when not editing (avoids wiping keystrokes).
  useEffect(() => {
    if (unitFocusedRef.current) return;
    if (baseUnit === lastSyncedBaseUnitRef.current) return;
    lastSyncedBaseUnitRef.current = baseUnit;
    setUnitDraft(displayUnitValue(baseUnit, packagingUnits));
  }, [baseUnit, packagingUnits]);

  // When catalog loads, fill in label for an existing UQC code (e.g. BAL → BAL — BALE).
  useEffect(() => {
    if (unitFocusedRef.current || !baseUnit || packagingUnits.length === 0) {
      return;
    }
    const formatted = displayUnitValue(baseUnit, packagingUnits);
    setUnitDraft((draft) => {
      if (!draft || draft === baseUnit || draft.toUpperCase() === baseUnit) {
        return formatted;
      }
      return draft;
    });
  }, [packagingUnits.length, baseUnit, packagingUnits]);

  const filteredUnits = useMemo(
    () => filterPackagingUnits(packagingUnits, unitDraft),
    [packagingUnits, unitDraft]
  );

  useEffect(() => {
    setHighlightIdx(0);
  }, [unitDraft, listOpen]);

  useLayoutEffect(() => {
    if (!listOpen || !unitWrapRef.current) {
      return;
    }
    const updatePosition = () => {
      const el = unitWrapRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const width = Math.max(rect.width, compact ? 180 : 220);
      const maxHeight = 240;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUp = spaceBelow < 120 && spaceAbove > spaceBelow;
      const height = Math.min(maxHeight, openUp ? spaceAbove : spaceBelow);
      setDropdownStyle({
        position: 'fixed',
        left: Math.min(rect.left, window.innerWidth - width - 8),
        width,
        maxHeight: Math.max(height, 96),
        zIndex: 3000,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [listOpen, compact, unitDraft, filteredUnits.length]);

  useEffect(() => {
    if (!listOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (unitWrapRef.current?.contains(target)) {
        return;
      }
      if (
        target instanceof Element &&
        target.closest('[data-packaging-unit-dropdown]')
      ) {
        return;
      }
      setListOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [listOpen]);

  const effectiveFactorForUnit = (
    uqc: string,
    currentFactor: number
  ): number => {
    const def = packagingUnits.find((u) => u.uqc === uqc);
    if (def && !def.allowsUnitsPerPack) return 1;
    return currentFactor;
  };

  const emitPackagingChange = (rawUnit: string, nextFactor: number) => {
    const text = rawUnit.trim();
    if (!text) {
      lastSyncedBaseUnitRef.current = '';
      onChange('', nextFactor);
      return;
    }
    const resolved = resolvePackagingUqc(text, packagingUnits);
    const factorForUnit = effectiveFactorForUnit(resolved, nextFactor);
    lastSyncedBaseUnitRef.current = resolved;
    onChange(resolved, factorForUnit);
    if (!unitFocusedRef.current) {
      setUnitDraft(displayUnitValue(resolved, packagingUnits));
    }
    if (!packagingUnits.find((u) => u.uqc === resolved)?.allowsUnitsPerPack) {
      setQtyDraft('');
    }
  };

  const commitUnit = (raw?: string) => {
    const text = (raw ?? unitDraft).trim();
    if (!text) {
      lastSyncedBaseUnitRef.current = '';
      onChange('', factor);
      setUnitDraft('');
      setListOpen(false);
      return;
    }
    const resolved = resolvePackagingUqc(text, packagingUnits);
    const nextFactor = effectiveFactorForUnit(resolved, factor);
    lastSyncedBaseUnitRef.current = resolved;
    onChange(resolved, nextFactor);
    setUnitDraft(displayUnitValue(resolved, packagingUnits));
    if (!packagingUnits.find((u) => u.uqc === resolved)?.allowsUnitsPerPack) {
      setQtyDraft('');
    }
    setListOpen(false);
  };

  const selectUnit = (u: PackagingUnit) => {
    const text = formatUnitOption(u);
    setUnitDraft(text);
    commitUnit(text);
  };

  const openList = () => {
    if (disabled || packagingUnits.length === 0) return;
    setListOpen(true);
  };

  const onUnitKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (!listOpen) {
        openList();
        return;
      }
      setHighlightIdx((i) =>
        filteredUnits.length === 0
          ? 0
          : Math.min(i + 1, filteredUnits.length - 1)
      );
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (!listOpen) {
        openList();
        return;
      }
      setHighlightIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setListOpen(false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (listOpen && filteredUnits[highlightIdx]) {
        selectUnit(filteredUnits[highlightIdx]);
      } else {
        commitUnit();
      }
      return;
    }
  };

  const wrapClass = compact
    ? `${styles.factorInputWrap} ${styles.factorInputWrapCompact}`
    : styles.factorInputWrap;

  const listboxId = id ? `${id}-listbox` : undefined;
  const qtyInputId = id ? `${id}-qty` : undefined;

  return (
    <div
      className={label || hint ? styles.formGroup : styles.formGroupBare}
    >
      {label ? (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required ? ' *' : ''}
        </label>
      ) : null}
      <div className={wrapClass}>
        <span className={styles.factorPrefix}>1 ×</span>
        {showQtyInput ? (
          <input
            id={qtyInputId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className={styles.factorQtyInput}
            placeholder="1"
            value={qtyDraft}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d+$/.test(v)) {
                setQtyDraft(v);
                const n = v === '' ? 1 : parseInt(v, 10);
                const unitText = baseUnit.trim() || unitDraft.trim();
                emitPackagingChange(unitText, n);
              }
            }}
            onFocus={() => {
              qtyFocusedRef.current = true;
            }}
            onBlur={() => {
              qtyFocusedRef.current = false;
              if (unitDraft.trim() && !baseUnit.trim()) {
                commitUnit();
              }
            }}
            onKeyDown={(e) => e.stopPropagation()}
            disabled={disabled}
            data-keyboard-nav="skip"
            aria-label={`${label} quantity per pack`}
          />
        ) : null}
        <div
          ref={unitWrapRef}
          className={styles.factorUnitWrap}
          data-keyboard-nav="skip"
        >
          <input
            ref={unitInputRef}
            id={id}
            type="text"
            className={styles.factorInput}
            value={unitDraft}
            onChange={(e) => {
              setUnitDraft(e.target.value);
              openList();
            }}
            onFocus={() => {
              unitFocusedRef.current = true;
              openList();
            }}
            onBlur={() => {
              unitFocusedRef.current = false;
              window.setTimeout(() => {
                if (!unitWrapRef.current?.contains(document.activeElement)) {
                  setListOpen(false);
                  commitUnit();
                }
              }, 120);
            }}
            onKeyDown={onUnitKeyDown}
            disabled={disabled}
            placeholder="Unit (e.g. TBS)"
            autoComplete="off"
            aria-label={`${label} unit`}
            aria-expanded={listOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            role="combobox"
            required={required}
          />
          <button
            type="button"
            className={styles.factorUnitToggle}
            tabIndex={-1}
            disabled={disabled || packagingUnits.length === 0}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (listOpen) {
                setListOpen(false);
              } else {
                openList();
                unitInputRef.current?.focus();
              }
            }}
            aria-label="Show unit list"
          >
            ▾
          </button>
          {listOpen && filteredUnits.length > 0 ? (
            <ul
              id={listboxId}
              className={`${styles.unitDropdown} ${styles.unitDropdownFloating}`}
              style={dropdownStyle}
              data-packaging-unit-dropdown
              role="listbox"
            >
              {filteredUnits.map((u, i) => (
                <li
                  key={u.uqc}
                  role="option"
                  aria-selected={i === highlightIdx}
                  className={
                    i === highlightIdx
                      ? `${styles.unitDropdownItem} ${styles.unitDropdownItemActive}`
                      : styles.unitDropdownItem
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlightIdx(i)}
                  onClick={() => selectUnit(u)}
                >
                  {formatUnitOption(u)}
                </li>
              ))}
            </ul>
          ) : null}
          {listOpen &&
          filteredUnits.length === 0 &&
          packagingUnits.length > 0 ? (
            <div
              className={`${styles.unitDropdownEmpty} ${styles.unitDropdownFloating}`}
              style={dropdownStyle}
              data-packaging-unit-dropdown
            >
              No matching units
            </div>
          ) : null}
        </div>
      </div>
      {hint ? <span className={styles.unitHint}>{hint}</span> : null}
    </div>
  );
}
