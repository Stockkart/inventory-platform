import { useEffect, useMemo, useState } from 'react';
import { useBlocker } from 'react-router';
import { Printer, RotateCcw } from 'lucide-react';
import { ApiError } from '@inventory-platform/api-client';
import { useNotify } from '@inventory-platform/session';
import {
  Alert,
  Badge,
  Box,
  Button,
  CenteredLoader,
  Inline,
  Stack,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import {
  useLabelFieldCatalogQuery,
  useLabelLayoutDefaultsMutation,
  useLabelLayoutQuery,
  useSaveLabelLayoutMutation,
} from '../../queries/labelLayout.queries.js';
import { openBarcodeLabelPrintWindow } from '../../lib/printBarcodeLabels.js';
import type { FieldCatalogResponse, LabelLayoutResponse, LabelZone } from '../../model/labelLayout.types.js';
import {
  buildSampleLabelData,
  compatibleSheetPresets,
  draftFromLayout,
  draftsEqual,
  dropFieldMaps,
  groupCatalogFields,
  maxLinesFor,
  moveField,
  prepareSaveRequest,
  stickerSizeSpecFor,
  toEffectiveLayout,
  unavailableKeys,
  zoneCapsFor,
  zoneCounts,
  zoneOverflow,
  type LabelLayoutDraft,
} from './labelLayoutDraft.js';
import { LayoutOptionsPanel } from './LayoutOptionsPanel.js';
import { FieldToggleGroups } from './FieldToggleGroups.js';
import { EnabledFieldOrderList, type EnabledFieldOrderItem } from './EnabledFieldOrderList.js';
import { LabelPreview } from './LabelPreview.js';

const UNSAVED_PROMPT = 'You have unsaved barcode label layout changes. Leave without saving?';

function saveErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const fieldErrors = err.errors ? Object.values(err.errors).flat() : [];
    return fieldErrors.join('; ') || err.message || 'Could not save the layout';
  }
  return 'Could not save the layout';
}

const ZONE_LABELS: Record<LabelZone, string> = { HEADER: 'Header', LEFT: 'Left', RIGHT: 'Right' };

/** `"Header 1/1 · Left 3/4 · Right 2/2"` counter line for the COMPACT template (Req 11.10). */
function zoneCounterLine(counts: Record<LabelZone, number>, caps: ZoneCapsLike): string {
  return `Header ${counts.HEADER}/${caps.header} · Left ${counts.LEFT}/${caps.left} · Right ${counts.RIGHT}/${caps.right}`;
}

type ZoneCapsLike = { header: number; left: number; right: number };

/** Human-readable warning naming each over-cap zone, its assigned count and its cap. */
function zoneOverflowMessage(
  zones: LabelZone[],
  counts: Record<LabelZone, number> | null,
  caps: ZoneCapsLike,
  sizeLabel: string,
): string {
  if (!counts) return '';
  const capFor: Record<LabelZone, number> = { HEADER: caps.header, LEFT: caps.left, RIGHT: caps.right };
  const parts = zones.map((z) => `${ZONE_LABELS[z]} allows ${capFor[z]} on ${sizeLabel}, ${counts[z]} assigned`);
  return `Too many fields in a column: ${parts.join('; ')}. Move fields to another column or pick a larger sticker.`;
}

/**
 * Inner editor rendered once both the catalog and the saved layout are loaded.
 * Keeping it separate lets the draft state initialise synchronously from props
 * instead of via an effect, and remount cleanly on Retry.
 */
