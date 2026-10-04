import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBlocker } from 'react-router';
import { Copy, RotateCcw } from 'lucide-react';
import { ApiError } from '@inventory-platform/api-client';
import { useNotify } from '@inventory-platform/session';
import {
  Alert,
  Badge,
  Box,
  Button,
  CenteredLoader,
  Inline,
  SegmentedControl,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import {
  useCardFieldCatalogQuery,
  useCardLayoutDefaultsMutation,
  useCardLayoutsQuery,
  useSaveCardLayoutMutation,
} from '../../queries/cardLayout.queries';
import type {
  CardBlankValueBehavior,
  CardFieldCatalogResponse,
  CardLayoutSpec,
  CardLayoutsResponse,
  CardVariant,
} from '../../model/cardLayout.types';
import {
  EMPTY_SPEC,
  addSection,
  buildSampleItem,
  countFields,
  draftFromResponse,
  draftMapsEqual,
  draftsFromResponses,
  enabledKeys,
  groupCatalogFields,
  joinRowWithPrevious,
  moveFieldToSection,
  moveRow,
  moveSection,
  prepareSaveRequest,
  prune,
  removeField,
  removeSection,
  resolveDraftLocally,
  splitRow,
  toggleField,
  updateField,
  updateOptions,
  updateSection,
  variantsEqual,
  type DraftMap,
} from './cardLayoutDraft';
import { CardFieldPicker } from './CardFieldPicker';
import { CardLayoutPreview } from './CardLayoutPreview';
import { FieldInspector, locate } from './FieldInspector';
import { LayoutBuilder } from './LayoutBuilder';

const UNSAVED_PROMPT = 'You have unsaved product card changes. Leave without saving?';

const VARIANT_OPTIONS = [
  { value: 'REGULAR' as CardVariant, label: 'Regular' },
  { value: 'BASIC' as CardVariant, label: 'Basic' },
];

const BLANK_OPTIONS = [
  { value: 'HIDE_LINE' as CardBlankValueBehavior, label: 'Hide empty' },
  { value: 'SHOW_DASH' as CardBlankValueBehavior, label: 'Show —' },
];

function saveErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const fieldErrors = err.errors ? Object.values(err.errors).flat() : [];
    return fieldErrors.join('; ') || err.message || 'Could not save the card layout';
  }
  return err instanceof Error && err.message ? err.message : 'Could not save the card layout';
}

/**
 * The "Product cards" Profile tab (configurable-product-card Req 9). Loads the card field catalog
 * and every surface's layout, then hands both to the editor. Either load failing shows one error
 * with a retry that refetches both.
 */
export function ProductCardLayoutSection() {
  const catalogQuery = useCardFieldCatalogQuery();
  const layoutsQuery = useCardLayoutsQuery();

  if (catalogQuery.isError || layoutsQuery.isError) {
    return (
      <Alert variant="danger">
        <Inline gap="sm" align="center" justify="between">
          <Text as="span">Could not load the product card settings.</Text>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              void catalogQuery.refetch();
              void layoutsQuery.refetch();
            }}
          >
            Retry
          </Button>
        </Inline>
      </Alert>
    );
  }
  if (!catalogQuery.data || !layoutsQuery.data) {
    return <CenteredLoader />;
  }
  return <SurfaceLayoutEditor catalog={catalogQuery.data} layouts={layoutsQuery.data} />;
}

interface SurfaceLayoutEditorProps {
  catalog: CardFieldCatalogResponse;
  layouts: CardLayoutsResponse;
}

/** Per-surface, per-variant UI selection that is not part of the saved layout. */
interface Selection {
  sectionId: string | null;
  fieldKey: string | null;
}

