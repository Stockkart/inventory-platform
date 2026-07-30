import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Checkbox,
  FormField,
  Icon,
  Inline,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableLoadingRow,
  TableRow,
  Text,
  productChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import { Barcode, Link2, Printer, RefreshCw, Wand2 } from 'lucide-react';
import { barcodesApi } from '../api/barcodes.api';
import { productApi } from '../api/product.api';
import { PrintBarcodeLabelsModal } from '../ui/PrintBarcodeLabelsModal';
import type { BarcodePoolItem, ProductSuggestion } from '../model/types';

export function meta() {
  return [
    { title: 'Barcodes | StockKart' },
    {
      name: 'description',
      content: 'Generate barcodes, print stickers, and attach codes to products',
    },
  ];
}

export function BarcodesPage() {
  const { success: notifySuccess, error: notifyError } = useNotify;
  const [error, setError] = useState<string | null>(null);

  const [poolItems, setPoolItems] = useState<BarcodePoolItem[]>([]);
  const [poolStatus, setPoolStatus] = useState<'ALL' | 'UNUSED' | 'ATTACHED'>('ALL');
  const [poolQuery, setPoolQuery] = useState('');
  const [generateCount, setGenerateCount] = useState('10');
  const [batchId, setBatchId] = useState('');
  const [isLoadingPool, setIsLoadingPool] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [printCodes, setPrintCodes] = useState<string[] | null>(null);

  const [attachCode, setAttachCode] = useState<string | null>(null);
  const [attachQuery, setAttachQuery] = useState('');
  const [attachSuggestions, setAttachSuggestions] = useState<ProductSuggestion[]>([]);
  const [attachProduct, setAttachProduct] = useState<ProductSuggestion | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);

  const loadPool = useCallback(async () => {
    setIsLoadingPool(true);
    setError(null);
    try {
      const items = await barcodesApi.list({
        ...(poolStatus !== 'ALL' ? { status: poolStatus } : {}),
        ...(poolQuery.trim() ? { q: poolQuery.trim() } : {}),
        limit: 200,
      });
      setPoolItems(items);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load barcodes';
      setError(message);
      notifyError(message);
    } finally {
      setIsLoadingPool(false);
    }
  }, [notifyError, poolQuery, poolStatus]);

  useEffect(() => {
    void loadPool();
  }, [loadPool]);

  const handleGeneratePool = async () => {
    const count = Number.parseInt(generateCount, 10);
    if (!Number.isFinite(count) || count < 1) {
      notifyError('Enter how many barcodes to generate');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await barcodesApi.generate({
        count,
        ...(batchId.trim() ? { batchId: batchId.trim() } : {}),
      });
      notifySuccess(`Generated ${result.items.length} barcode(s)`);
      setSelectedCodes(new Set(result.items.map((i) => i.code)));
      await loadPool();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to generate barcodes');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleAllVisible = () => {
    if (poolItems.length === 0) return;
    const allSelected = poolItems.every((i) => selectedCodes.has(i.code));
    if (allSelected) {
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        poolItems.forEach((i) => next.delete(i.code));
        return next;
      });
    } else {
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        poolItems.forEach((i) => next.add(i.code));
        return next;
      });
    }
  };

  const handlePrintSelected = () => {
    const codes = [...selectedCodes];
    if (codes.length === 0) {
      notifyError('Select at least one barcode');
      return;
    }
    setPrintCodes(codes);
  };

  const resetAttachModal = () => {
    setAttachCode(null);
    setAttachQuery('');
    setAttachSuggestions([]);
    setAttachProduct(null);
  };

  const closeAttachModal = () => {
    if (isAttaching) return;
    resetAttachModal();
  };

  const searchAttachProducts = async (q: string) => {
    setAttachQuery(q);
    setAttachProduct(null);
    if (q.trim().length < 2) {
      setAttachSuggestions([]);
      return;
    }
    try {
      setAttachSuggestions(await productApi.suggest(q.trim()));
    } catch {
      setAttachSuggestions([]);
    }
  };

  const handleAttach = async () => {
    if (!attachCode || !attachProduct) return;
    setIsAttaching(true);
    try {
      await barcodesApi.attach(attachCode, { productId: attachProduct.id });
      notifySuccess(`Attached ${attachCode} to ${attachProduct.name}`);
      resetAttachModal();
      await loadPool();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to attach barcode');
    } finally {
      setIsAttaching(false);
    }
  };

  const allVisibleSelected =
    poolItems.length > 0 && poolItems.every((i) => selectedCodes.has(i.code));

  return (
    <Stack gap="md" maxWidth="xl" mx="auto">
      <PageHeader description="Generate shop barcodes, print stickers, and attach codes to products. Stock-in stays on Product Entry." />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Stack gap="md">
        <Card>
          <CardBody>
            <Stack gap="md">
              <Stack gap="xs">
                <Text variant="heading3" weight="semibold">
                  Create a batch
                </Text>
                <Text color="secondary" variant="caption">
                  Print stickers now, attach each code to a product later.
                </Text>
              </Stack>

              <Inline gap="sm" align="end" flexWrap className={productChrome.historyFiltersBar}>
                <Box className={productChrome.historyFilterField} style={{ maxWidth: 120 }}>
                  <FormField label="How many" htmlFor="generate-count">
                    <Input
                      id="generate-count"
                      type="number"
                      min={1}
                      max={500}
                      value={generateCount}
                      onChange={(e) => setGenerateCount(e.target.value)}
                      disabled={isGenerating}
                    />
                  </FormField>
                </Box>
                <Box
                  className={productChrome.historyFilterField}
                  style={{ minWidth: 180, flex: 1 }}
                >
                  <FormField label="Batch name" htmlFor="batch-id">
                    <Input
                      id="batch-id"
                      type="text"
                      placeholder="Optional, e.g. Shelf A"
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      disabled={isGenerating}
                    />
                  </FormField>
                </Box>
                <Button
                  type="button"
                  variant="solid"
                  loading={isGenerating}
                  leftIcon={<Icon icon={Wand2} size="sm" />}
                  onClick={() => void handleGeneratePool()}
                >
                  Generate
                </Button>
              </Inline>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stack gap="md">
              <Inline gap="sm" align="end" justify="between" flexWrap>
                <Inline gap="sm" align="end" flexWrap flex="1">
                  <Box style={{ minWidth: 140 }}>
                    <FormField label="Status" htmlFor="pool-status">
                      <Select
                        id="pool-status"
                        value={poolStatus}
                        onChange={(e) =>
                          setPoolStatus(e.target.value as 'ALL' | 'UNUSED' | 'ATTACHED')
                        }
                        options={[
                          { value: 'ALL', label: 'All' },
                          { value: 'UNUSED', label: 'Unused' },
                          { value: 'ATTACHED', label: 'Attached' },
                        ]}
                      />
                    </FormField>
                  </Box>
                  <Box style={{ flex: 1, minWidth: 200 }}>
                    <FormField label="Search">
                      <SearchInput
                        value={poolQuery}
                        onChange={setPoolQuery}
                        onSearch={() => void loadPool()}
                        showSearchButton
                        buttonVariant="solid"
                        placeholder="Code or label"
                      />
                    </FormField>
                  </Box>
                  <Button
                    type="button"
                    variant="outline"
                    leftIcon={<Icon icon={RefreshCw} size="sm" />}
                    onClick={() => void loadPool()}
                  >
                    Refresh
                  </Button>
                </Inline>
                <Button
                  type="button"
                  variant="outline"
                  disabled={selectedCodes.size === 0}
                  leftIcon={<Icon icon={Printer} size="sm" />}
                  onClick={handlePrintSelected}
                >
                  Print selected ({selectedCodes.size})
                </Button>
              </Inline>

              <Box overflow="auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>
                        <Checkbox
                          label="Select all"
                          checked={allVisibleSelected}
                          onChange={toggleAllVisible}
                          disabled={poolItems.length === 0}
                        />
                      </TableHeaderCell>
                      <TableHeaderCell>Code</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Label</TableHeaderCell>
                      <TableHeaderCell>Batch</TableHeaderCell>
                      <TableHeaderCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoadingPool ? (
                      <TableLoadingRow colSpan={6} label="Loading barcodes…" />
                    ) : poolItems.length === 0 ? (
                      <TableEmptyRow
                        colSpan={6}
                        message="No barcodes yet. Generate a batch above."
                      />
                    ) : (
                      poolItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              label="Select"
                              checked={selectedCodes.has(item.code)}
                              onChange={() => toggleCode(item.code)}
                            />
                          </TableCell>
                          <TableCell>
                            <Inline gap="xs" align="center">
                              <Icon icon={Barcode} size="sm" />
                              <Text as="span" weight="medium">
                                {item.code}
                              </Text>
                            </Inline>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.status === 'UNUSED' ? 'warning' : 'success'}>
                              {item.status === 'UNUSED' ? 'Unused' : 'Attached'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {[item.labelName, item.labelCompany].filter(Boolean).join(' · ') || '—'}
                          </TableCell>
                          <TableCell>{item.batchId?.trim() || '—'}</TableCell>
                          <TableCell>
                            <Inline gap="xs" justify="end">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                leftIcon={<Icon icon={Printer} size="sm" />}
                                onClick={() => setPrintCodes([item.code])}
                              >
                                Print
                              </Button>
                              {item.status === 'UNUSED' ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  leftIcon={<Icon icon={Link2} size="sm" />}
                                  onClick={() => {
                                    setAttachCode(item.code);
                                    setAttachQuery('');
                                    setAttachSuggestions([]);
                                    setAttachProduct(null);
                                  }}
                                >
                                  Attach
                                </Button>
                              ) : null}
                            </Inline>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          </CardBody>
        </Card>
      </Stack>

      <Modal
        open={attachCode != null}
        onClose={isAttaching ? undefined : closeAttachModal}
        size="md"
      >
        <Modal.Header title="Attach barcode" onClose={isAttaching ? undefined : closeAttachModal} />
        <Modal.Body>
          <Stack gap="md">
            <Box>
              <Text color="secondary" variant="caption">
                Barcode
              </Text>
              <Inline gap="sm" align="center">
                <Icon icon={Barcode} size="sm" />
                <Text weight="semibold">{attachCode}</Text>
              </Inline>
            </Box>

            <FormField
              label="Find product"
              hint="Type at least 2 characters, then choose a product below."
            >
              <SearchInput
                value={attachQuery}
                onChange={(q) => void searchAttachProducts(q)}
                placeholder="Search by product name"
                disabled={isAttaching}
              />
            </FormField>

            {attachProduct ? (
              <Box padding="sm" border rounded="lg" bg="muted">
                <Text variant="caption" color="secondary">
                  Selected product
                </Text>
                <Text weight="semibold">{attachProduct.name}</Text>
                <Text variant="caption" color="secondary">
                  {[attachProduct.companyName, attachProduct.barcode].filter(Boolean).join(' · ') ||
                    'No barcode yet — this code will be set'}
                </Text>
              </Box>
            ) : null}

            {attachSuggestions.length > 0 ? (
              <Box>
                <Text variant="caption" color="secondary" style={{ marginBottom: 6 }}>
                  Results — click one to select
                </Text>
                <Box
                  className={productChrome.typeaheadMenu}
                  style={{
                    position: 'relative',
                    top: 'auto',
                    left: 'auto',
                    width: '100%',
                    maxWidth: '100%',
                    maxHeight: 240,
                    boxShadow: 'none',
                  }}
                  role="listbox"
                  aria-label="Product search results"
                >
                  {attachSuggestions.map((s) => {
                    const selected = attachProduct?.id === s.id;
                    return (
                      <Box
                        key={s.id}
                        as="button"
                        role="option"
                        aria-selected={selected}
                        className={productChrome.typeaheadItem}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (!isAttaching) setAttachProduct(s);
                        }}
                        style={
                          selected
                            ? {
                                background:
                                  'color-mix(in srgb, var(--sk-color-brand, #1e3a5f) 10%, white)',
                              }
                            : undefined
                        }
                      >
                        <Text as="span" className={productChrome.typeaheadItemName}>
                          {s.name}
                        </Text>
                        <Box className={productChrome.typeaheadItemMeta}>
                          <Text as="span" className={productChrome.typeaheadItemMetaText}>
                            {[s.companyName, s.barcode].filter(Boolean).join(' · ') ||
                              'No barcode yet'}
                          </Text>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ) : attachQuery.trim().length >= 2 ? (
              <Text color="secondary" variant="caption">
                No products match that search.
              </Text>
            ) : (
              <Text color="secondary" variant="caption">
                Search for the product this sticker belongs to.
              </Text>
            )}
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline" disabled={isAttaching} onClick={closeAttachModal}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="solid"
            loading={isAttaching}
            disabled={!attachProduct}
            leftIcon={<Icon icon={Link2} size="sm" />}
            onClick={() => void handleAttach()}
          >
            Attach to product
          </Button>
        </Modal.Footer>
      </Modal>

      <PrintBarcodeLabelsModal
        isOpen={printCodes != null && printCodes.length > 0}
        onClose={() => setPrintCodes(null)}
        codes={printCodes ?? undefined}
        onError={(message) => notifyError(message)}
      />
    </Stack>
  );
}
