import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { FileText, Maximize2, Minimize2, Printer, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNotify } from '@inventory-platform/session';
import {
  Alert,
  Box,
  Button,
  CenteredLoader,
  FormField,
  Inline,
  Spinner,
  Stack,
  Switch,
  Text,
  Textarea,
  cn,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { shopsApi } from '../api/shops.api';
import {
  INVOICE_FIELD_TOGGLES,
  type InvoiceBillingModePreview,
  type InvoiceFieldVisibility,
  type InvoicePrinterType,
  type InvoiceSettingsResponse,
} from '@inventory-platform/user/types';

const PREVIEW_DEBOUNCE_MS = 400;

/** Focus target after toggling — see applyPreviewExpanded for why this matters. */
const PREVIEW_EXPAND_BUTTON_ID = 'invoice-preview-expand';
const HINT_VISIBLE_MS = 5000;

/** Each hint is offered once, ever. Clear these keys to see them again. */
const HINT_SEEN_ENTER = 'sk.invoicePreview.hintEnterSeen';
const HINT_SEEN_EXIT = 'sk.invoicePreview.hintExitSeen';

/** localStorage throws in private mode and sandboxed frames; a storage failure
 *  must never take the expand toggle down with it. */
function hintSeen(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function markHintSeen(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* storage unavailable — the hint simply offers itself again next time */
  }
}

const PRINTER_OPTIONS: Array<{
  value: InvoicePrinterType;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    value: 'NORMAL',
    title: 'Normal',
    description: 'A4 laser / inkjet',
    icon: FileText,
  },
  {
    value: 'DOT_MATRIX',
    title: 'Dot matrix',
    description: 'Compact A4',
    icon: Printer,
  },
  {
    value: 'THERMAL_3INCH',
    title: 'Thermal',
    description: '75mm receipt',
    icon: Receipt,
  },
];

const GROUP_LABELS: Record<(typeof INVOICE_FIELD_TOGGLES)[number]['group'], string> = {
  parties: 'Parties',
  money: 'Totals',
  columns: 'Line columns',
  footer: 'Footer',
};

function cloneFields(fields: InvoiceFieldVisibility): InvoiceFieldVisibility {
  return { ...fields };
}