function SurfaceLayoutEditor({ catalog, layouts }: SurfaceLayoutEditorProps) {
  const surfaces = layouts.surfaces;
  const [surfaceId, setSurfaceId] = useState(surfaces[0]?.surfaceId ?? '');
  const [variant, setVariant] = useState<CardVariant>('REGULAR');
  const [selection, setSelection] = useState<Record<string, Selection>>({});
  const [drafts, setDrafts] = useState<DraftMap>(() => draftsFromResponses(surfaces, catalog));
  const [saved, setSaved] = useState<DraftMap>(() => draftsFromResponses(surfaces, catalog));
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveMutation = useSaveCardLayoutMutation();
  const defaultsMutation = useCardLayoutDefaultsMutation();

  const surface = surfaces.find((s) => s.surfaceId === surfaceId) ?? surfaces[0];
  const surfaceInfo = catalog.surfaces.find((s) => s.surfaceId === surface?.surfaceId);
  const activeVariant: CardVariant = surface?.billingModeAware ? variant : 'REGULAR';
  const sid = surface?.surfaceId ?? '';
  const selKey = `${sid}:${activeVariant}`;
  const spec: CardLayoutSpec = drafts[sid]?.[activeVariant] ?? EMPTY_SPEC;
  const limits = catalog.limits;

  const dirtyAny = !draftMapsEqual(drafts, saved);
  const dirtyThis = !variantsEqual(drafts[sid], saved[sid]);

  const groups = useMemo(() => groupCatalogFields(catalog), [catalog]);
  const catalogByKey = useMemo(() => new Map(catalog.fields.map((f) => [f.fieldKey, f])), [catalog]);
  const sample = useMemo(() => buildSampleItem(catalog), [catalog]);
  const sampleForVariant = useMemo(() => ({ ...sample, billingMode: activeVariant }), [sample, activeVariant]);
  const resolved = useMemo(() => resolveDraftLocally(spec, catalog, surfaceInfo), [spec, catalog, surfaceInfo]);

  const fieldCount = countFields(spec);
  const atLimit = fieldCount >= limits.maxFieldsTotal;

  const current = selection[selKey] ?? { sectionId: null, fieldKey: null };
  const targetSectionId =
    (current.sectionId && spec.sections.some((s) => s.id === current.sectionId) ? current.sectionId : null) ??
    spec.sections[spec.sections.length - 1]?.id ??
    null;
  const selectedFieldKey = current.fieldKey && locate(spec, current.fieldKey) ? current.fieldKey : null;

  const select = useCallback(
    (patch: Partial<Selection>) =>
      setSelection((prev) => ({ ...prev, [selKey]: { ...(prev[selKey] ?? { sectionId: null, fieldKey: null }), ...patch } })),
    [selKey],
  );

  // ---- unsaved guard (Req 9.11) --------------------------------------------------------------
  const blocker = useBlocker(dirtyAny);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(UNSAVED_PROMPT)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  useEffect(() => {
    if (!dirtyAny) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirtyAny]);

  // ---- edits -----------------------------------------------------------------------------------
  const edit = useCallback(
    (fn: (s: CardLayoutSpec) => CardLayoutSpec) => {
      if (!surface) return;
      setDrafts((prev) => {
        const cur = prev[surface.surfaceId]?.[activeVariant] ?? EMPTY_SPEC;
        const next = fn(cur);
        if (next === cur) return prev;
        return { ...prev, [surface.surfaceId]: { ...prev[surface.surfaceId], [activeVariant]: next } };
      });
      setSaveError(null);
    },
    [surface, activeVariant],
  );

  const handleToggle = (key: string, on: boolean) => {
    edit((s) => toggleField(s, key, on, targetSectionId, limits));
    // Selecting the field just added makes the inspector follow the user's last action.
    select({ fieldKey: on ? key : current.fieldKey === key ? null : current.fieldKey });
  };

  const handleSave = () => {
    if (!surface || saveMutation.isPending) return;
    const variants = drafts[surface.surfaceId] ?? {};
    const pruned: Partial<Record<CardVariant, CardLayoutSpec>> = {};
    (Object.keys(variants) as CardVariant[]).forEach((v) => {
      const s = variants[v];
      if (s) pruned[v] = prune(s);
    });
    setSaveError(null);
    saveMutation.mutate(
      { surfaceId: surface.surfaceId, request: prepareSaveRequest(pruned) },
      {
        onSuccess: (result) => {
          const next = draftFromResponse(result, catalog);
          setSaved((prev) => ({ ...prev, [surface.surfaceId]: next }));
          setDrafts((prev) => ({ ...prev, [surface.surfaceId]: next }));
          useNotify.success(`${surface.label} card layout saved`);
        },
        onError: (err) => setSaveError(saveErrorMessage(err)),
      },
    );
  };

  const handleReset = async () => {
    if (!surface) return;
    try {
      const result = await defaultsMutation.mutateAsync(surface.surfaceId);
      setDrafts((prev) => ({ ...prev, [surface.surfaceId]: draftFromResponse(result, catalog) }));
      setSaveError(null);
    } catch (err) {
      useNotify.error(err instanceof Error && err.message ? err.message : 'Could not load the default layout');
    }
  };

  const handleCopyFromOther = () => {
    if (!surface?.billingModeAware) return;
    const other: CardVariant = activeVariant === 'REGULAR' ? 'BASIC' : 'REGULAR';
    const source = drafts[surface.surfaceId]?.[other];
    if (!source) return;
    edit(() => JSON.parse(JSON.stringify(source)) as CardLayoutSpec);
  };

  if (!surface) {
    return <Alert variant="info">No card surfaces are available for this shop.</Alert>;
  }

  const busy = saveMutation.isPending || defaultsMutation.isPending;
  const otherVariantLabel = activeVariant === 'REGULAR' ? 'Basic' : 'Regular';
  const surfaceOptions = surfaces.map((s) => ({
    value: s.surfaceId,
    label: variantsEqual(drafts[s.surfaceId], saved[s.surfaceId]) ? s.label : `${s.label} •`,
  }));

  return (
    <Box className={surfaceChrome.invoiceSettingsCard}>
      <Box className={surfaceChrome.invoiceSettingsHeader}>
        <Box className={surfaceChrome.invoiceSettingsHeaderText}>
          <Inline gap="sm" align="center">
            <Text as="h2" className={surfaceChrome.invoiceSettingsTitle}>
              Product cards
            </Text>
            {dirtyAny ? <Badge variant="warning">Unsaved changes</Badge> : null}
          </Inline>
          <Text as="p" className={surfaceChrome.invoiceSettingsSubtitle}>
            Pick the details a card shows, arrange them into lines and sections, and make the
            important ones stand out. The preview on the right is live.
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
          {surface.billingModeAware ? (
            <Button
              type="button"
              variant="outline"
              leftIcon={<Copy size={14} />}
              onClick={handleCopyFromOther}
              disabled={busy}
            >
              Copy from {otherVariantLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="solid"
            onClick={handleSave}
            disabled={busy || !dirtyThis}
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
      {!catalog.verticalSchemaLoaded ? (
        <Alert variant="info" className={surfaceChrome.invoiceSettingsAlert}>
          Vertical-specific fields could not be loaded right now; they are not listed.
        </Alert>
      ) : null}

      <Box className={surfaceChrome.cardBuilderToolbar}>
        {surfaces.length > 1 ? (
          <Box className={surfaceChrome.cardBuilderToolbarGroup}>
            <Text variant="caption" color="secondary">
              Card
            </Text>
            <SegmentedControl
              value={surface.surfaceId}
              options={surfaceOptions}
              onChange={(id) => {
                setSurfaceId(id);
                setSaveError(null);
              }}
            />
          </Box>
        ) : (
          <Text weight="semibold">{surface.label}</Text>
        )}
        {surface.billingModeAware ? (
          <Box className={surfaceChrome.cardBuilderToolbarGroup}>
            <Text variant="caption" color="secondary">
              Billing mode
            </Text>
            <SegmentedControl value={activeVariant} options={VARIANT_OPTIONS} onChange={setVariant} />
          </Box>
        ) : null}
        <Box className={surfaceChrome.cardBuilderToolbarGroup}>
          <Text variant="caption" color="secondary">
            Empty values
          </Text>
          <SegmentedControl
            value={spec.options.blankValueBehavior}
            options={BLANK_OPTIONS}
            onChange={(v) => edit((s) => updateOptions(s, { blankValueBehavior: v }))}
          />
        </Box>
      </Box>

      <Box className={surfaceChrome.cardBuilderLayout}>
        <Box className={surfaceChrome.cardBuilderColumn}>
          <Box className={surfaceChrome.cardBuilderColumnHead}>
            <Text as="p" className={surfaceChrome.profileSectionLabel}>
              Fields
            </Text>
            <Text variant="caption" color="secondary">
              {`${fieldCount} / ${limits.maxFieldsTotal}`}
            </Text>
          </Box>
          <CardFieldPicker
            groups={groups}
            enabledKeys={enabledKeys(spec)}
            excludedKeys={surfaceInfo?.excludedFieldKeys ?? []}
            atLimit={atLimit}
            maxFields={limits.maxFieldsTotal}
            onToggle={handleToggle}
          />
        </Box>

        <Box className={surfaceChrome.cardBuilderMain}>
          <Box className={surfaceChrome.cardBuilderColumnHead}>
            <Text as="p" className={surfaceChrome.profileSectionLabel}>
              Layout
            </Text>
            <Text variant="caption" color="secondary">
              Click a field to edit it
            </Text>
          </Box>
          <LayoutBuilder
            spec={spec}
            catalogByKey={catalogByKey}
            limits={limits}
            targetSectionId={targetSectionId}
            selectedFieldKey={selectedFieldKey}
            onSelectSection={(id) => select({ sectionId: id })}
            onSelectField={(key) => select({ fieldKey: key })}
            onAddSection={() =>
              edit((s) => {
                const next = addSection(s, limits);
                const added = next.sections[next.sections.length - 1];
                if (next !== s && added) select({ sectionId: added.id });
                return next;
              })
            }
            onRemoveSection={(id) => edit((s) => removeSection(s, id))}
            onMoveSection={(i, dir) => edit((s) => moveSection(s, i, dir))}
            onUpdateSection={(id, patch) => edit((s) => updateSection(s, id, patch, limits))}
            onMoveRow={(id, i, dir) => edit((s) => moveRow(s, id, i, dir))}
            onJoinRow={(id, i) => edit((s) => joinRowWithPrevious(s, id, i, limits))}
            onSplitRow={(id, i) => edit((s) => splitRow(s, id, i, limits))}
            options={spec.options}
            descriptionUnavailable={surfaceInfo?.excludedFieldKeys.includes('description') ?? false}
            onUpdateOptions={(patch) => edit((s) => updateOptions(s, patch))}
          />
          {selectedFieldKey ? (
            <FieldInspector
              spec={spec}
              fieldKey={selectedFieldKey}
              catalogField={catalogByKey.get(selectedFieldKey)}
              limits={limits}
              onUpdate={(patch) => edit((s) => updateField(s, selectedFieldKey, patch, limits))}
              onMoveToSection={(to) => edit((s) => moveFieldToSection(s, selectedFieldKey, to, limits))}
              onRemove={() => {
                edit((s) => removeField(s, selectedFieldKey));
                select({ fieldKey: null });
              }}
              onClose={() => select({ fieldKey: null })}
            />
          ) : null}
        </Box>

        <Box className={surfaceChrome.invoiceSettingsPreview}>
          <Box className={surfaceChrome.cardBuilderPreviewSticky}>
            <CardLayoutPreview surfaceId={surface.surfaceId} item={sampleForVariant} layout={resolved} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
