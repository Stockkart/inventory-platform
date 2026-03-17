import { useState, useEffect, useCallback } from 'react';
import { gstr2Api } from '@inventory-platform/api';
import type { Gstr2ReportResponse } from '@inventory-platform/types';
import styles from './dashboard.gstr1.module.css';

const TABS = [
  { id: 'b2b', label: 'B2B (Registered)' },
  { id: 'b2bur', label: 'B2BUR (Unregistered)' },
  { id: 'imps', label: 'IMPS (Import Services)' },
  { id: 'impg', label: 'IMPG (Import Goods)' },
  { id: 'cdnr', label: 'CDNR (Registered)' },
  { id: 'cdnur', label: 'CDNUR (Unregistered)' },
  { id: 'at', label: 'Advance Paid' },
  { id: 'atadj', label: 'Advance Adjusted' },
  { id: 'exemp', label: 'Exempt / Nil / Non-GST' },
  { id: 'itcr', label: 'ITC Reversal' },
  { id: 'hsnsum', label: 'HSN Summary' },
] as const;

function formatDate(s: string) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return s;
  }
}

function formatCurrency(n: number | undefined) {
  if (n == null || isNaN(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function getDefaultPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function meta() {
  return [
    { title: 'GSTR-2 Report - StockKart' },
    { name: 'description', content: 'View and download GSTR-2 tax return (inward supplies)' },
  ];
}

export function Gstr2Tab() {
  const [period, setPeriod] = useState(getDefaultPeriod);
  const [data, setData] = useState<Gstr2ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('b2b');
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const report = await gstr2Api.getReport(period);
      setData(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GSTR-2 report');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const { blob, filename } = await gstr2Api.downloadExcel(period);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download Excel');
    } finally {
      setIsDownloading(false);
    }
  };

  const b2bData = data?.b2b?.lines ?? [];
  const b2burData = data?.b2bur?.lines ?? [];
  const impsData = data?.imps?.lines ?? [];
  const impgData = data?.impg?.lines ?? [];
  const cdnrData = data?.cdnr?.lines ?? [];
  const cdnurData = data?.cdnur?.lines ?? [];
  const atData = data?.at?.lines ?? [];
  const atadjData = data?.atadj?.lines ?? [];
  const exempData = data?.exemp?.lines ?? [];
  const itcrData = data?.itcr?.lines ?? [];
  const hsnData = data?.hsnsum?.lines ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>GSTR-2 Report</h1>
          <p className={styles.subtitle}>
            View and download your GSTR-2 tax return for inward supplies
          </p>
          {data && (
            <p className={styles.shopInfo}>
              GSTIN: {data.shopGstin || '—'} · Period: {data.period}
            </p>
          )}
        </div>
        <div className={styles.controls}>
          <div className={styles.periodGroup}>
            <label htmlFor="gstr2-period" className={styles.periodLabel}>
              Period
            </label>
            <input
              id="gstr2-period"
              type="month"
              className={styles.periodInput}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <button
            type="button"
            className={styles.downloadBtn}
            onClick={handleDownload}
            disabled={isLoading || isDownloading}
          >
            {isDownloading ? 'Downloading…' : '📥 Download Excel'}
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>Loading GSTR-2 report…</div>
      ) : data ? (
        <>
          <div className={styles.tabs}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.contentSection}>
            {activeTab === 'b2b' && (
              <>
                <h3>B2B Inward Supplies (Registered Suppliers)</h3>
                {b2bData.length === 0 ? (
                  <div className={styles.empty}>No B2B inward supplies for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Supplier GSTIN</th>
                          <th>Invoice No</th>
                          <th>Date</th>
                          <th className={styles.numCol}>Invoice Value</th>
                          <th>Place of Supply</th>
                          <th>Rate %</th>
                          <th className={styles.numCol}>Taxable Value</th>
                          <th className={styles.numCol}>CGST</th>
                          <th className={styles.numCol}>SGST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b2bData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.supplierGstin || '—'}</td>
                            <td>{row.invoiceNo || '—'}</td>
                            <td>{formatDate(row.invoiceDate ?? '')}</td>
                            <td className={styles.numCol}>{formatCurrency(row.invoiceValue)}</td>
                            <td>{row.placeOfSupply || '—'}</td>
                            <td>{row.rate ?? '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.centralTaxPaid)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.stateUtTaxPaid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'b2bur' && (
              <>
                <h3>B2BUR Inward Supplies (Unregistered Suppliers)</h3>
                {b2burData.length === 0 ? (
                  <div className={styles.empty}>No B2BUR inward supplies for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Supplier Name</th>
                          <th>Invoice No</th>
                          <th>Date</th>
                          <th className={styles.numCol}>Invoice Value</th>
                          <th>Place of Supply</th>
                          <th>Rate %</th>
                          <th className={styles.numCol}>Taxable Value</th>
                          <th className={styles.numCol}>CGST</th>
                          <th className={styles.numCol}>SGST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b2burData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.supplierName || '—'}</td>
                            <td>{row.invoiceNo || '—'}</td>
                            <td>{formatDate(row.invoiceDate ?? '')}</td>
                            <td className={styles.numCol}>{formatCurrency(row.invoiceValue)}</td>
                            <td>{row.placeOfSupply || '—'}</td>
                            <td>{row.rate ?? '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.centralTaxPaid)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.stateUtTaxPaid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'imps' && (
              <>
                <h3>Import of Services</h3>
                {impsData.length === 0 ? (
                  <div className={styles.empty}>No import of services for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Invoice No</th>
                          <th>Date</th>
                          <th className={styles.numCol}>Invoice Value</th>
                          <th>Place of Supply</th>
                          <th>Rate %</th>
                          <th className={styles.numCol}>Taxable Value</th>
                          <th className={styles.numCol}>IGST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {impsData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.invoiceNo || '—'}</td>
                            <td>{formatDate(row.invoiceDate ?? '')}</td>
                            <td className={styles.numCol}>{formatCurrency(row.invoiceValue)}</td>
                            <td>{row.placeOfSupply || '—'}</td>
                            <td>{row.rate ?? '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.integratedTaxPaid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'impg' && (
              <>
                <h3>Import of Goods</h3>
                {impgData.length === 0 ? (
                  <div className={styles.empty}>No import of goods for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Port</th>
                          <th>Bill of Entry No</th>
                          <th>Date</th>
                          <th className={styles.numCol}>Bill Value</th>
                          <th>Rate %</th>
                          <th className={styles.numCol}>Taxable Value</th>
                          <th className={styles.numCol}>IGST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {impgData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.portCode || '—'}</td>
                            <td>{row.billOfEntryNo || '—'}</td>
                            <td>{formatDate(row.billOfEntryDate ?? '')}</td>
                            <td className={styles.numCol}>{formatCurrency(row.billOfEntryValue)}</td>
                            <td>{row.rate ?? '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.integratedTaxPaid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'cdnr' && (
              <>
                <h3>Credit/Debit Notes from Registered Suppliers</h3>
                {cdnrData.length === 0 ? (
                  <div className={styles.empty}>No CDNR entries for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Supplier GSTIN</th>
                          <th>Note No</th>
                          <th>Date</th>
                          <th className={styles.numCol}>Note Value</th>
                          <th>Rate %</th>
                          <th className={styles.numCol}>Taxable Value</th>
                          <th className={styles.numCol}>CGST</th>
                          <th className={styles.numCol}>SGST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cdnrData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.supplierGstin || '—'}</td>
                            <td>{row.noteNumber || '—'}</td>
                            <td>{formatDate(row.noteDate ?? '')}</td>
                            <td className={styles.numCol}>{formatCurrency(row.noteValue)}</td>
                            <td>{row.rate ?? '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.centralTaxPaid)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.stateUtTaxPaid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'cdnur' && (
              <>
                <h3>Credit/Debit Notes from Unregistered Suppliers</h3>
                {cdnurData.length === 0 ? (
                  <div className={styles.empty}>No CDNUR entries for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Note No</th>
                          <th>Date</th>
                          <th className={styles.numCol}>Note Value</th>
                          <th>Rate %</th>
                          <th className={styles.numCol}>Taxable Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cdnurData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.noteNumber || '—'}</td>
                            <td>{formatDate(row.noteDate ?? '')}</td>
                            <td className={styles.numCol}>{formatCurrency(row.noteValue)}</td>
                            <td>{row.rate ?? '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'at' && (
              <>
                <h3>Tax on Advance Paid</h3>
                {atData.length === 0 ? (
                  <div className={styles.empty}>No advance tax entries for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Place of Supply</th>
                          <th>Rate %</th>
                          <th className={styles.numCol}>Gross Advance Paid</th>
                          <th className={styles.numCol}>Cess</th>
                        </tr>
                      </thead>
                      <tbody>
                        {atData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.placeOfSupply || '—'}</td>
                            <td>{row.rate ?? '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.grossAdvancePaid)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.cessAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'atadj' && (
              <>
                <h3>Advance Adjustment</h3>
                {atadjData.length === 0 ? (
                  <div className={styles.empty}>No advance adjustment entries for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Place of Supply</th>
                          <th>Rate %</th>
                          <th className={styles.numCol}>Advance to Adjust</th>
                          <th className={styles.numCol}>Cess Adjusted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {atadjData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.placeOfSupply || '—'}</td>
                            <td>{row.rate ?? '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.grossAdvanceToBeAdjusted)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.cessAdjusted)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'exemp' && (
              <>
                <h3>Exempt / Nil / Non-GST Supplies</h3>
                {exempData.length === 0 ? (
                  <div className={styles.empty}>No exempt entries for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th className={styles.numCol}>Composition</th>
                          <th className={styles.numCol}>Nil Rated</th>
                          <th className={styles.numCol}>Exempted</th>
                          <th className={styles.numCol}>Non-GST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exempData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.description || '—'}</td>
                            <td className={styles.numCol}>{formatCurrency(row.compositionTaxablePerson)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.nilRatedSupplies)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.exemptedOtherThanNilOrNonGst)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.nonGstSupplies)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'itcr' && (
              <>
                <h3>ITC Reversal</h3>
                {itcrData.length === 0 ? (
                  <div className={styles.empty}>No ITC reversal entries for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Add/Reduce</th>
                          <th className={styles.numCol}>IGST</th>
                          <th className={styles.numCol}>CGST</th>
                          <th className={styles.numCol}>SGST</th>
                          <th className={styles.numCol}>Cess</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itcrData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.description || '—'}</td>
                            <td>{row.toBeAddedOrReduced || '—'}</td>
                            <td className={styles.numCol}>{formatCurrency(row.itcIntegratedTaxAmount)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.itcCentralTaxAmount)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.itcStateUtTaxAmount)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.itcCessAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'hsnsum' && (
              <>
                <h3>HSN Summary</h3>
                {hsnData.length === 0 ? (
                  <div className={styles.empty}>No HSN summary for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>HSN</th>
                          <th>Description</th>
                          <th>UQC</th>
                          <th className={styles.numCol}>Qty</th>
                          <th className={styles.numCol}>Total Value</th>
                          <th>Rate %</th>
                          <th className={styles.numCol}>Taxable Value</th>
                          <th className={styles.numCol}>CGST</th>
                          <th className={styles.numCol}>SGST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hsnData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.hsn || '—'}</td>
                            <td>{row.description || '—'}</td>
                            <td>{row.uqc || '—'}</td>
                            <td className={styles.numCol}>{row.totalQuantity ?? '—'}</td>
                            <td className={styles.numCol}>{formatCurrency(row.totalValue)}</td>
                            <td>{row.rate ?? '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.centralTaxAmount)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.stateUtTaxAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default Gstr2Tab;
