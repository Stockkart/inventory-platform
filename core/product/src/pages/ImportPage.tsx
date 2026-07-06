import { useState } from 'react';
import { useNavigate } from 'react-router';
import { inventoryApi } from '../api/inventory.api';
import { vendorsApi } from '@inventory-platform/user/vendors';
import type { BulkCreateInventoryDto, ParseInvoiceItem, BillingMode } from '@inventory-platform/product/types';
import type { Vendor } from '@inventory-platform/user/types';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Inline,
  Input,
  PageHeader,
  PaginationBar,
  SearchInput,
  Select,
  Spinner,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  type SelectOptionDef,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import styles from './import.module.css';

const BILLING_MODE_OPTIONS: readonly SelectOptionDef[] = [
  { value: 'REGULAR', label: 'REGULAR' },
  { value: 'BASIC', label: 'BASIC' },
];

export function meta() {
  return [
    { title: 'Import - StockKart' },
    {
      name: 'description',
      content: 'Import inventory from Excel stock snapshot',
    },
  ];
}

export function ImportPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [importTableItems, setImportTableItems] = useState<
    (ParseInvoiceItem & { id: string })[]
  >([]);
  const [importTablePage, setImportTablePage] = useState(0);
  const [editingCell, setEditingCell] = useState<{
    rowIdx: number;
    field: keyof ParseInvoiceItem;
  } | null>(null);
  const importTablePageSize = 50;
  const [billingMode, setBillingMode] = useState<BillingMode>('REGULAR');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [vendorSearchResults, setVendorSearchResults] = useState<Vendor[]>([]);
  const [_isSearchingVendor, setIsSearchingVendor] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const fileInputId = 'excel-file-input';
  const { success: notifySuccess, error: notifyError } = useNotify;

  const handleParseSheet = async () => {
    if (!selectedFile) {
      notifyError('Please select an Excel file');
      return;
    }
    setIsUploading(true);
    setUploadProgress('Uploading and parsing...');
    try {
      const response = await inventoryApi.parseStockSheet(selectedFile);
      if (response?.items?.length) {
        setImportTableItems(
          response.items.map((item) => ({
            ...item,
            id: `import-${Date.now()}-${Math.random()}`,
          }))
        );
        setImportTablePage(0);
        notifySuccess(
          `Parsed ${response.totalItems} items. Review and import below.`
        );
        setSelectedFile(null);
        setFileInputKey((k) => k + 1);
      } else {
        notifyError('No items found. Check file format and headers.');
      }
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to parse');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleCellChange = (
    index: number,
    field: keyof ParseInvoiceItem,
    value: string | number | null | undefined
  ) => {
    setImportTableItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const toBulkItem = (
    row: ParseInvoiceItem & { id: string }
  ): import('@inventory-platform/product/types').BulkCreateInventoryItem => {
    const loc = row.location?.trim() || '';
    const expiry = row.expiryDate?.trim()
      ? row.expiryDate.includes('T')
        ? row.expiryDate
        : `${String(row.expiryDate).trim().slice(0, 10)}T00:00:00Z`
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10) + 'T00:00:00Z';
    const verticalFields: Record<string, unknown> = { expiryDate: expiry };
    if (row.batchNo?.trim()) {
      verticalFields.batchNo = row.batchNo.trim();
    }
    return {
      ...(row.barcode?.trim() ? { barcode: row.barcode.trim() } : {}),
      name: row.name?.trim() || 'Unnamed',
      description: row.description || undefined,
      companyName: row.companyName?.trim() || '',
      maximumRetailPrice: Number(row.maximumRetailPrice) || 0,
      costPrice: Number(row.costPrice) || 0,
      priceToRetail: Number(row.priceToRetail) || 0,
      businessType: (row.businessType || 'PHARMACEUTICAL').toUpperCase(),
      location: loc,
      count: Number(row.count) || 1,
      baseUnit: 'BASE UNIT',
      unitConversions: { unit: 'SALE UNIT', factor: 1 },
      verticalFields,
      hsn: row.hsn || null,
      scheme: row.scheme ?? null,
      schemePayFor: row.schemePayFor ?? null,
      schemeFree: row.schemeFree ?? null,
      schemeType: (row.schemeType ??
        'FIXED_UNITS') as import('@inventory-platform/product/types').SchemeType,
      schemePercentage: row.schemePercentage ?? null,
      sgst: row.sgst || null,
      cgst: row.cgst || null,
      saleAdditionalDiscount: row.saleAdditionalDiscount ?? null,
      billingMode,
      ...(row.purchaseDate?.trim()
        ? {
            purchaseDate: row.purchaseDate.includes('T')
              ? row.purchaseDate.trim()
              : `${row.purchaseDate.trim().slice(0, 10)}T00:00:00Z`,
          }
        : {}),
    };
  };

  const handleImportSubmit = async () => {
    if (!selectedVendor?.vendorId) {
      notifyError('Please select a vendor.');
      return;
    }
    if (importTableItems.length === 0) {
      notifyError('No items to import.');
      return;
    }
    const invalid = importTableItems.filter(
      (r) => !r.name?.trim() || (Number(r.count) || 0) <= 0
    );
    if (invalid.length > 0) {
      notifyError(
        `${invalid.length} row(s) have missing name or invalid count. Fix or remove them.`
      );
      return;
    }
    setIsLoading(true);
    try {
      const items = importTableItems.map(toBulkItem);
      const bulkData: BulkCreateInventoryDto = {
        vendorId: selectedVendor.vendorId,
        items,
      };
      const response = await inventoryApi.createBulk(bulkData);
      const created = response?.createdCount ?? response?.items?.length ?? 0;
      const regId = response?.vendorPurchaseInvoiceId ?? response?.lotId;
      notifySuccess(
        `Imported ${created} items!${regId ? ` Stock-in ID: ${regId}` : ''}`
      );
      setImportTableItems([]);
      setSelectedVendor(null);
      setVendorSearchQuery('');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to import');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVendorSearch = async () => {
    if (!vendorSearchQuery.trim()) return;
    setIsSearchingVendor(true);
    try {
      const vendors = await vendorsApi.search(vendorSearchQuery.trim());
      setVendorSearchResults(vendors || []);
      setShowVendorDropdown(true);
    } catch {
      setVendorSearchResults([]);
    } finally {
      setIsSearchingVendor(false);
    }
  };

  const handleSelectVendor = (v: Vendor) => {
    setSelectedVendor(v);
    setVendorSearchQuery(v.name);
    setShowVendorDropdown(false);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFileInputKey((k) => k + 1);
  };

  const isEditing = (rowIdx: number, field: keyof ParseInvoiceItem) =>
    editingCell?.rowIdx === rowIdx && editingCell?.field === field;

  const EditableCell = ({
    rowIdx,
    field,
    value,
    numeric,
  }: {
    rowIdx: number;
    field: keyof ParseInvoiceItem;
    value: string | number | null | undefined;
    numeric?: boolean;
  }) => {
    const editing = isEditing(rowIdx, field);
    const display = value ?? '';
    return editing ? (
      <Input
        type={numeric ? 'number' : 'text'}
        className={styles.cellInput}
        value={display}
        autoFocus
        onBlur={() => setEditingCell(null)}
        onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
        onChange={(e) =>
          handleCellChange(
            rowIdx,
            field,
            numeric
              ? e.target.value === ''
                ? null
                : parseFloat(e.target.value)
              : e.target.value
          )
        }
      />
    ) : (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={styles.cellValue}
        onClick={() => setEditingCell({ rowIdx, field })}
        title="Click to edit"
      >
        {display}
      </Button>
    );
  };

  const visibleRows = importTableItems.slice(
    importTablePage * importTablePageSize,
    (importTablePage + 1) * importTablePageSize
  );

  return (
    <Stack gap="md">
      <PageHeader
        title="Import from Excel"
        description="Upload your stock snapshot Excel file, review and import items"
      />

      <Card>
        <CardBody>
          <Stack gap="md">
            <Input
              key={fileInputKey}
              id={fileInputId}
              type="file"
              accept=".xls,.xlsx"
              className={styles.fileInput}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const n = f.name.toLowerCase();
                  if (!n.endsWith('.xls') && !n.endsWith('.xlsx')) {
                    notifyError('Select an Excel file (.xls or .xlsx)');
                    return;
                  }
                  if (f.size > 10 * 1024 * 1024) {
                    notifyError('File must be under 10MB');
                    return;
                  }
                  setSelectedFile(f);
                }
              }}
            />
            <Inline gap="sm" align="center">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  document.getElementById(fileInputId)?.click()
                }
              >
                {selectedFile
                  ? selectedFile.name
                  : 'Choose Excel file (.xls / .xlsx)'}
              </Button>
              {isUploading ? (
                <Inline gap="sm" align="center">
                  <Spinner size="sm" />
                  <Text variant="caption" color="secondary">
                    {uploadProgress}
                  </Text>
                </Inline>
              ) : null}
            </Inline>
            {selectedFile && !isUploading ? (
              <Inline gap="sm">
                <Button type="button" variant="solid" onClick={handleParseSheet}>
                  Parse Sheet
                </Button>
                <Button type="button" variant="outline" onClick={clearSelectedFile}>
                  Clear
                </Button>
              </Inline>
            ) : null}
          </Stack>
        </CardBody>
      </Card>

      {importTableItems.length > 0 ? (
        <Stack gap="md">
          <Card>
            <CardHeader className={styles.tableHeader}>
              <Text variant="heading3" weight="semibold">
                Review ({importTableItems.length} items)
              </Text>
              {importTableItems.length > importTablePageSize ? (
                <PaginationBar
                  compact
                  page={importTablePage}
                  totalPages={Math.ceil(
                    importTableItems.length / importTablePageSize
                  )}
                  totalItems={importTableItems.length}
                  onPageChange={setImportTablePage}
                  aria-label="Import preview pages"
                />
              ) : null}
            </CardHeader>
            <CardBody className={styles.tableBody}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>#</TableHeaderCell>
                    <TableHeaderCell>Barcode</TableHeaderCell>
                    <TableHeaderCell>Name</TableHeaderCell>
                    <TableHeaderCell>Company</TableHeaderCell>
                    <TableHeaderCell className={styles.numCol}>Count</TableHeaderCell>
                    <TableHeaderCell className={styles.numCol}>MRP</TableHeaderCell>
                    <TableHeaderCell className={styles.numCol}>Cost</TableHeaderCell>
                    <TableHeaderCell className={styles.numCol}>
                      Sales Price
                    </TableHeaderCell>
                    <TableHeaderCell>Batch</TableHeaderCell>
                    <TableHeaderCell>Expiry</TableHeaderCell>
                    <TableHeaderCell className={styles.numCol}>Deal</TableHeaderCell>
                    <TableHeaderCell className={styles.numCol}>Free</TableHeaderCell>
                    <TableHeaderCell>Rec.Date</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleRows.map((row, idx) => {
                    const globalIdx =
                      importTablePage * importTablePageSize + idx;
                    return (
                      <TableRow
                        key={row.id}
                        className={idx % 2 === 1 ? styles.altRow : undefined}
                      >
                        <TableCell>{globalIdx + 1}</TableCell>
                        <TableCell>
                          <EditableCell
                            rowIdx={globalIdx}
                            field="barcode"
                            value={row.barcode}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            rowIdx={globalIdx}
                            field="name"
                            value={row.name}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            rowIdx={globalIdx}
                            field="companyName"
                            value={row.companyName}
                          />
                        </TableCell>
                        <TableCell className={styles.numCol}>
                          <EditableCell
                            rowIdx={globalIdx}
                            field="count"
                            value={row.count}
                            numeric
                          />
                        </TableCell>
                        <TableCell className={styles.numCol}>
                          <EditableCell
                            rowIdx={globalIdx}
                            field="maximumRetailPrice"
                            value={row.maximumRetailPrice}
                            numeric
                          />
                        </TableCell>
                        <TableCell className={styles.numCol}>
                          <EditableCell
                            rowIdx={globalIdx}
                            field="costPrice"
                            value={row.costPrice}
                            numeric
                          />
                        </TableCell>
                        <TableCell className={styles.numCol}>
                          <EditableCell
                            rowIdx={globalIdx}
                            field="priceToRetail"
                            value={row.priceToRetail}
                            numeric
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            rowIdx={globalIdx}
                            field="batchNo"
                            value={row.batchNo}
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            rowIdx={globalIdx}
                            field="expiryDate"
                            value={
                              row.expiryDate
                                ? row.expiryDate.slice(0, 10)
                                : null
                            }
                          />
                        </TableCell>
                        <TableCell className={styles.numCol}>
                          <EditableCell
                            rowIdx={globalIdx}
                            field="schemePayFor"
                            value={row.schemePayFor}
                            numeric
                          />
                        </TableCell>
                        <TableCell className={styles.numCol}>
                          <EditableCell
                            rowIdx={globalIdx}
                            field="schemeFree"
                            value={row.schemeFree}
                            numeric
                          />
                        </TableCell>
                        <TableCell>
                          <EditableCell
                            rowIdx={globalIdx}
                            field="purchaseDate"
                            value={
                              row.purchaseDate
                                ? row.purchaseDate.slice(0, 10)
                                : null
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stack gap="md">
                <Text variant="heading3" weight="semibold">
                  Vendor
                </Text>
                <Inline gap="sm" className={styles.sharedRow}>
                  <Select
                    value={billingMode}
                    options={BILLING_MODE_OPTIONS}
                    onChange={(e) =>
                      setBillingMode(e.target.value as BillingMode)
                    }
                  />
                  <SearchInput
                    value={vendorSearchQuery}
                    onChange={(value) => {
                      setVendorSearchQuery(value);
                      setShowVendorDropdown(false);
                    }}
                    onSearch={() => void handleVendorSearch()}
                    showSearchButton
                    placeholder="Search vendor"
                    searchLabel="Search"
                    className={styles.vendorSearch}
                  />
                </Inline>
                {showVendorDropdown && vendorSearchResults.length > 0 ? (
                  <Stack gap="none" className={styles.vendorList}>
                    {vendorSearchResults.map((v) => (
                      <Button
                        key={v.vendorId}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={styles.vendorListItem}
                        onClick={() => handleSelectVendor(v)}
                      >
                        {v.name}
                      </Button>
                    ))}
                  </Stack>
                ) : null}
                {selectedVendor ? (
                  <Inline gap="sm" align="center">
                    <Badge>{selectedVendor.name}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedVendor(null);
                        setVendorSearchQuery('');
                      }}
                    >
                      Remove
                    </Button>
                  </Inline>
                ) : null}
              </Stack>
            </CardBody>
          </Card>

          <Inline gap="sm" justify="end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="solid"
              onClick={() => void handleImportSubmit()}
              disabled={isLoading || !selectedVendor}
              loading={isLoading}
            >
              {isLoading
                ? 'Importing…'
                : `Import ${importTableItems.length} items`}
            </Button>
          </Inline>
        </Stack>
      ) : null}
    </Stack>
  );
}