function LabelLayoutEditor({ catalog, layout }: { catalog: FieldCatalogResponse; layout: LabelLayoutResponse }) {
  const [draft, setDraft] = useState<LabelLayoutDraft>(() => draftFromLayout(layout));
  const [savedSnapshot, setSavedSnapshot] = useState<LabelLayoutDraft>(() => draftFromLayout(layout));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sheetResetNotice, setSheetResetNotice] = useState<string | null>(null);

  const saveMutation = useSaveLabelLayoutMutation();
  const defaultsMutation = useLabelLayoutDefaultsMutation();

  const dirty = !draftsEqual(draft, savedSnapshot);
  const compact = draft.template === 'COMPACT';
  const stackedMaxLines = maxLinesFor(draft.stickerSize, catalog);
  const enabledCount = draft.enabledFieldKeys.length;

  // Under COMPACT the per-zone caps replace the stacked single-line cap (Req 11.4):
  // the toggle limit becomes the sum of the three zone caps, and Save is gated on
  // zone overflow rather than the stacked `overLimit`.
  const zoneCaps = zoneCapsFor(draft, catalog);
  const compactToggleLimit = zoneCaps.header + zoneCaps.left + zoneCaps.right;
  const maxLines = compact ? compactToggleLimit : stackedMaxLines;
  const overLimit = compact ? false : enabledCount > stackedMaxLines;
  const atLimit = enabledCount >= maxLines;
  const overflowZones = useMemo(
    () => (compact ? zoneOverflow(draft, catalog, zoneCaps) : []),
    [compact, draft, catalog, zoneCaps],
  );
  const hasZoneOverflow = overflowZones.length > 0;
  const counts = useMemo(
    () => (compact ? zoneCounts(draft, catalog) : null),
    [compact, draft, catalog],
  );
  const saveBlocked = overLimit || hasZoneOverflow;
  const unavailable = useMemo(() => unavailableKeys(draft, catalog), [draft, catalog]);
  const effective = useMemo(() => toEffectiveLayout(draft, catalog), [draft, catalog]);
  const sample = useMemo(() => buildSampleLabelData(catalog), [catalog]);
  const groups = useMemo(() => groupCatalogFields(catalog), [catalog]);
  const sizeSpec = stickerSizeSpecFor(draft.stickerSize, catalog);
  const sizeLabel = `${sizeSpec.widthMm}x${sizeSpec.heightMm} mm`;
  const sheetPresets = useMemo(
    () => compatibleSheetPresets(catalog, draft.stickerSize),
    [catalog, draft.stickerSize],
  );

  const orderItems = useMemo<EnabledFieldOrderItem[]>(() => {
    const byKey = new Map(catalog.fields.map((f) => [f.fieldKey, f.label] as const));
    return draft.enabledFieldKeys.map((fieldKey) => {
      const label = byKey.get(fieldKey);
      return { fieldKey, label: label ?? fieldKey, unavailable: label === undefined };
    });
  }, [draft.enabledFieldKeys, catalog]);

  // Unsaved-changes guard: in-app navigation (data router) and tab close / reload.
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(UNSAVED_PROMPT)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const toggleLimitFor = (d: LabelLayoutDraft): number => {
    if (d.template !== 'COMPACT') return maxLinesFor(d.stickerSize, catalog);
    const caps = zoneCapsFor(d, catalog);
    return caps.header + caps.left + caps.right;
  };

  const handleToggle = (fieldKey: string, on: boolean) => {
    setDraft((prev) => {
      if (on) {
        if (prev.enabledFieldKeys.includes(fieldKey)) return prev;
        if (prev.enabledFieldKeys.length >= toggleLimitFor(prev)) return prev;
        return { ...prev, enabledFieldKeys: [...prev.enabledFieldKeys, fieldKey] };
      }
      // Turning a field off drops its COMPACT zone / label-mode entries (Req 11.5).
      const without = { ...prev, enabledFieldKeys: prev.enabledFieldKeys.filter((k) => k !== fieldKey) };
      return dropFieldMaps(without, fieldKey);
    });
  };

  const handleZoneChange = (fieldKey: string, zone: LabelZone) => {
    setDraft((prev) => ({ ...prev, fieldZones: { ...prev.fieldZones, [fieldKey]: zone } }));
  };

  const handleLabelModeChange = (fieldKey: string, override: boolean | undefined) => {
    setDraft((prev) => {
      const fieldLabelOverrides = { ...prev.fieldLabelOverrides };
      if (override === undefined) delete fieldLabelOverrides[fieldKey];
      else fieldLabelOverrides[fieldKey] = override;
      return { ...prev, fieldLabelOverrides };
    });
  };

  const handleRemove = (fieldKey: string) => handleToggle(fieldKey, false);

  const handleMove = (index: number, dir: 'up' | 'down') => {
    setDraft((prev) => ({ ...prev, enabledFieldKeys: moveField(prev.enabledFieldKeys, index, dir) }));
  };

  const handleOptionsChange = (patch: Partial<LabelLayoutDraft>) => {
    // Changing the sticker size can orphan a chosen sheet preset: if the current
    // SHEET preset no longer fits the new size, fall back to Roll and tell the
    // user why (Req 10.12).
    if (
      patch.stickerSize !== undefined &&
      patch.stickerSize !== draft.stickerSize &&
      draft.printMedia === 'SHEET' &&
      draft.sheetPreset
    ) {
      const stillCompatible = compatibleSheetPresets(catalog, patch.stickerSize).some(
        (p) => p.id === draft.sheetPreset,
      );
      if (!stillCompatible) {
        const presetLabel =
          catalog.sheetPresets?.find((p) => p.id === draft.sheetPreset)?.label ?? draft.sheetPreset;
        setSheetResetNotice(
          `Print on was reset to Roll because ${presetLabel} doesn't fit ${patch.stickerSize} stickers.`,
        );
        setDraft((prev) => ({ ...prev, ...patch, printMedia: 'ROLL', sheetPreset: null }));
        return;
      }
    }
    // Any explicit print-on change clears a stale reset notice.
    if (patch.printMedia !== undefined) setSheetResetNotice(null);
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    if (saveBlocked || saveMutation.isPending) return;
    setSaveError(null);
    saveMutation.mutate(prepareSaveRequest(draft, catalog), {
      onSuccess: (result) => {
        const next = draftFromLayout(result);
        setSavedSnapshot(next);
        setDraft(next);
        useNotify.success('Barcode label layout saved');
      },
      onError: (err) => {
        setSaveError(saveErrorMessage(err));
      },
    });
  };

  const handleReset = async () => {
    try {
      const result = await defaultsMutation.mutateAsync();
      setDraft(draftFromLayout(result));
      setSaveError(null);
      setSheetResetNotice(null);
    } catch (err) {
      useNotify.error(err instanceof Error && err.message ? err.message : 'Could not load the default layout');
    }
  };

  const handlePrintTest = () => {
    try {
      openBarcodeLabelPrintWindow([sample], effective);
    } catch (err) {
      useNotify.error(err instanceof Error && err.message ? err.message : 'Could not open the print window');
    }
  };

  const busy = saveMutation.isPending || defaultsMutation.isPending;
  const effectiveFieldNames = effective.enabledFields.map((f) => f.label);

  return (
    <Box className={surfaceChrome.invoiceSettingsCard}>
      <Box className={surfaceChrome.invoiceSettingsHeader}>
        <Box className={surfaceChrome.invoiceSettingsHeaderText}>
          <Inline gap="sm" align="center">
            <Text as="h2" className={surfaceChrome.invoiceSettingsTitle}>
              Barcode label layout
            </Text>
            {dirty ? <Badge variant="warning">Unsaved changes</Badge> : null}
          </Inline>
          <Text as="p" className={surfaceChrome.invoiceSettingsSubtitle}>
            Choose which fields print on each sticker, their order and the sticker size. The preview on
            the right updates live and matches what the printer produces.
          </Text>
        </Box>
        <Box className={surfaceChrome.invoiceSettingsHeaderActions}>
          <Button
            type="button"
            variant="outline"
            leftIcon={<RotateCcw size={14} />}
            onClick={() => void handleReset()}
            disabled={busy}
            loading={defaultsMutation.isPending}
          >
            Reset to defaults
          </Button>
          <Button
            type="button"
            variant="outline"
            leftIcon={<Printer size={14} />}
            onClick={handlePrintTest}
            disabled={busy}
          >
            Print test sticker
          </Button>
          <Button
            type="button"
            variant="solid"
            onClick={handleSave}
            disabled={busy || saveBlocked}
            loading={saveMutation.isPending}
          >
            Save
          </Button>
        </Box>
      </Box>

      {saveError ? (
        <Alert variant="danger" className={surfaceChrome.invoiceSettingsAlert}>
          {saveError}
        </Alert>
      ) : null}

      {overLimit ? (
        <Alert variant="warning" className={surfaceChrome.invoiceSettingsAlert}>
          Sticker {sizeLabel} allows at most {maxLines} lines; {enabledCount} enabled. Remove fields or pick a
          larger sticker.
        </Alert>
      ) : null}

      {compact && hasZoneOverflow ? (
        <Alert variant="warning" className={surfaceChrome.invoiceSettingsAlert}>
          {zoneOverflowMessage(overflowZones, counts, zoneCaps, sizeLabel)}
        </Alert>
      ) : null}

      <Box className={surfaceChrome.invoiceSettingsLayout}>
        <Box className={surfaceChrome.invoiceSettingsControls}>
          {sheetResetNotice ? (
            <Alert variant="info" className={surfaceChrome.invoiceSettingsAlert}>
              <Inline gap="sm" align="center" justify="between">
                <Text as="span">{sheetResetNotice}</Text>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSheetResetNotice(null)}
                >
                  Dismiss
                </Button>
              </Inline>
            </Alert>
          ) : null}

          <LayoutOptionsPanel
            stickerSize={draft.stickerSize}
            stickerSizes={catalog.stickerSizes}
            showBarcodeText={draft.showBarcodeText}
            showFieldLabels={draft.showFieldLabels}
            blankValueBehavior={draft.blankValueBehavior}
            printMedia={draft.printMedia}
            sheetPreset={draft.sheetPreset}
            sheetPresets={sheetPresets}
            template={draft.template}
            barcodePosition={draft.barcodePosition}
            currencyStyle={draft.currencyStyle}
            templates={catalog.templates}
            onChange={handleOptionsChange}
          />

          <FieldToggleGroups
            groups={groups}
            enabledKeys={draft.enabledFieldKeys}
            shopType={catalog.shopType}
            atLimit={atLimit}
            maxLines={maxLines}
            onToggle={handleToggle}
          />

          <Box className={surfaceChrome.invoiceSettingsBlock}>
            <Text as="p" className={surfaceChrome.profileSectionLabel}>
              Print order
            </Text>
            {compact && counts ? (
              <Text
                as="p"
                variant="caption"
                color={hasZoneOverflow ? 'danger' : 'secondary'}
                className={surfaceChrome.invoiceToggleHint}
              >
                {zoneCounterLine(counts, zoneCaps)}
              </Text>
            ) : null}
            {unavailable.length > 0 ? (
              <Text as="p" variant="caption" color="secondary" className={surfaceChrome.invoiceToggleHint}>
                Fields marked “No longer available” are skipped on print and dropped when you save.
              </Text>
            ) : null}
            <EnabledFieldOrderList
              items={orderItems}
              onMove={handleMove}
              onRemove={handleRemove}
              template={draft.template}
              fieldZones={draft.fieldZones}
              fieldLabelOverrides={draft.fieldLabelOverrides}
              onZoneChange={handleZoneChange}
              onLabelModeChange={handleLabelModeChange}
            />
          </Box>

          <Box className={surfaceChrome.invoiceSettingsFooterBar}>
            <Text variant="caption" color="secondary">
              Changes apply to new prints after you save.
            </Text>
            <Button type="button" variant="solid" onClick={handleSave} disabled={busy || saveBlocked}>
              {saveMutation.isPending ? 'Saving…' : 'Save layout'}
            </Button>
          </Box>
        </Box>

        <Box className={surfaceChrome.invoiceSettingsPreview}>
          <Stack gap="sm">
            <LabelPreview label={sample} layout={effective} />
            <Text as="p" variant="caption" color="secondary" className={surfaceChrome.invoicePreviewHint}>
              {sizeLabel} ·{' '}
              {effectiveFieldNames.length > 0 ? effectiveFieldNames.join(', ') : 'No fields enabled'}
            </Text>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Profile → "Barcode labels" tab. Loads the field catalog and the saved layout,
 * then hands both to the editor. Either load failing shows a single error with
 * Retry; the editor (and therefore Save / Reset / Print test) is not rendered
 * until both succeed.
 */
