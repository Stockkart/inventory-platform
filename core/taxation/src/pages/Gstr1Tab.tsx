import { useEffect, useState } from 'react';
import { triggerBlobDownload } from '../api/download';
import { gstr1Api } from '../api/gstr1.api';
import { useGstr1ReportQuery } from '../queries/hooks';
import styles from '../ui/gstr.module.css';

const TABS = [
  { id: 'b2b', label: 'B2B / SEZ / DE' },
  { id: 'b2cl', label: 'B2C Large' },
  { id: 'b2cs', label: 'B2C Small' },
  { id: 'cdnr', label: 'CDNR (Registered)' },
  { id: 'cdnur', label: 'CDNUR (Unregistered)' },
  { id: 'exp', label: 'Export' },
  { id: 'at', label: 'Advance Received' },
  { id: 'atadj', label: 'Advance Adjusted' },
  { id: 'exemp', label: 'Nil / Exempt / Non-GST' },
  { id: 'hsnb2b', label: 'HSN (B2B)' },
  { id: 'hsnb2c', label: 'HSN (B2C)' },
  { id: 'docs', label: 'Document Summary' },
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

/** GSTR-1 report content - used as a tab within the Taxes page */
export function Gstr1Tab() {
  const [period, setPeriod] = useState(getDefaultPeriod);
  const {
    data = null,
    isLoading,
    isError,
    error: queryError,
  } = useGstr1ReportQuery(period);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('b2b');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingOfflineJson, setIsDownloadingOfflineJson] = useState(false);

  useEffect(() => {
    if (isError) {
      setError(
        queryError instanceof Error ? queryError.message : 'Failed to load GSTR-1 report'
      );
    } else {
      setError(null);
    }
  }, [isError, queryError]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const { blob, filename } = await gstr1Api.downloadExcel(period);
      triggerBlobDownload(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download Excel');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadOfflineJson = async () => {
    setIsDownloadingOfflineJson(true);
    try {
      const { blob, filename } = await gstr1Api.downloadOfflineReturnJson(period);
      triggerBlobDownload(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download GST offline JSON');
    } finally {
      setIsDownloadingOfflineJson(false);
    }
  };

  const b2bTab = data?.['b2b,sez,de'];
  const b2bData = b2bTab?.lines ?? [];
  const b2clTab = data?.b2cl;
  const b2clData = b2clTab?.lines ?? [];
  const b2csTab = data?.b2cs;
  const b2csData = b2csTab?.lines ?? [];
  const cdnrTab = data?.cdnr;
  const cdnrData = cdnrTab?.lines ?? [];
  const cdnurTab = data?.cdnur;
  const cdnurData = cdnurTab?.lines ?? [];
  const expTab = data?.exp;
  const expData = expTab?.lines ?? [];
  const atTab = data?.at;
  const atData = atTab?.lines ?? [];
  const atadjTab = data?.atadj;
  const atadjData = atadjTab?.lines ?? [];
  const exempTab = data?.exemp;
  const exempData = exempTab?.lines ?? [];
  const hsnB2bTab = data?.['hsn(b2b)'];
  const hsnB2bData = hsnB2bTab?.lines ?? [];
  const hsnB2cTab = data?.['hsn(b2c)'];
  const hsnB2cData = hsnB2cTab?.lines ?? [];
  const docsTab = data?.docs;
  const docsData = docsTab?.lines ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>GSTR-1 Report</h1>
          <p className={styles.subtitle}>
            View and download your GSTR-1 tax return for GST filing
          </p>
          {data && (
            <p className={styles.shopInfo}>
              GSTIN: {data.shopGstin || '—'} · Period: {data.period}
            </p>
          )}
        </div>
        <div className={styles.controls}>
          <div className={styles.periodGroup}>
            <label htmlFor="gstr1-period" className={styles.periodLabel}>
              Period
            </label>
            <input
              id="gstr1-period"
              type="month"
              className={styles.periodInput}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className={styles.downloadButtons}>
            <button
              type="button"
              className={styles.downloadBtn}
              onClick={handleDownload}
              disabled={isLoading || isDownloading || isDownloadingOfflineJson}
            >
              {isDownloading ? 'Downloading…' : '📥 Download Excel'}
            </button>
            <button
              type="button"
              className={`${styles.downloadBtn} ${styles.downloadOfflineJsonAlt}`}
              onClick={handleDownloadOfflineJson}
              disabled={
                isLoading || isDownloading || isDownloadingOfflineJson
              }
              title="GST utility / portal layout (gstin, fp, b2b, b2cs, hsn, doc_issue)"
            >
              {isDownloadingOfflineJson
                ? 'Preparing JSON…'
                : '📄 Download offline JSON'}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>Loading GSTR-1 report…</div>
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
                <h3>B2B / SEZ / Deemed Export</h3>
                {b2bTab?.summary && (
                  <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Recipients</span>
                      <span className={styles.summaryValue}>{b2bTab.summary.noOfRecipients}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Invoices</span>
                      <span className={styles.summaryValue}>{b2bTab.summary.noOfInvoices}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Total Invoice Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(b2bTab.summary.totalInvoiceValue)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Taxable Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(b2bTab.summary.taxableValue)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Cess</span>
                      <span className={styles.summaryValue}>{formatCurrency(b2bTab.summary.cessAmount)}</span>
                    </div>
                  </div>
                )}
                {b2bData.length === 0 ? (
                  <div className={styles.empty}>No B2B/SEZ/DE invoices for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Recipient GSTIN</th>
                          <th>Receiver</th>
                          <th>Invoice No</th>
                          <th>Date</th>
                          <th className={styles.numCol}>Invoice Value</th>
                          <th>Place of Supply</th>
                          <th>Rev. Charge</th>
                          <th>Tax %</th>
                          <th className={styles.numCol}>Taxable Value</th>
                          <th className={styles.numCol}>Cess</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b2bData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.recipientGstin || '—'}</td>
                            <td>{row.receiverName || '—'}</td>
                            <td>{row.invoiceNo || '—'}</td>
                            <td>{formatDate(row.invoiceDate ?? '')}</td>
                            <td className={styles.numCol}>{formatCurrency(row.invoiceValue)}</td>
                            <td>{row.placeOfSupply || '—'}</td>
                            <td>{row.reverseCharge || '—'}</td>
                            <td>{row.applicableTaxPct || '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.cessAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'b2cl' && (
              <>
                <h3>B2C Large Invoices</h3>
                {b2clTab?.summary && (
                  <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Invoices</span>
                      <span className={styles.summaryValue}>{b2clTab.summary.noOfInvoices}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Total Invoice Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(b2clTab.summary.totalInvoiceValue)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Taxable Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(b2clTab.summary.totalTaxableValue)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Cess</span>
                      <span className={styles.summaryValue}>{formatCurrency(b2clTab.summary.totalCess)}</span>
                    </div>
                  </div>
                )}
                {b2clData.length === 0 ? (
                  <div className={styles.empty}>No B2C large invoices for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Invoice No</th>
                          <th>Date</th>
                          <th className={styles.numCol}>Invoice Value</th>
                          <th>Place of Supply</th>
                          <th>Tax %</th>
                          <th className={styles.numCol}>Taxable Value</th>
                          <th className={styles.numCol}>Cess</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b2clData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.invoiceNo || '—'}</td>
                            <td>{formatDate(row.invoiceDate ?? '')}</td>
                            <td className={styles.numCol}>{formatCurrency(row.invoiceValue)}</td>
                            <td>{row.placeOfSupply || '—'}</td>
                            <td>{row.applicableTaxPct || '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.cessAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'b2cs' && (
              <>
                <h3>B2C Small (Aggregated)</h3>
                {b2csTab?.summary && (
                  <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Taxable Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(b2csTab.summary.totalTaxableValue)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Cess</span>
                      <span className={styles.summaryValue}>{formatCurrency(b2csTab.summary.totalCess)}</span>
                    </div>
                  </div>
                )}
                {b2csData.length === 0 ? (
                  <div className={styles.empty}>No B2C small supplies for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Place of Supply</th>
                          <th>Tax %</th>
                          <th className={styles.numCol}>Taxable Value</th>
                          <th className={styles.numCol}>Cess</th>
                          <th>E-commerce GSTIN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b2csData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.type || '—'}</td>
                            <td>{row.placeOfSupply || '—'}</td>
                            <td>{row.applicableTaxPct || '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.cessAmount)}</td>
                            <td>{row.ecommerceGstin || '—'}</td>
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
                <h3>Credit/Debit Notes (Registered)</h3>
                {cdnrTab?.summary && (
                  <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Recipients</span>
                      <span className={styles.summaryValue}>{cdnrTab.summary.noOfRecipients}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Notes</span>
                      <span className={styles.summaryValue}>{cdnrTab.summary.noOfNotes}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Total Note Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(cdnrTab.summary.totalNoteValue)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Taxable Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(cdnrTab.summary.totalTaxableValue)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Cess</span>
                      <span className={styles.summaryValue}>{formatCurrency(cdnrTab.summary.totalCess)}</span>
                    </div>
                  </div>
                )}
                {cdnrData.length === 0 ? (
                  <div className={styles.empty}>No CDNR entries for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Note No</th>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Recipient GSTIN</th>
                          <th>Receiver</th>
                          <th className={styles.numCol}>Note Value</th>
                          <th>Place of Supply</th>
                          <th className={styles.numCol}>Taxable Value</th>
                          <th className={styles.numCol}>Cess</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cdnrData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.noteNumber || '—'}</td>
                            <td>{formatDate(row.noteDate)}</td>
                            <td>{row.noteType === 'C' ? 'Credit' : row.noteType === 'D' ? 'Debit' : row.noteType || '—'}</td>
                            <td>{row.recipientGstin || '—'}</td>
                            <td>{row.receiverName || '—'}</td>
                            <td className={styles.numCol}>{formatCurrency(row.noteValue)}</td>
                            <td>{row.placeOfSupply || '—'}</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.cessAmount)}</td>
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
                <h3>Credit/Debit Notes (Unregistered)</h3>
                {cdnurTab?.summary && (
                  <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Notes</span>
                      <span className={styles.summaryValue}>{cdnurTab.summary.noOfNotes}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Total Note Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(cdnurTab.summary.totalNoteValue)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Taxable Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(cdnurTab.summary.totalTaxableValue)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Cess</span>
                      <span className={styles.summaryValue}>{formatCurrency(cdnurTab.summary.totalCess)}</span>
                    </div>
                  </div>
                )}
                {cdnurData.length === 0 ? (
                  <div className={styles.empty}>No CDNUR entries for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Note No</th>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Receiver</th>
                          <th className={styles.numCol}>Note Value</th>
                          <th>Place of Supply</th>
                          <th className={styles.numCol}>Taxable Value</th>
                          <th className={styles.numCol}>Cess</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cdnurData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.noteNumber || '—'}</td>
                            <td>{formatDate(row.noteDate)}</td>
                            <td>{row.noteType === 'C' ? 'Credit' : row.noteType === 'D' ? 'Debit' : row.noteType || '—'}</td>
                            <td>{row.receiverName || '—'}</td>
                            <td className={styles.numCol}>{formatCurrency(row.noteValue)}</td>
                            <td>{row.placeOfSupply || '—'}</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.cessAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'exp' && (
              <>
                <h3>Export Invoices</h3>
                {expTab?.summary && (
                  <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Invoices</span>
                      <span className={styles.summaryValue}>{expTab.summary.noOfInvoices}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Total Invoice Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(expTab.summary.totalInvoiceValue)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Shipping Bills</span>
                      <span className={styles.summaryValue}>{expTab.summary.noOfShippingBills}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Taxable Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(expTab.summary.totalTaxableValue)}</span>
                    </div>
                  </div>
                )}
                {expData.length === 0 ? (
                  <div className={styles.empty}>No export invoices for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Invoice No</th>
                          <th>Date</th>
                          <th className={styles.numCol}>Invoice Value</th>
                          <th>Place of Supply</th>
                          <th>Tax %</th>
                          <th className={styles.numCol}>Taxable Value</th>
                          <th className={styles.numCol}>Cess</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.invoiceNo || '—'}</td>
                            <td>{formatDate(row.invoiceDate ?? '')}</td>
                            <td className={styles.numCol}>{formatCurrency(row.invoiceValue)}</td>
                            <td>{row.placeOfSupply || '—'}</td>
                            <td>{row.applicableTaxPct || '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.cessAmount)}</td>
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
                <h3>Advance Received</h3>
                {atTab?.summary && (
                  <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Total Advance Received</span>
                      <span className={styles.summaryValue}>{formatCurrency(atTab.summary.totalAdvanceReceived)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Cess</span>
                      <span className={styles.summaryValue}>{formatCurrency(atTab.summary.totalCess)}</span>
                    </div>
                  </div>
                )}
                {atData.length === 0 ? (
                  <div className={styles.empty}>No advance received entries for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Place of Supply</th>
                          <th>Tax %</th>
                          <th className={styles.numCol}>Gross Advance</th>
                          <th className={styles.numCol}>Cess</th>
                        </tr>
                      </thead>
                      <tbody>
                        {atData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.placeOfSupply || '—'}</td>
                            <td>{row.applicableTaxPct || '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.grossAdvanceReceivedOrAdjusted)}</td>
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
                <h3>Advance Adjusted</h3>
                {atadjTab?.summary && (
                  <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Total Advance Adjusted</span>
                      <span className={styles.summaryValue}>{formatCurrency(atadjTab.summary.totalAdvanceAdjusted)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Cess</span>
                      <span className={styles.summaryValue}>{formatCurrency(atadjTab.summary.totalCess)}</span>
                    </div>
                  </div>
                )}
                {atadjData.length === 0 ? (
                  <div className={styles.empty}>No advance adjusted entries for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Place of Supply</th>
                          <th>Tax %</th>
                          <th className={styles.numCol}>Gross Adjusted</th>
                          <th className={styles.numCol}>Cess</th>
                        </tr>
                      </thead>
                      <tbody>
                        {atadjData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.placeOfSupply || '—'}</td>
                            <td>{row.applicableTaxPct || '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.grossAdvanceReceivedOrAdjusted)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.cessAmount)}</td>
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
                <h3>Nil / Exempt / Non-GST Supplies</h3>
                {exempTab?.summary && (
                  <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Nil Rated</span>
                      <span className={styles.summaryValue}>{formatCurrency(exempTab.summary.totalNilRatedSupplies)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Exempted</span>
                      <span className={styles.summaryValue}>{formatCurrency(exempTab.summary.totalExemptedSupplies)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Non-GST</span>
                      <span className={styles.summaryValue}>{formatCurrency(exempTab.summary.totalNonGstSupplies)}</span>
                    </div>
                  </div>
                )}
                {exempData.length === 0 ? (
                  <div className={styles.empty}>No exempt/nil/non-GST supplies for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th className={styles.numCol}>Nil Rated</th>
                          <th className={styles.numCol}>Exempted</th>
                          <th className={styles.numCol}>Non-GST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exempData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.description || '—'}</td>
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

            {activeTab === 'hsnb2b' && (
              <>
                <h3>HSN Summary (B2B)</h3>
                {hsnB2bTab?.summary && (
                  <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>HSN Count</span>
                      <span className={styles.summaryValue}>{hsnB2bTab.summary.noOfHsn}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Total Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(hsnB2bTab.summary.totalValue)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Taxable Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(hsnB2bTab.summary.totalTaxableValue)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>IGST</span>
                      <span className={styles.summaryValue}>{formatCurrency(hsnB2bTab.summary.totalIntegratedTax)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>CGST</span>
                      <span className={styles.summaryValue}>{formatCurrency(hsnB2bTab.summary.totalCentralTax)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>SGST</span>
                      <span className={styles.summaryValue}>{formatCurrency(hsnB2bTab.summary.totalStateUtTax)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Cess</span>
                      <span className={styles.summaryValue}>{formatCurrency(hsnB2bTab.summary.totalCess)}</span>
                    </div>
                  </div>
                )}
                {hsnB2bData.length === 0 ? (
                  <div className={styles.empty}>No HSN B2B data for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>HSN</th>
                          <th>Description</th>
                          <th>UQC</th>
                          <th className={styles.numCol}>Qty</th>
                          <th className={styles.numCol}>Value</th>
                          <th>Rate %</th>
                          <th className={styles.numCol}>Taxable Value</th>
                          <th className={styles.numCol}>IGST</th>
                          <th className={styles.numCol}>CGST</th>
                          <th className={styles.numCol}>SGST</th>
                          <th className={styles.numCol}>Cess</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hsnB2bData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.hsn || '—'}</td>
                            <td>{row.description || '—'}</td>
                            <td>{row.uqc || '—'}</td>
                            <td className={styles.numCol}>{row.totalQuantity?.toLocaleString() ?? '—'}</td>
                            <td className={styles.numCol}>{formatCurrency(row.totalValue)}</td>
                            <td>{row.rate ?? '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.integratedTaxAmount)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.centralTaxAmount)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.stateUtTaxAmount)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.cessAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'hsnb2c' && (
              <>
                <h3>HSN Summary (B2C)</h3>
                {hsnB2cTab?.summary && (
                  <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>HSN Count</span>
                      <span className={styles.summaryValue}>{hsnB2cTab.summary.noOfHsn}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Total Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(hsnB2cTab.summary.totalValue)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Taxable Value</span>
                      <span className={styles.summaryValue}>{formatCurrency(hsnB2cTab.summary.totalTaxableValue)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>IGST</span>
                      <span className={styles.summaryValue}>{formatCurrency(hsnB2cTab.summary.totalIntegratedTax)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>CGST</span>
                      <span className={styles.summaryValue}>{formatCurrency(hsnB2cTab.summary.totalCentralTax)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>SGST</span>
                      <span className={styles.summaryValue}>{formatCurrency(hsnB2cTab.summary.totalStateUtTax)}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Cess</span>
                      <span className={styles.summaryValue}>{formatCurrency(hsnB2cTab.summary.totalCess)}</span>
                    </div>
                  </div>
                )}
                {hsnB2cData.length === 0 ? (
                  <div className={styles.empty}>No HSN B2C data for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>HSN</th>
                          <th>Description</th>
                          <th>UQC</th>
                          <th className={styles.numCol}>Qty</th>
                          <th className={styles.numCol}>Value</th>
                          <th>Rate %</th>
                          <th className={styles.numCol}>Taxable Value</th>
                          <th className={styles.numCol}>IGST</th>
                          <th className={styles.numCol}>CGST</th>
                          <th className={styles.numCol}>SGST</th>
                          <th className={styles.numCol}>Cess</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hsnB2cData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.hsn || '—'}</td>
                            <td>{row.description || '—'}</td>
                            <td>{row.uqc || '—'}</td>
                            <td className={styles.numCol}>{row.totalQuantity?.toLocaleString() ?? '—'}</td>
                            <td className={styles.numCol}>{formatCurrency(row.totalValue)}</td>
                            <td>{row.rate ?? '—'}%</td>
                            <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.integratedTaxAmount)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.centralTaxAmount)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.stateUtTaxAmount)}</td>
                            <td className={styles.numCol}>{formatCurrency(row.cessAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'docs' && (
              <>
                <h3>Document Summary</h3>
                {docsTab?.summary && (
                  <div className={styles.summary}>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Total Documents</span>
                      <span className={styles.summaryValue}>{docsTab.summary.totalNumber}</span>
                    </div>
                    <div className={styles.summaryItem}>
                      <span className={styles.summaryLabel}>Cancelled</span>
                      <span className={styles.summaryValue}>{docsTab.summary.cancelled}</span>
                    </div>
                  </div>
                )}
                {docsData.length === 0 ? (
                  <div className={styles.empty}>No document summary for this period.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Nature of Document</th>
                          <th>Sr No From</th>
                          <th>Sr No To</th>
                          <th className={styles.numCol}>Total</th>
                          <th className={styles.numCol}>Cancelled</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docsData.map((row, i) => (
                          <tr key={i}>
                            <td>{row.natureOfDocument || '—'}</td>
                            <td>{row.srNoFrom || '—'}</td>
                            <td>{row.srNoTo || '—'}</td>
                            <td className={styles.numCol}>{row.totalNumber ?? '—'}</td>
                            <td className={styles.numCol}>{row.cancelled ?? '—'}</td>
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

export default Gstr1Tab;
