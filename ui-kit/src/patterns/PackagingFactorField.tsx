import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Box } from '../layout/Box';
import { Inline } from '../layout/Stack';
import { Text } from '../layout/Text';
import { Button } from '../forms/Button';
import { FormField } from '../forms/FormField';
import { IconButton } from '../forms/IconButton';
import { Input } from '../forms/Input';
import { Stack } from '../layout/Stack';
import styles from './PackagingFactorField.module.css';

export type PackagingUnitOption = {
  uqc: string;
  label: string;
};

/** Map free-text or datalist selection to a UQC code (catalog or legacy). */
export function resolvePackagingUqc(
  raw: string | null | undefined,
  catalog: PackagingUnitOption[],
): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  const byUqc = catalog.find((u) => u.uqc === upper);
  if (byUqc) return byUqc.uqc;
  const byFull = catalog.find((u) => formatUnitOption(u).toUpperCase() === upper);
  if (byFull) return byFull.uqc;
  const byLabel = catalog.find((u) => (u.label ?? '').toUpperCase() === upper);
  if (byLabel) return byLabel.uqc;
  const codePart = trimmed.split(/[—–-]/)[0]?.trim().toUpperCase();
  if (codePart && catalog.some((u) => u.uqc === codePart)) {
    return codePart;
  }
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  return upper;
}

function formatUnitOption(u: PackagingUnitOption): string {
  const code = u.uqc ?? '';
  const label = u.label ?? '';
  return label ? `${code} — ${label}` : code;
}

function displayUnitValue(uqc: string | null | undefined, catalog: PackagingUnitOption[]): string {
  const code = (uqc ?? '').trim();
  if (!code) return '';
  const upper = code.toUpperCase();
  const def = catalog.find((u) => u.uqc === upper);
  return def ? formatUnitOption(def) : code;
}

function filterPackagingUnits(
  catalog: PackagingUnitOption[],
  query: string | null | undefined,
): PackagingUnitOption[] {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return catalog;
  return catalog.filter((u) => {
    const code = (u.uqc ?? '').toLowerCase();
    const label = (u.label ?? '').toLowerCase();
    return code.includes(q) || label.includes(q) || formatUnitOption(u).toLowerCase().includes(q);
  });
}

/** unitsPerPack stored on product; 0 means "1 × unit" with no pack conversion. */
export function packagingFactorForDisplay(unitsPerPack: number | undefined): number {
  const n = Number(unitsPerPack) || 0;
  return n > 0 ? n : 1;
}

export function packagingFactorToUnitsPerPack(
  factor: number,
  _unitDef?: PackagingUnitOption,
): number {
  const n = Math.floor(Number(factor)) || 0;
  if (n <= 1) return 0;
  return n;
}

export type PackagingFactorFieldProps = {
  label?: string;
  hint?: string;
  packagingUnits: PackagingUnitOption[];
  baseUnit: string;
  /** Displayed number after "1 ×" (1 = single base unit, 50 = 50 per pack). */
  factor: number;
  onChange: (baseUnit: string, factor: number) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  compact?: boolean;
};

