import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { inventoryApi, vendorsApi } from '@inventory-platform/api';
import type {
  BulkCreateInventoryDto,
  ParseInvoiceItem,
  Vendor,
  BillingMode,
} from '@inventory-platform/types';
import { useNotify } from '@inventory-platform/store';
import styles from './dashboard.import.module.css';

export function meta() {
  return [
    { title: 'Import - StockKart' },
    {
      name: 'description',
      content: 'Import inventory from Excel stock snapshot',
    },
  ];
}

export default function ImportPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
  const [onCredit, _setOnCredit] = useState(false);
  const [selectedVendorShopId, _setSelectedVendorShopId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        if (fileInputRef.current) fileInputRef.current.value = '';
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
  ): import('@inventory-platform/types').BulkCreateInventoryItem => {
    const loc = row.location?.trim() || '';
    const expiry = row.expiryDate?.trim()
      ? row.expiryDate.includes('T')
        ? row.expiryDate
        : `${String(row.expiryDate).trim().slice(0, 10)}T00:00:00Z`
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10) + 'T00:00:00Z';
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
      expiryDate: expiry,
      hsn: row.hsn || null,
      batchNo: row.batchNo || null,
      scheme: row.scheme ?? null,
      schemePayFor: row.schemePayFor ?? null,
      schemeFree: row.schemeFree ?? null,
      schemeType: (row.schemeType ??
        'FIXED_UNITS') as import('@inventory-platform/types').SchemeType,
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

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        onCredit,
        ...(onCredit &&
          selectedVendor.userId &&
          selectedVendorShopId && { vendorShopId: selectedVendorShopId }),
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
      <input
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
      <span
        className={styles.cellValue}
        onClick={() => setEditingCell({ rowIdx, field })}
        title="Click to edit"
      >
        {display}
      </span>
    );
  };

  const visibleRows = importTableItems.slice(
    importTablePage * importTablePageSize,
    (importTablePage + 1) * importTablePageSize
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Import from Excel</h2>
        <p className={styles.subtitle}>
          Upload your stock snapshot Excel file, review and import items
        </p>
      </div>

      <div className={styles.formContainer}>
        <div className={styles.uploadSection}>
          <div className={styles.uploadBox}>
            <input
              ref={fileInputRef}
              id="excel-file-input"
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
            <label htmlFor="excel-file-input" className={styles.uploadLabel}>
              {selectedFile ? (
                <span className={styles.fileName}>{selectedFile.name}</span>
              ) : (
                <span>Choose Excel file (.xls / .xlsx)</span>
              )}
            </label>
            {isUploading && (
              <div className={styles.progress}>
                <div className={styles.spinner} />
                {uploadProgress}
              </div>
            )}
            {selectedFile && !isUploading && (
              <div className={styles.uploadActions}>
                <button
                  type="button"
                  className={styles.parseBtn}
                  onClick={handleParseSheet}
                >
                  Parse Sheet
                </button>
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => {
                    setSelectedFile(null);
                    fileInputRef.current && (fileInputRef.current.value = '');
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {importTableItems.length > 0 && (
          <>
            <div className={styles.tableSection}>
              <div className={styles.tableHeader}>
                <h3>Review ({importTableItems.length} items)</h3>
                {importTableItems.length > importTablePageSize && (
                  <div className={styles.pagination}>
                    <button
                      type="button"
                      onClick={() =>
                        setImportTablePage((p) => Math.max(0, p - 1))
                      }
                      disabled={importTablePage === 0}
                    >
                      ← Prev
                    </button>
                    <span>
                      {importTablePage + 1} /{' '}
                      {Math.ceil(importTableItems.length / importTablePageSize)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setImportTablePage((p) =>
                          Math.min(
                            Math.ceil(
                              importTableItems.length / importTablePageSize
                            ) - 1,
                            p + 1
                          )
                        )
                      }
                      disabled={
                        importTablePage >=
                        Math.ceil(
                          importTableItems.length / importTablePageSize
                        ) -
                          1
                      }
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Barcode</th>
                      <th>Name</th>
                      <th>Company</th>
                      <th className={styles.numCol}>Count</th>
                      <th className={styles.numCol}>MRP</th>
                      <th className={styles.numCol}>Cost</th>
                      <th className={styles.numCol}>Sales Price</th>
                      <th>Batch</th>
                      <th>Expiry</th>
                      <th className={styles.numCol}>Deal</th>
                      <th className={styles.numCol}>Free</th>
                      <th>Rec.Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, idx) => {
                      const globalIdx =
                        importTablePage * importTablePageSize + idx;
                      return (
                        <tr
                          key={row.id}
                          className={idx % 2 === 1 ? styles.altRow : ''}
                        >
                          <td>{globalIdx + 1}</td>
                          <td>
                            <EditableCell
                              rowIdx={globalIdx}
                              field="barcode"
                              value={row.barcode}
                            />
                          </td>
                          <td>
                            <EditableCell
                              rowIdx={globalIdx}
                              field="name"
                              value={row.name}
                            />
                          </td>
                          <td>
                            <EditableCell
                              rowIdx={globalIdx}
                              field="companyName"
                              value={row.companyName}
                            />
                          </td>
                          <td className={styles.numCol}>
                            <EditableCell
                              rowIdx={globalIdx}
                              field="count"
                              value={row.count}
                              numeric
                            />
                          </td>
                          <td className={styles.numCol}>
                            <EditableCell
                              rowIdx={globalIdx}
                              field="maximumRetailPrice"
                              value={row.maximumRetailPrice}
                              numeric
                            />
                          </td>
                          <td className={styles.numCol}>
                            <EditableCell
                              rowIdx={globalIdx}
                              field="costPrice"
                              value={row.costPrice}
                              numeric
                            />
                          </td>
                          <td className={styles.numCol}>
                            <EditableCell
                              rowIdx={globalIdx}
                              field="priceToRetail"
                              value={row.priceToRetail}
                              numeric
                            />
                          </td>
                          <td>
                            <EditableCell
                              rowIdx={globalIdx}
                              field="batchNo"
                              value={row.batchNo}
                            />
                          </td>
                          <td>
                            <EditableCell
                              rowIdx={globalIdx}
                              field="expiryDate"
                              value={
                                row.expiryDate
                                  ? row.expiryDate.slice(0, 10)
                                  : null
                              }
                            />
                          </td>
                          <td className={styles.numCol}>
                            <EditableCell
                              rowIdx={globalIdx}
                              field="schemePayFor"
                              value={row.schemePayFor}
                              numeric
                            />
                          </td>
                          <td className={styles.numCol}>
                            <EditableCell
                              rowIdx={globalIdx}
                              field="schemeFree"
                              value={row.schemeFree}
                              numeric
                            />
                          </td>
                          <td>
                            <EditableCell
                              rowIdx={globalIdx}
                              field="purchaseDate"
                              value={
                                row.purchaseDate
                                  ? row.purchaseDate.slice(0, 10)
                                  : null
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.sharedSection}>
              <h3>Vendor</h3>
              <div className={styles.sharedRow}>
                <select
                  value={billingMode}
                  onChange={(e) =>
                    setBillingMode(e.target.value as BillingMode)
                  }
                >
                  <option value="REGULAR">REGULAR</option>
                  <option value="BASIC">BASIC</option>
                </select>
                <div className={styles.vendorField}>
                  <input
                    type="text"
                    placeholder="Search vendor"
                    value={vendorSearchQuery}
                    onChange={(e) => {
                      setVendorSearchQuery(e.target.value);
                      setShowVendorDropdown(false);
                    }}
                    onFocus={() =>
                      vendorSearchQuery && setShowVendorDropdown(true)
                    }
                  />
                  <button
                    type="button"
                    onClick={handleVendorSearch}
                    disabled={!vendorSearchQuery.trim()}
                  >
                    Search
                  </button>
                </div>
              </div>
              {showVendorDropdown && vendorSearchResults.length > 0 && (
                <ul className={styles.vendorList}>
                  {vendorSearchResults.map((v) => (
                    <li key={v.vendorId} onClick={() => handleSelectVendor(v)}>
                      {v.name}
                    </li>
                  ))}
                </ul>
              )}
              {selectedVendor && (
                <div className={styles.selectedVendor}>
                  {selectedVendor.name}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVendor(null);
                      setVendorSearchQuery('');
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleImportSubmit}
                disabled={isLoading || !selectedVendor}
              >
                {isLoading
                  ? `Importing...`
                  : `Import ${importTableItems.length} items`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
