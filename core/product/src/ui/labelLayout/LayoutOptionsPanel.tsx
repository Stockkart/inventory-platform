import {
  Box,
  FormField,
  Input,
  Select,
  Switch,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import type {
  BarcodePosition,
  BlankValueBehavior,
  CurrencyStyle,
  PrintMedia,
  SheetPreset,
  StickerSize,
  StickerSizeSpec,
  StickerTemplate,
  TemplateInfo,
} from '../../model/labelLayout.types.js';
import {
  ROLL_COLUMN_GAP_MAX_MM,
  ROLL_LABELS_ACROSS_MAX,
  ROLL_LABELS_ACROSS_MIN,
} from '../../model/labelLayout.types.js';
import { clampColumnGap, clampLabelsAcross, type LabelLayoutDraft } from './labelLayoutDraft.js';

export interface LayoutOptionsPanelProps {
  stickerSize: StickerSize;
  stickerSizes: StickerSizeSpec[];
  showBarcodeText: boolean;
  showFieldLabels: boolean;
  blankValueBehavior: BlankValueBehavior;
  /** Current print medium (Req 10). */
  printMedia: PrintMedia;
  /** Chosen Sheet_Preset id when `printMedia` is `SHEET`; `null` otherwise. */
  sheetPreset: string | null;
  /** Sheet presets compatible with `stickerSize`, already filtered by the caller. */
  sheetPresets: SheetPreset[];
  /** Labels side by side on the roll; shown only while `printMedia` is `ROLL`. */
  rollLabelsAcross: number;
  /** Gap between neighbouring roll labels in millimetres; shown only for `ROLL`. */
  rollColumnGapMm: number;
  /** Resolved web width for the current roll setup, for the hint line. */
  rollPageWidthMm?: number;
  /** Current sticker template (Req 11). */
  template: StickerTemplate;
  /** Barcode band position for `COMPACT` (Req 11). */
  barcodePosition: BarcodePosition;
  /** Currency prefix style (Req 11). */
  currencyStyle: CurrencyStyle;
  /** Templates from the Field_Catalog (Req 11); falls back to the built-in labels. */
  templates?: TemplateInfo[];
  onChange(patch: Partial<LabelLayoutDraft>): void;
}

const BLANK_BEHAVIOR_OPTIONS: ReadonlyArray<{ value: BlankValueBehavior; label: string }> = [
  { value: 'HIDE_LINE', label: 'Hide the line' },
  { value: 'PRINT_BLANK', label: 'Keep an empty line' },
];

/** Fallback template labels used when the catalog does not carry a `templates` list. */
const FALLBACK_TEMPLATE_OPTIONS: ReadonlyArray<{ value: StickerTemplate; label: string }> = [
  { value: 'STACKED', label: 'Stacked' },
  { value: 'COMPACT', label: 'Compact (two columns)' },
];

const BARCODE_POSITION_OPTIONS: ReadonlyArray<{ value: BarcodePosition; label: string }> = [
  { value: 'TOP', label: 'Top' },
  { value: 'BOTTOM', label: 'Bottom' },
];

const CURRENCY_STYLE_OPTIONS: ReadonlyArray<{ value: CurrencyStyle; label: string }> = [
  { value: 'RUPEE_SYMBOL', label: '₹ symbol' },
  { value: 'RS_PREFIX', label: 'Rs. prefix' },
];

const PRINT_ON_ROLL = 'ROLL';

const LABELS_ACROSS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = Array.from(
  { length: ROLL_LABELS_ACROSS_MAX - ROLL_LABELS_ACROSS_MIN + 1 },
  (_, i) => {
    const n = ROLL_LABELS_ACROSS_MIN + i;
    return { value: String(n), label: n === 1 ? '1 (single column)' : `${n} side by side` };
  },
);

export function stickerSizeOptionLabel(spec: StickerSizeSpec): string {
  return `${spec.widthMm}x${spec.heightMm} mm · up to ${spec.maxLines} lines`;
}

/** `"Letter · 65 per sheet (5 × 13)"` for the Print-on option list. */
export function sheetPresetOptionLabel(preset: SheetPreset, stickerSize: StickerSize): string {
  const grid = preset.perStickerSize[stickerSize];
  if (!grid) return preset.label;
  return `${preset.label} · ${grid.perSheet} per sheet (${grid.columns} × ${grid.rows})`;
}

/**
 * Sticker size, barcode text, field label prefix and blank-value behaviour
 * controls. Presentational only: emits a partial draft patch via `onChange`.
 */
export function LayoutOptionsPanel({
  stickerSize,
  stickerSizes,
  showBarcodeText,
  showFieldLabels,
  blankValueBehavior,
  printMedia,
  sheetPreset,
  sheetPresets,
  rollLabelsAcross,
  rollColumnGapMm,
  rollPageWidthMm,
  template,
  barcodePosition,
  currencyStyle,
  templates,
  onChange,
}: LayoutOptionsPanelProps) {
  const sizeOptions = stickerSizes.map((spec) => ({
    value: spec.size,
    label: stickerSizeOptionLabel(spec),
  }));

  const templateOptions =
    templates && templates.length > 0
      ? templates.map((t) => ({ value: t.id, label: t.label }))
      : FALLBACK_TEMPLATE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
  const isCompact = template === 'COMPACT';

  const selectedPreset =
    printMedia === 'SHEET' && sheetPreset
      ? sheetPresets.find((p) => p.id === sheetPreset)
      : undefined;
  // When the chosen preset is not in the compatible list (e.g. just before a size
  // change resets it), fall back to showing Roll so the Select stays controlled.
  const printOnValue = selectedPreset ? selectedPreset.id : PRINT_ON_ROLL;
  const printOnOptions = [
    { value: PRINT_ON_ROLL, label: 'Roll (continuous labels)' },
    ...sheetPresets.map((preset) => ({
      value: preset.id,
      label: sheetPresetOptionLabel(preset, stickerSize),
    })),
  ];
  const selectedGrid = selectedPreset?.perStickerSize[stickerSize];

  const handlePrintOnChange = (value: string) => {
    if (value === PRINT_ON_ROLL) {
      onChange({ printMedia: 'ROLL', sheetPreset: null });
    } else {
      onChange({ printMedia: 'SHEET', sheetPreset: value });
    }
  };

  return (
    <Box className={surfaceChrome.invoiceSettingsBlock}>
      <Text as="p" className={surfaceChrome.profileSectionLabel}>
        Sticker options
      </Text>

      <FormField label="Template" htmlFor="label-layout-template">
        <Select
          id="label-layout-template"
          value={template}
          options={templateOptions}
          onChange={(e) => onChange({ template: e.target.value as StickerTemplate })}
        />
      </FormField>

      <FormField label="Sticker size" htmlFor="label-layout-sticker-size">
        <Select
          id="label-layout-sticker-size"
          value={stickerSize}
          options={sizeOptions}
          onChange={(e) => onChange({ stickerSize: e.target.value as StickerSize })}
        />
      </FormField>

      <FormField label="Print on" htmlFor="label-layout-print-on">
        <Select
          id="label-layout-print-on"
          value={printOnValue}
          options={printOnOptions}
          onChange={(e) => handlePrintOnChange(e.target.value)}
        />
      </FormField>

      {selectedPreset && selectedGrid ? (
        <Text
          as="p"
          variant="caption"
          color="secondary"
          className={surfaceChrome.invoiceToggleHint}
        >
          {selectedGrid.perSheet} per sheet ({selectedGrid.columns} × {selectedGrid.rows}) ·{' '}
          {selectedPreset.pageWidthMm}×{selectedPreset.pageHeightMm} mm page
        </Text>
      ) : null}

      {printMedia === 'ROLL' ? (
        <>
          <FormField
            label="Labels across the roll"
            htmlFor="label-layout-roll-across"
            hint="How many stickers sit side by side on one row of the roll"
          >
            <Select
              id="label-layout-roll-across"
              value={String(clampLabelsAcross(rollLabelsAcross))}
              options={LABELS_ACROSS_OPTIONS}
              onChange={(e) =>
                onChange({ rollLabelsAcross: clampLabelsAcross(Number(e.target.value)) })
              }
            />
          </FormField>

          {rollLabelsAcross > 1 ? (
            <FormField
              label="Gap between columns (mm)"
              htmlFor="label-layout-roll-gap"
              hint="Measure the liner between two neighbouring stickers"
            >
              <Input
                id="label-layout-roll-gap"
                type="number"
                min={0}
                max={ROLL_COLUMN_GAP_MAX_MM}
                step={0.5}
                value={rollColumnGapMm}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  onChange({ rollColumnGapMm: clampColumnGap(Number.isFinite(next) ? next : 0) });
                }}
              />
            </FormField>
          ) : null}

          {rollPageWidthMm !== undefined ? (
            <Text
              as="p"
              variant="caption"
              color="secondary"
              className={surfaceChrome.invoiceToggleHint}
            >
              Each print row is {rollPageWidthMm} mm wide. Set the printer driver's label width to
              the same value.
            </Text>
          ) : null}
        </>
      ) : null}

      <FormField label="Barcode position" htmlFor="label-layout-barcode-position">
        <Select
          id="label-layout-barcode-position"
          value={barcodePosition}
          options={BARCODE_POSITION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          onChange={(e) => onChange({ barcodePosition: e.target.value as BarcodePosition })}
        />
      </FormField>

      <FormField label="Currency style" htmlFor="label-layout-currency-style">
        <Select
          id="label-layout-currency-style"
          value={currencyStyle}
          options={CURRENCY_STYLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          onChange={(e) => onChange({ currencyStyle: e.target.value as CurrencyStyle })}
        />
      </FormField>

      <Box className={surfaceChrome.invoiceToggleGrid}>
        <Switch
          id="label-layout-show-barcode-text"
          className={surfaceChrome.invoiceToggleItem}
          label="Print barcode text"
          checked={showBarcodeText}
          onChange={(e) => onChange({ showBarcodeText: e.target.checked })}
        />
        <Switch
          id="label-layout-show-field-labels"
          className={surfaceChrome.invoiceToggleItem}
          label="Prefix values with field labels"
          checked={showFieldLabels}
          onChange={(e) => onChange({ showFieldLabels: e.target.checked })}
        />
      </Box>
      {isCompact ? (
        <Text
          as="p"
          variant="caption"
          color="secondary"
          className={surfaceChrome.invoiceToggleHint}
        >
          Applies to Stacked; Compact uses per-field label modes.
        </Text>
      ) : null}

      <FormField label="When a value is blank" htmlFor="label-layout-blank-behavior">
        <Select
          id="label-layout-blank-behavior"
          value={blankValueBehavior}
          options={BLANK_BEHAVIOR_OPTIONS}
          onChange={(e) => onChange({ blankValueBehavior: e.target.value as BlankValueBehavior })}
        />
      </FormField>
    </Box>
  );
}