/** Single field: fixed {@code 1 ×} then quantity and unit (e.g. {@code 1 × 50 TBS}). */
export function PackagingFactorField({
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
}: PackagingFactorFieldProps) {
  const [unitDraft, setUnitDraft] = useState(() => displayUnitValue(baseUnit, packagingUnits));
  const [listOpen, setListOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const unitWrapRef = useRef<HTMLDivElement>(null);
  const unitInputRef = useRef<HTMLInputElement>(null);
  const unitFocusedRef = useRef(false);
  const qtyFocusedRef = useRef(false);
  const lastSyncedBaseUnitRef = useRef(baseUnit);
  const [qtyDraft, setQtyDraft] = useState(() => String(Math.max(1, factor)));

  const resolvedFactorFromDraft = (): number => {
    if (qtyDraft.trim() === '') return Math.max(1, factor);
    const n = parseInt(qtyDraft, 10);
    return !isNaN(n) && n > 0 ? n : Math.max(1, factor);
  };

  useEffect(() => {
    if (qtyFocusedRef.current) return;
    setQtyDraft(String(Math.max(1, factor)));
  }, [factor]);

  useEffect(() => {
    if (unitFocusedRef.current) return;
    if (baseUnit === lastSyncedBaseUnitRef.current) return;
    lastSyncedBaseUnitRef.current = baseUnit;
    setUnitDraft(displayUnitValue(baseUnit, packagingUnits));
  }, [baseUnit, packagingUnits]);

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

  const filteredUnits = useMemo(() => {
    const catalog = Array.isArray(packagingUnits) ? packagingUnits : [];
    return filterPackagingUnits(catalog, unitDraft);
  }, [packagingUnits, unitDraft]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [unitDraft, listOpen]);

  useEffect(() => {
    if (!listOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (unitWrapRef.current && !unitWrapRef.current.contains(e.target as Node)) {
        setListOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [listOpen]);

  const commitUnit = (raw?: string) => {
    const text = (raw ?? unitDraft).trim();
    if (!text) {
      lastSyncedBaseUnitRef.current = '';
      onChange('', resolvedFactorFromDraft());
      setUnitDraft('');
      setListOpen(false);
      return;
    }
    const resolved = resolvePackagingUqc(text, packagingUnits);
    const nextFactor = resolvedFactorFromDraft();
    lastSyncedBaseUnitRef.current = resolved;
    onChange(resolved, nextFactor);
    setUnitDraft(displayUnitValue(resolved, packagingUnits));
    setQtyDraft(String(Math.max(1, nextFactor)));
    setListOpen(false);
  };

  const selectUnit = (u: PackagingUnitOption) => {
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
        filteredUnits.length === 0 ? 0 : Math.min(i + 1, filteredUnits.length - 1),
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

  const fieldContent = (
    <Box className={wrapClass}>
      <Inline align="center" className={styles.factorLeadGroup}>
        <Text className={styles.factorPrefix}>1 ×</Text>
        <Input
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
              onChange(baseUnit, n);
            }
          }}
          onFocus={() => {
            qtyFocusedRef.current = true;
          }}
          onBlur={() => {
            qtyFocusedRef.current = false;
            if (qtyDraft.trim() === '') {
              setQtyDraft('1');
              onChange(baseUnit, 1);
            }
          }}
          onKeyDown={(e) => e.stopPropagation()}
          disabled={disabled}
          data-keyboard-nav="skip"
          aria-label={`${label} quantity per pack`}
        />
      </Inline>
      <Box
        ref={unitWrapRef}
        className={styles.factorUnitWrap}
        data-keyboard-nav="skip"
        position="relative"
      >
        <Input
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
        <IconButton
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
          label="Show unit list"
        >
          ▾
        </IconButton>
        {listOpen && filteredUnits.length > 0 ? (
          <Stack id={listboxId} className={styles.unitDropdown} role="listbox" gap="none">
            {filteredUnits.map((u, i) => (
              <Button
                key={u.uqc}
                type="button"
                role="option"
                aria-selected={i === highlightIdx}
                variant="ghost"
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
              </Button>
            ))}
          </Stack>
        ) : null}
        {listOpen && filteredUnits.length === 0 && packagingUnits.length > 0 ? (
          <Text className={styles.unitDropdownEmpty}>No matching units</Text>
        ) : null}
      </Box>
    </Box>
  );

  if (label || hint) {
    return (
      <FormField
        label={label}
        id={id}
        htmlFor={id}
        required={required}
        hint={hint}
        className={styles.formGroup}
      >
        {fieldContent}
      </FormField>
    );
  }

  return <Box className={styles.formGroupBare}>{fieldContent}</Box>;
}