export function BarcodeLabelLayoutSection() {
  const catalogQuery = useLabelFieldCatalogQuery();
  const layoutQuery = useLabelLayoutQuery();

  const retry = () => {
    void catalogQuery.refetch();
    void layoutQuery.refetch();
  };

  if (catalogQuery.isError || layoutQuery.isError) {
    const retrying = catalogQuery.isFetching || layoutQuery.isFetching;
    return (
      <Box className={surfaceChrome.invoiceSettingsCard}>
        <Box className={surfaceChrome.invoiceSettingsHeader}>
          <Box className={surfaceChrome.invoiceSettingsHeaderText}>
            <Text as="h2" className={surfaceChrome.invoiceSettingsTitle}>
              Barcode label layout
            </Text>
          </Box>
          <Box className={surfaceChrome.invoiceSettingsHeaderActions}>
            <Button type="button" variant="outline" disabled>
              Reset to defaults
            </Button>
            <Button type="button" variant="outline" disabled>
              Print test sticker
            </Button>
            <Button type="button" variant="solid" disabled>
              Save
            </Button>
          </Box>
        </Box>
        <Alert variant="danger" className={surfaceChrome.invoiceSettingsAlert}>
          <Inline gap="sm" align="center" justify="between">
            <Text as="span">Could not load the barcode label layout.</Text>
            <Button type="button" size="sm" variant="outline" onClick={retry} loading={retrying}>
              Retry
            </Button>
          </Inline>
        </Alert>
      </Box>
    );
  }

  if (!catalogQuery.data || !layoutQuery.data) {
    return (
      <Box className={surfaceChrome.invoiceSettingsCard}>
        <CenteredLoader label="Loading barcode label layout…" />
      </Box>
    );
  }

  return <LabelLayoutEditor catalog={catalogQuery.data} layout={layoutQuery.data} />;
}
