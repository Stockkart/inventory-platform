import { useState, useEffect, useCallback } from 'react';
import { gstr3bApi } from '@inventory-platform/api';
import type { Gstr3bReportResponse } from '@inventory-platform/types';
import styles from './dashboard.gstr1.module.css';

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
    { title: 'GSTR-3B Report - StockKart' },
    { name: 'description', content: 'View and download GSTR-3B monthly summary return' },
  ];
}

export function Gstr3bTab() {
  const [period, setPeriod] = useState(getDefaultPeriod);
  const [data, setData] = useState<Gstr3bReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const report = await gstr3bApi.getReport(period);
      setData(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GSTR-3B report');
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
      const { blob, filename } = await gstr3bApi.downloadExcel(period);
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

  const s31 = data?.section31;
  const s4 = data?.section4;
  const s5 = data?.section5;
  const s61 = data?.section61;
  const interState = data?.interStateSupplies ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>GSTR-3B Report</h1>
          <p className={styles.subtitle}>
            Monthly summary return – outward supplies, ITC, and tax payment
          </p>
          {data && (
            <p className={styles.shopInfo}>
              GSTIN: {data.shopGstin || '—'} · {data.legalName || '—'} · Period: {data.period}
            </p>
          )}
        </div>
        <div className={styles.controls}>
          <div className={styles.periodGroup}>
            <label htmlFor="gstr3b-period" className={styles.periodLabel}>Period</label>
            <input
              id="gstr3b-period"
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
        <div className={styles.error} role="alert">{error}</div>
      )}

      {isLoading ? (
        <div className={styles.loading}>Loading GSTR-3B report…</div>
      ) : data ? (
        <div className={styles.contentSection}>
          {/* Section 3.1 */}
          <h3>3.1 Outward & Inward Supplies</h3>
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Outward Taxable Value</span>
              <span className={styles.summaryValue}>{formatCurrency(s31?.outwardTaxableValue)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Outward IGST</span>
              <span className={styles.summaryValue}>{formatCurrency(s31?.outwardTaxableIgst)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Outward CGST</span>
              <span className={styles.summaryValue}>{formatCurrency(s31?.outwardTaxableCgst)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Outward SGST</span>
              <span className={styles.summaryValue}>{formatCurrency(s31?.outwardTaxableSgst)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Zero Rated (Export)</span>
              <span className={styles.summaryValue}>{formatCurrency(s31?.zeroRatedValue)}</span>
            </div>
          </div>

          {/* Section 3.2 */}
          {interState.length > 0 && (
            <>
              <h3>3.2 Inter-State Supplies</h3>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Place of Supply</th>
                      <th className={styles.numCol}>Taxable Value</th>
                      <th className={styles.numCol}>Integrated Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interState.map((row, i) => (
                      <tr key={i}>
                        <td>{row.placeOfSupply || '—'}</td>
                        <td className={styles.numCol}>{formatCurrency(row.taxableValue)}</td>
                        <td className={styles.numCol}>{formatCurrency(row.integratedTax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Section 4 */}
          <h3>4. Eligible ITC</h3>
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>ITC Available (Other)</span>
              <span className={styles.summaryValue}>
                IGST: {formatCurrency(s4?.itcOtherIgst)} · CGST: {formatCurrency(s4?.itcOtherCgst)} · SGST: {formatCurrency(s4?.itcOtherSgst)}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>ITC Reversed</span>
              <span className={styles.summaryValue}>
                CGST: {formatCurrency(s4?.itcReversedOthersCgst)} · SGST: {formatCurrency(s4?.itcReversedOthersSgst)}
              </span>
            </div>
          </div>

          {/* Section 5 */}
          {(s5?.compExemptInterState != null || s5?.compExemptIntraState != null) && (
            <>
              <h3>5. Exempt / Nil / Non-GST Inward</h3>
              <div className={styles.summary}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Inter-State</span>
                  <span className={styles.summaryValue}>{formatCurrency(s5.compExemptInterState)}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Intra-State</span>
                  <span className={styles.summaryValue}>{formatCurrency(s5.compExemptIntraState)}</span>
                </div>
              </div>
            </>
          )}

          {/* Section 6.1 */}
          <h3>6.1 Payment of Tax</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tax Type</th>
                  <th className={styles.numCol}>Payable</th>
                  <th className={styles.numCol}>Paid by ITC</th>
                  <th className={styles.numCol}>Paid in Cash</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Integrated Tax</td>
                  <td className={styles.numCol}>{formatCurrency(s61?.igstPayable)}</td>
                  <td className={styles.numCol}>{formatCurrency(s61?.igstPaidByItc)}</td>
                  <td className={styles.numCol}>{formatCurrency(s61?.igstPaidByCash)}</td>
                </tr>
                <tr>
                  <td>Central Tax</td>
                  <td className={styles.numCol}>{formatCurrency(s61?.cgstPayable)}</td>
                  <td className={styles.numCol}>
                    {formatCurrency((s61?.cgstPaidByItcIgst ?? 0) + (s61?.cgstPaidByItcCgst ?? 0) + (s61?.cgstPaidByItcSgst ?? 0))}
                  </td>
                  <td className={styles.numCol}>{formatCurrency(s61?.cgstPaidByCash)}</td>
                </tr>
                <tr>
                  <td>State/UT Tax</td>
                  <td className={styles.numCol}>{formatCurrency(s61?.sgstPayable)}</td>
                  <td className={styles.numCol}>
                    {formatCurrency(
                      (s61?.sgstPaidByItcIgst ?? 0) +
                      (s61?.sgstPaidByItcCgst ?? 0) +
                      (s61?.sgstPaidByItcSgst ?? 0)
                    )}
                  </td>
                  <td className={styles.numCol}>{formatCurrency(s61?.sgstPaidByCash)}</td>
                </tr>
                <tr>
                  <td>Cess</td>
                  <td className={styles.numCol}>{formatCurrency(s61?.cessPayable)}</td>
                  <td className={styles.numCol}>—</td>
                  <td className={styles.numCol}>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Gstr3bTab;