/** Soften iframe preview so thermal/A4 sit cleanly on the paper sheet. */
function wrapPreviewHtml(html: string, printerType: InvoicePrinterType): string {
  const isThermal = printerType === 'THERMAL_3INCH';
  const previewCss = isThermal
    ? `
      html { background: #fff; }
      body {
        margin: 10px auto !important;
        padding: 0 4px !important;
        width: 74mm !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
    `
    : `
      html, body { background: #fff; }
      body { margin: 12px !important; box-sizing: border-box !important; }
    `;
  const styleTag = `<style id="sk-invoice-preview">${previewCss}</style>`;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${styleTag}</head>`);
  }
  return `${styleTag}${html}`;
}

function paperClassForPrinter(printerType: InvoicePrinterType): string {
  if (printerType === 'THERMAL_3INCH') {
    return cn(surfaceChrome.invoicePreviewPaper, surfaceChrome.invoicePreviewPaperThermal);
  }
  if (printerType === 'DOT_MATRIX') {
    return cn(surfaceChrome.invoicePreviewPaper, surfaceChrome.invoicePreviewPaperDotMatrix);
  }
  return surfaceChrome.invoicePreviewPaper;
}

export function InvoiceSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { success: notifySuccess, error: notifyError } = useNotify;

  const [defaultPrinterType, setDefaultPrinterType] = useState<InvoicePrinterType>('NORMAL');
  const [footerNote, setFooterNote] = useState('');
  const [regularFields, setRegularFields] = useState<InvoiceFieldVisibility | null>(null);
  const [basicFields, setBasicFields] = useState<InvoiceFieldVisibility | null>(null);
  const [editMode, setEditMode] = useState<InvoiceBillingModePreview>('REGULAR');

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewSeq = useRef(0);

  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [shortcutHint, setShortcutHint] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterHintOffered = useRef(false);

  const applySettings = (data: InvoiceSettingsResponse) => {
    setDefaultPrinterType(data.defaultPrinterType);
    setFooterNote(data.footerNote ?? '');
    setRegularFields(cloneFields(data.regularFields));
    setBasicFields(cloneFields(data.basicFields));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await shopsApi.getInvoiceSettings();
        if (!cancelled) applySettings(data);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load invoice settings');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshPreview = useEffectEvent(async () => {
    if (!regularFields || !basicFields) return;
    const seq = ++previewSeq.current;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const html = await shopsApi.previewInvoiceSettings({
        defaultPrinterType,
        footerNote,
        regularFields,
        basicFields,
        previewBillingMode: editMode,
        previewPrinterType: defaultPrinterType,
      });
      if (seq !== previewSeq.current) return;
      setPreviewHtml(wrapPreviewHtml(html, defaultPrinterType));
    } catch (err) {
      if (seq !== previewSeq.current) return;
      setPreviewError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      if (seq === previewSeq.current) setPreviewLoading(false);
    }
  });

  useEffect(() => {
    if (!regularFields || !basicFields) return;
    const timer = window.setTimeout(() => {
      void refreshPreview();
    }, PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [defaultPrinterType, footerNote, regularFields, basicFields, editMode]);

  const clearHint = () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = null;
    setShortcutHint(null);
  };

  const showHint = (text: string) => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setShortcutHint(text);
    hintTimer.current = setTimeout(() => setShortcutHint(null), HINT_VISIBLE_MS);
  };

  /** Single source of truth — the Expand button and Escape both route through here. */
  const applyPreviewExpanded = (next: boolean) => {
    setPreviewExpanded(next);

    if (next) {
      markHintSeen(HINT_SEEN_ENTER);
      if (hintSeen(HINT_SEEN_EXIT)) clearHint();
      else showHint('again to exit full screen');
    } else {
      markHintSeen(HINT_SEEN_EXIT);
      clearHint();
    }

    // Pull focus out of the preview iframe and onto the button. Key events fired
    // inside an iframe never reach this document, so without this the next
    // Escape is swallowed by the preview once the user has clicked into it.
    requestAnimationFrame(() => {
      document.getElementById(PREVIEW_EXPAND_BUTTON_ID)?.focus();
    });
  };

  const togglePreviewExpanded = useEffectEvent(() => {
    applyPreviewExpanded(!previewExpanded);
  });

  const offerEnterHint = useEffectEvent(() => {
    if (enterHintOffered.current) return;
    enterHintOffered.current = true;
    if (!hintSeen(HINT_SEEN_ENTER)) showHint('to expand the preview');
  });

  // Bound once; useEffectEvent keeps the handler reading current state without
  // detaching and reattaching the listener on every toggle.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // While the app is in real browser fullscreen, Escape belongs to the browser
      // for leaving it. Collapsing the preview at the same moment would make one
      // keypress do two things.
      if (document.fullscreenElement) return;
      event.preventDefault();
      togglePreviewExpanded();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Lock background scroll while expanded; restores on collapse and on unmount.
  useEffect(() => {
    if (!previewExpanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [previewExpanded]);

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  // Offer the shortcut once the first preview has actually rendered.
  useEffect(() => {
    if (!previewHtml) return;
    offerEnterHint();
  }, [previewHtml]);

  const activeFields = editMode === 'REGULAR' ? regularFields : basicFields;
  const setActiveFields = editMode === 'REGULAR' ? setRegularFields : setBasicFields;

  const handleToggle = (key: keyof InvoiceFieldVisibility, checked: boolean) => {
    setActiveFields((prev) => (prev ? { ...prev, [key]: checked } : prev));
  };

  const handleSave = async () => {
    if (!regularFields || !basicFields) return;
    setSaving(true);
    try {
      const updated = await shopsApi.updateInvoiceSettings({
        defaultPrinterType,
        footerNote,
        regularFields,
        basicFields,
      });
      applySettings(updated);
      const printer =
        PRINTER_OPTIONS.find((o) => o.value === updated.defaultPrinterType)?.title ??
        updated.defaultPrinterType;
      notifySuccess(`Invoice settings saved · Default printer: ${printer}`);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to save invoice settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box className={surfaceChrome.invoiceSettingsCard}>
        <CenteredLoader label="Loading invoice settings…" />
      </Box>
    );
  }

  if (loadError || !regularFields || !basicFields || !activeFields) {
    return (
      <Box className={surfaceChrome.invoiceSettingsCard}>
        <Box className={surfaceChrome.invoiceSettingsHeader}>
          <Alert variant="danger">{loadError ?? 'Invoice settings unavailable'}</Alert>
        </Box>
      </Box>
    );
  }

  const groups = (['parties', 'money', 'columns', 'footer'] as const).map((group) => ({
    group,
    label: GROUP_LABELS[group],
    toggles: INVOICE_FIELD_TOGGLES.filter((t) => t.group === group),
  }));

  const modeLabel = editMode === 'REGULAR' ? 'Tax invoice' : 'Estimate';
  const printerLabel =
    PRINTER_OPTIONS.find((o) => o.value === defaultPrinterType)?.title ?? defaultPrinterType;

  const handlePreviewFrameLoad = (frame: HTMLIFrameElement | null) => {
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc?.documentElement) return;
      const height = Math.max(
        doc.documentElement.scrollHeight,
        doc.body?.scrollHeight ?? 0,
        defaultPrinterType === 'THERMAL_3INCH' ? 320 : 480,
      );
      frame.style.height = `${height + 8}px`;
    } catch {
      // Sandbox / cross-origin — keep CSS fallback height
    }
  };

  return (
    <Box className={surfaceChrome.invoiceSettingsCard}>
      <Box className={surfaceChrome.invoiceSettingsHeader}>
        <Box className={surfaceChrome.invoiceSettingsHeaderText}>
          <Text as="h2" className={surfaceChrome.invoiceSettingsTitle}>
            Invoice settings
          </Text>
          <Text as="p" className={surfaceChrome.invoiceSettingsSubtitle}>
            Choose the default printer shops use when printing, then tune which fields appear.
            Preview updates live on the right.
          </Text>
        </Box>
        <Box className={surfaceChrome.invoiceSettingsHeaderActions}>
          <Box as="span" className={surfaceChrome.invoiceDefaultBadge}>
            Default printer
            <Text as="span" className={surfaceChrome.invoiceDefaultBadgeStrong}>
              {printerLabel}
            </Text>
          </Box>
          <Button type="button" variant="solid" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Box>
      </Box>

      <Box className={surfaceChrome.invoiceSettingsLayout}>
        <Box className={surfaceChrome.invoiceSettingsControls}>
          <Box className={surfaceChrome.invoiceSettingsBlock}>
            <Text as="p" className={surfaceChrome.profileSectionLabel}>
              Default printer
            </Text>
            <Box
              className={surfaceChrome.invoiceTemplateRow}
              role="radiogroup"
              aria-label="Default printer type"
            >
              {PRINTER_OPTIONS.map((option) => {
                const selected = defaultPrinterType === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant="ghost"
                    role="radio"
                    aria-checked={selected}
                    disabled={saving}
                    className={cn(
                      surfaceChrome.invoiceTemplateChip,
                      selected && surfaceChrome.invoiceTemplateChipSelected,
                    )}
                    onClick={() => setDefaultPrinterType(option.value)}
                  >
                    <Box className={surfaceChrome.invoiceTemplateChipMeta}>
                      <Box as="span" className={surfaceChrome.invoiceTemplateChipIcon} aria-hidden>
                        <option.icon size={16} strokeWidth={2.1} />
                      </Box>
                      {selected ? (
                        <Text as="span" className={surfaceChrome.invoiceTemplateChipDefaultTag}>
                          Default
                        </Text>
                      ) : null}
                    </Box>
                    <Text as="span" className={surfaceChrome.invoiceTemplateChipTitle}>
                      {option.title}
                    </Text>
                    <Text as="span" className={surfaceChrome.invoiceTemplateChipDesc}>
                      {option.description}
                    </Text>
                  </Button>
                );
              })}
            </Box>
          </Box>

          <Box className={surfaceChrome.invoiceSettingsBlock}>
            <Text as="p" className={surfaceChrome.profileSectionLabel}>
              Configure fields for
            </Text>
            <Box className={surfaceChrome.invoiceModeSeg} role="tablist" aria-label="Invoice type">
              <Button
                type="button"
                size="sm"
                role="tab"
                aria-selected={editMode === 'REGULAR'}
                variant={editMode === 'REGULAR' ? 'solid' : 'ghost'}
                className={surfaceChrome.invoiceModeSegBtn}
                onClick={() => setEditMode('REGULAR')}
                disabled={saving}
              >
                Tax invoice
              </Button>
              <Button
                type="button"
                size="sm"
                role="tab"
                aria-selected={editMode === 'BASIC'}
                variant={editMode === 'BASIC' ? 'solid' : 'ghost'}
                className={surfaceChrome.invoiceModeSegBtn}
                onClick={() => setEditMode('BASIC')}
                disabled={saving}
              >
                Estimate
              </Button>
            </Box>
          </Box>

          <Box className={surfaceChrome.invoiceTogglePanel}>
            {groups.map(({ group, label, toggles }) => (
              <Box key={group} className={surfaceChrome.invoiceToggleGroup}>
                <Text as="p" className={surfaceChrome.profileSectionLabel}>
                  {label}
                </Text>
                <Box className={surfaceChrome.invoiceToggleGrid}>
                  {toggles.map((toggle) => (
                    <Switch
                      key={toggle.key}
                      className={surfaceChrome.invoiceToggleItem}
                      label={toggle.label}
                      checked={Boolean(activeFields[toggle.key])}
                      disabled={saving}
                      onChange={(e) => handleToggle(toggle.key, e.target.checked)}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>

          <FormField label="Footer note" htmlFor="invoice-footer-note">
            <Textarea
              id="invoice-footer-note"
              value={footerNote}
              disabled={saving}
              rows={2}
              placeholder="Optional note at the bottom of the invoice"
              onChange={(e) => {
                setFooterNote(e.target.value);
              }}
            />
          </FormField>

          <Box className={surfaceChrome.invoiceSettingsFooterBar}>
            <Text variant="caption" color="secondary">
              Changes apply to new prints after you save.
            </Text>
            <Button
              type="button"
              variant="solid"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </Box>
        </Box>

        <Box
          className={cn(
            surfaceChrome.invoiceSettingsPreview,
            previewExpanded && surfaceChrome.invoiceSettingsPreviewExpanded,
          )}
        >
          <Box className={surfaceChrome.invoiceSettingsPreviewToolbar}>
            <Stack gap="sm">
              <Text as="p" className={surfaceChrome.profileSectionLabel}>
                Live preview
              </Text>
              <Text variant="caption" color="secondary">
                {modeLabel} · {printerLabel}
              </Text>
            </Stack>
            <Inline gap="sm" align="center">
              {previewLoading ? (
                <Inline gap="sm" align="center">
                  <Spinner size="sm" />
                  <Text variant="caption" color="secondary">
                    Updating…
                  </Text>
                </Inline>
              ) : null}
              <Button
                id={PREVIEW_EXPAND_BUTTON_ID}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={previewExpanded}
                leftIcon={previewExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                onClick={() => applyPreviewExpanded(!previewExpanded)}
              >
                {previewExpanded ? 'Exit full screen' : 'Expand'}
              </Button>
            </Inline>
          </Box>

          {previewError ? <Alert variant="danger">{previewError}</Alert> : null}

          <Box className={surfaceChrome.invoicePreviewStage}>
            {previewHtml ? (
              <Box className={paperClassForPrinter(defaultPrinterType)}>
                <iframe
                  title="Invoice preview"
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin"
                  className={surfaceChrome.invoicePreviewFrame}
                  onLoad={(e) => handlePreviewFrameLoad(e.currentTarget)}
                />
                {previewLoading ? (
                  <Box className={surfaceChrome.invoicePreviewBusy} aria-hidden>
                    <Spinner size="sm" />
                    <Text variant="caption" color="secondary">
                      Updating…
                    </Text>
                  </Box>
                ) : null}
              </Box>
            ) : (
              <CenteredLoader label="Generating preview…" />
            )}
          </Box>

          <Text
            as="p"
            variant="caption"
            color="secondary"
            className={surfaceChrome.invoicePreviewHint}
          >
            {defaultPrinterType === 'THERMAL_3INCH'
              ? 'Shown as a 75mm receipt strip — same layout as thermal prints.'
              : 'Shown as print-sized paper — same template as checkout PDFs.'}
          </Text>

          {/* Always mounted so it can transition both in and out; inert while hidden. */}
          <Box
            role="status"
            aria-live="polite"
            className={cn(
              surfaceChrome.invoicePreviewShortcut,
              shortcutHint && surfaceChrome.invoicePreviewShortcutVisible,
            )}
          >
            {shortcutHint ? (
              <>
                Press <kbd>Esc</kbd> {shortcutHint}
              </>
            ) : null}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
