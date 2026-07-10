import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardBody,
  CenteredLoader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
} from '@inventory-platform/ui-kit';
import { triggerBlobDownload } from '../api/download';
import { gstr1Api } from '../api/gstr1.api';
import { useGstr1ReportQuery } from '../queries/hooks';
import {
  formatCurrency,
  formatDate,
  getDefaultPeriod,
  GstrReportHeader,
  GstrSubTabs,
  GstrSummaryGrid,
} from '../ui';
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

type Gstr1SectionId = (typeof TABS)[number]['id'];

function EmptySection({ message }: { message: string }) {
  return (
    <Box className={styles.emptyState}>
      <Text color="secondary" align="center">
        {message}
      </Text>
    </Box>
  );
}

/** GSTR-1 report content - used as a tab within the Taxes page */
export function Gstr1Tab() {
  const [period, setPeriod] = useState(getDefaultPeriod);
  const { data = null, isLoading, isError, error: queryError } = useGstr1ReportQuery(period);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Gstr1SectionId>('b2b');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingOfflineJson, setIsDownloadingOfflineJson] = useState(false);

  useEffect(() => {
    if (isError) {
      setError(queryError instanceof Error ? queryError.message : 'Failed to load GSTR-1 report');
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
    <Stack gap="md">
      <GstrReportHeader
        title="GSTR-1 Report"
        description="View and download your GSTR-1 tax return for GST filing"
        shopInfo={data ? `GSTIN: ${data.shopGstin || '—'} · Period: ${data.period}` : undefined}
        periodId="gstr1-period"
        period={period}
        onPeriodChange={setPeriod}
        periodDisabled={isLoading}
        downloads={[
          {
            label: '📥 Download Excel',
            loadingLabel: 'Downloading…',
            onClick: handleDownload,
            disabled: isLoading || isDownloading || isDownloadingOfflineJson,
            loading: isDownloading,
          },
          {
            label: '📄 Download offline JSON',
            loadingLabel: 'Preparing JSON…',
            onClick: handleDownloadOfflineJson,
            disabled: isLoading || isDownloading || isDownloadingOfflineJson,
            loading: isDownloadingOfflineJson,
            variant: 'outline',
            title: 'GST utility / portal layout (gstin, fp, b2b, b2cs, hsn, doc_issue)',
          },
        ]}
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {isLoading ? (
        <CenteredLoader label="Loading GSTR-1 report…" />
      ) : data ? (
        <>
          <GstrSubTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

          <Card>
            <CardBody>
              {activeTab === 'b2b' && (
                <Stack gap="md">
                  <Text variant="heading3">B2B / SEZ / Deemed Export</Text>
                  <GstrSummaryGrid
                    items={
                      b2bTab?.summary
                        ? [
                            {
                              label: 'Recipients',
                              value: String(b2bTab.summary.noOfRecipients),
                            },
                            {
                              label: 'Invoices',
                              value: String(b2bTab.summary.noOfInvoices),
                            },
                            {
                              label: 'Total Invoice Value',
                              value: formatCurrency(b2bTab.summary.totalInvoiceValue),
                            },
                            {
                              label: 'Taxable Value',
                              value: formatCurrency(b2bTab.summary.taxableValue),
                            },
                            {
                              label: 'Cess',
                              value: formatCurrency(b2bTab.summary.cessAmount),
                            },
                          ]
                        : []
                    }
                  />
                  {b2bData.length === 0 ? (
                    <EmptySection message="No B2B/SEZ/DE invoices for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Recipient GSTIN</TableHeaderCell>
                          <TableHeaderCell>Receiver</TableHeaderCell>
                          <TableHeaderCell>Invoice No</TableHeaderCell>
                          <TableHeaderCell>Date</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Invoice Value</TableHeaderCell>
                          <TableHeaderCell>Place of Supply</TableHeaderCell>
                          <TableHeaderCell>Rev. Charge</TableHeaderCell>
                          <TableHeaderCell>Tax %</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Taxable Value</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Cess</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {b2bData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.recipientGstin || '—'}</TableCell>
                            <TableCell>{row.receiverName || '—'}</TableCell>
                            <TableCell>{row.invoiceNo || '—'}</TableCell>
                            <TableCell>{formatDate(row.invoiceDate ?? '')}</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.invoiceValue)}
                            </TableCell>
                            <TableCell>{row.placeOfSupply || '—'}</TableCell>
                            <TableCell>{row.reverseCharge || '—'}</TableCell>
                            <TableCell>{row.applicableTaxPct || '—'}%</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.taxableValue)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.cessAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'b2cl' && (
                <Stack gap="md">
                  <Text variant="heading3">B2C Large Invoices</Text>
                  <GstrSummaryGrid
                    items={
                      b2clTab?.summary
                        ? [
                            {
                              label: 'Invoices',
                              value: String(b2clTab.summary.noOfInvoices),
                            },
                            {
                              label: 'Total Invoice Value',
                              value: formatCurrency(b2clTab.summary.totalInvoiceValue),
                            },
                            {
                              label: 'Taxable Value',
                              value: formatCurrency(b2clTab.summary.totalTaxableValue),
                            },
                            {
                              label: 'Cess',
                              value: formatCurrency(b2clTab.summary.totalCess),
                            },
                          ]
                        : []
                    }
                  />
                  {b2clData.length === 0 ? (
                    <EmptySection message="No B2C large invoices for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Invoice No</TableHeaderCell>
                          <TableHeaderCell>Date</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Invoice Value</TableHeaderCell>
                          <TableHeaderCell>Place of Supply</TableHeaderCell>
                          <TableHeaderCell>Tax %</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Taxable Value</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Cess</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {b2clData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.invoiceNo || '—'}</TableCell>
                            <TableCell>{formatDate(row.invoiceDate ?? '')}</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.invoiceValue)}
                            </TableCell>
                            <TableCell>{row.placeOfSupply || '—'}</TableCell>
                            <TableCell>{row.applicableTaxPct || '—'}%</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.taxableValue)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.cessAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'b2cs' && (
                <Stack gap="md">
                  <Text variant="heading3">B2C Small (Aggregated)</Text>
                  <GstrSummaryGrid
                    items={
                      b2csTab?.summary
                        ? [
                            {
                              label: 'Taxable Value',
                              value: formatCurrency(b2csTab.summary.totalTaxableValue),
                            },
                            {
                              label: 'Cess',
                              value: formatCurrency(b2csTab.summary.totalCess),
                            },
                          ]
                        : []
                    }
                  />
                  {b2csData.length === 0 ? (
                    <EmptySection message="No B2C small supplies for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Type</TableHeaderCell>
                          <TableHeaderCell>Place of Supply</TableHeaderCell>
                          <TableHeaderCell>Tax %</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Taxable Value</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Cess</TableHeaderCell>
                          <TableHeaderCell>E-commerce GSTIN</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {b2csData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.type || '—'}</TableCell>
                            <TableCell>{row.placeOfSupply || '—'}</TableCell>
                            <TableCell>{row.applicableTaxPct || '—'}%</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.taxableValue)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.cessAmount)}
                            </TableCell>
                            <TableCell>{row.ecommerceGstin || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'cdnr' && (
                <Stack gap="md">
                  <Text variant="heading3">Credit/Debit Notes (Registered)</Text>
                  <GstrSummaryGrid
                    items={
                      cdnrTab?.summary
                        ? [
                            {
                              label: 'Recipients',
                              value: String(cdnrTab.summary.noOfRecipients),
                            },
                            {
                              label: 'Notes',
                              value: String(cdnrTab.summary.noOfNotes),
                            },
                            {
                              label: 'Total Note Value',
                              value: formatCurrency(cdnrTab.summary.totalNoteValue),
                            },
                            {
                              label: 'Taxable Value',
                              value: formatCurrency(cdnrTab.summary.totalTaxableValue),
                            },
                            {
                              label: 'Cess',
                              value: formatCurrency(cdnrTab.summary.totalCess),
                            },
                          ]
                        : []
                    }
                  />
                  {cdnrData.length === 0 ? (
                    <EmptySection message="No CDNR entries for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Note No</TableHeaderCell>
                          <TableHeaderCell>Date</TableHeaderCell>
                          <TableHeaderCell>Type</TableHeaderCell>
                          <TableHeaderCell>Recipient GSTIN</TableHeaderCell>
                          <TableHeaderCell>Receiver</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Note Value</TableHeaderCell>
                          <TableHeaderCell>Place of Supply</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Taxable Value</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Cess</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cdnrData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.noteNumber || '—'}</TableCell>
                            <TableCell>{formatDate(row.noteDate)}</TableCell>
                            <TableCell>
                              {row.noteType === 'C'
                                ? 'Credit'
                                : row.noteType === 'D'
                                ? 'Debit'
                                : row.noteType || '—'}
                            </TableCell>
                            <TableCell>{row.recipientGstin || '—'}</TableCell>
                            <TableCell>{row.receiverName || '—'}</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.noteValue)}
                            </TableCell>
                            <TableCell>{row.placeOfSupply || '—'}</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.taxableValue)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.cessAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'cdnur' && (
                <Stack gap="md">
                  <Text variant="heading3">Credit/Debit Notes (Unregistered)</Text>
                  <GstrSummaryGrid
                    items={
                      cdnurTab?.summary
                        ? [
                            {
                              label: 'Notes',
                              value: String(cdnurTab.summary.noOfNotes),
                            },
                            {
                              label: 'Total Note Value',
                              value: formatCurrency(cdnurTab.summary.totalNoteValue),
                            },
                            {
                              label: 'Taxable Value',
                              value: formatCurrency(cdnurTab.summary.totalTaxableValue),
                            },
                            {
                              label: 'Cess',
                              value: formatCurrency(cdnurTab.summary.totalCess),
                            },
                          ]
                        : []
                    }
                  />
                  {cdnurData.length === 0 ? (
                    <EmptySection message="No CDNUR entries for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Note No</TableHeaderCell>
                          <TableHeaderCell>Date</TableHeaderCell>
                          <TableHeaderCell>Type</TableHeaderCell>
                          <TableHeaderCell>Receiver</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Note Value</TableHeaderCell>
                          <TableHeaderCell>Place of Supply</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Taxable Value</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Cess</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cdnurData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.noteNumber || '—'}</TableCell>
                            <TableCell>{formatDate(row.noteDate)}</TableCell>
                            <TableCell>
                              {row.noteType === 'C'
                                ? 'Credit'
                                : row.noteType === 'D'
                                ? 'Debit'
                                : row.noteType || '—'}
                            </TableCell>
                            <TableCell>{row.receiverName || '—'}</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.noteValue)}
                            </TableCell>
                            <TableCell>{row.placeOfSupply || '—'}</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.taxableValue)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.cessAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'exp' && (
                <Stack gap="md">
                  <Text variant="heading3">Export Invoices</Text>
                  <GstrSummaryGrid
                    items={
                      expTab?.summary
                        ? [
                            {
                              label: 'Invoices',
                              value: String(expTab.summary.noOfInvoices),
                            },
                            {
                              label: 'Total Invoice Value',
                              value: formatCurrency(expTab.summary.totalInvoiceValue),
                            },
                            {
                              label: 'Shipping Bills',
                              value: String(expTab.summary.noOfShippingBills),
                            },
                            {
                              label: 'Taxable Value',
                              value: formatCurrency(expTab.summary.totalTaxableValue),
                            },
                          ]
                        : []
                    }
                  />
                  {expData.length === 0 ? (
                    <EmptySection message="No export invoices for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Invoice No</TableHeaderCell>
                          <TableHeaderCell>Date</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Invoice Value</TableHeaderCell>
                          <TableHeaderCell>Place of Supply</TableHeaderCell>
                          <TableHeaderCell>Tax %</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Taxable Value</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Cess</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {expData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.invoiceNo || '—'}</TableCell>
                            <TableCell>{formatDate(row.invoiceDate ?? '')}</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.invoiceValue)}
                            </TableCell>
                            <TableCell>{row.placeOfSupply || '—'}</TableCell>
                            <TableCell>{row.applicableTaxPct || '—'}%</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.taxableValue)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.cessAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'at' && (
                <Stack gap="md">
                  <Text variant="heading3">Advance Received</Text>
                  <GstrSummaryGrid
                    items={
                      atTab?.summary
                        ? [
                            {
                              label: 'Total Advance Received',
                              value: formatCurrency(atTab.summary.totalAdvanceReceived),
                            },
                            {
                              label: 'Cess',
                              value: formatCurrency(atTab.summary.totalCess),
                            },
                          ]
                        : []
                    }
                  />
                  {atData.length === 0 ? (
                    <EmptySection message="No advance received entries for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Place of Supply</TableHeaderCell>
                          <TableHeaderCell>Tax %</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Gross Advance</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Cess</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {atData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.placeOfSupply || '—'}</TableCell>
                            <TableCell>{row.applicableTaxPct || '—'}%</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.grossAdvanceReceivedOrAdjusted)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.cessAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'atadj' && (
                <Stack gap="md">
                  <Text variant="heading3">Advance Adjusted</Text>
                  <GstrSummaryGrid
                    items={
                      atadjTab?.summary
                        ? [
                            {
                              label: 'Total Advance Adjusted',
                              value: formatCurrency(atadjTab.summary.totalAdvanceAdjusted),
                            },
                            {
                              label: 'Cess',
                              value: formatCurrency(atadjTab.summary.totalCess),
                            },
                          ]
                        : []
                    }
                  />
                  {atadjData.length === 0 ? (
                    <EmptySection message="No advance adjusted entries for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Place of Supply</TableHeaderCell>
                          <TableHeaderCell>Tax %</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>
                            Gross Adjusted
                          </TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Cess</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {atadjData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.placeOfSupply || '—'}</TableCell>
                            <TableCell>{row.applicableTaxPct || '—'}%</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.grossAdvanceReceivedOrAdjusted)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.cessAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'exemp' && (
                <Stack gap="md">
                  <Text variant="heading3">Nil / Exempt / Non-GST Supplies</Text>
                  <GstrSummaryGrid
                    items={
                      exempTab?.summary
                        ? [
                            {
                              label: 'Nil Rated',
                              value: formatCurrency(exempTab.summary.totalNilRatedSupplies),
                            },
                            {
                              label: 'Exempted',
                              value: formatCurrency(exempTab.summary.totalExemptedSupplies),
                            },
                            {
                              label: 'Non-GST',
                              value: formatCurrency(exempTab.summary.totalNonGstSupplies),
                            },
                          ]
                        : []
                    }
                  />
                  {exempData.length === 0 ? (
                    <EmptySection message="No exempt/nil/non-GST supplies for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Description</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Nil Rated</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Exempted</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Non-GST</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {exempData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.description || '—'}</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.nilRatedSupplies)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.exemptedOtherThanNilOrNonGst)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.nonGstSupplies)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'hsnb2b' && (
                <Stack gap="md">
                  <Text variant="heading3">HSN Summary (B2B)</Text>
                  <GstrSummaryGrid
                    items={
                      hsnB2bTab?.summary
                        ? [
                            {
                              label: 'HSN Count',
                              value: String(hsnB2bTab.summary.noOfHsn),
                            },
                            {
                              label: 'Total Value',
                              value: formatCurrency(hsnB2bTab.summary.totalValue),
                            },
                            {
                              label: 'Taxable Value',
                              value: formatCurrency(hsnB2bTab.summary.totalTaxableValue),
                            },
                            {
                              label: 'IGST',
                              value: formatCurrency(hsnB2bTab.summary.totalIntegratedTax),
                            },
                            {
                              label: 'CGST',
                              value: formatCurrency(hsnB2bTab.summary.totalCentralTax),
                            },
                            {
                              label: 'SGST',
                              value: formatCurrency(hsnB2bTab.summary.totalStateUtTax),
                            },
                            {
                              label: 'Cess',
                              value: formatCurrency(hsnB2bTab.summary.totalCess),
                            },
                          ]
                        : []
                    }
                  />
                  {hsnB2bData.length === 0 ? (
                    <EmptySection message="No HSN B2B data for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>HSN</TableHeaderCell>
                          <TableHeaderCell>Description</TableHeaderCell>
                          <TableHeaderCell>UQC</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Qty</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Value</TableHeaderCell>
                          <TableHeaderCell>Rate %</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Taxable Value</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>IGST</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>CGST</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>SGST</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Cess</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {hsnB2bData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.hsn || '—'}</TableCell>
                            <TableCell>{row.description || '—'}</TableCell>
                            <TableCell>{row.uqc || '—'}</TableCell>
                            <TableCell className={styles.numCol}>
                              {row.totalQuantity?.toLocaleString() ?? '—'}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.totalValue)}
                            </TableCell>
                            <TableCell>{row.rate ?? '—'}%</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.taxableValue)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.integratedTaxAmount)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.centralTaxAmount)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.stateUtTaxAmount)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.cessAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'hsnb2c' && (
                <Stack gap="md">
                  <Text variant="heading3">HSN Summary (B2C)</Text>
                  <GstrSummaryGrid
                    items={
                      hsnB2cTab?.summary
                        ? [
                            {
                              label: 'HSN Count',
                              value: String(hsnB2cTab.summary.noOfHsn),
                            },
                            {
                              label: 'Total Value',
                              value: formatCurrency(hsnB2cTab.summary.totalValue),
                            },
                            {
                              label: 'Taxable Value',
                              value: formatCurrency(hsnB2cTab.summary.totalTaxableValue),
                            },
                            {
                              label: 'IGST',
                              value: formatCurrency(hsnB2cTab.summary.totalIntegratedTax),
                            },
                            {
                              label: 'CGST',
                              value: formatCurrency(hsnB2cTab.summary.totalCentralTax),
                            },
                            {
                              label: 'SGST',
                              value: formatCurrency(hsnB2cTab.summary.totalStateUtTax),
                            },
                            {
                              label: 'Cess',
                              value: formatCurrency(hsnB2cTab.summary.totalCess),
                            },
                          ]
                        : []
                    }
                  />
                  {hsnB2cData.length === 0 ? (
                    <EmptySection message="No HSN B2C data for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>HSN</TableHeaderCell>
                          <TableHeaderCell>Description</TableHeaderCell>
                          <TableHeaderCell>UQC</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Qty</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Value</TableHeaderCell>
                          <TableHeaderCell>Rate %</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Taxable Value</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>IGST</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>CGST</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>SGST</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Cess</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {hsnB2cData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.hsn || '—'}</TableCell>
                            <TableCell>{row.description || '—'}</TableCell>
                            <TableCell>{row.uqc || '—'}</TableCell>
                            <TableCell className={styles.numCol}>
                              {row.totalQuantity?.toLocaleString() ?? '—'}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.totalValue)}
                            </TableCell>
                            <TableCell>{row.rate ?? '—'}%</TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.taxableValue)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.integratedTaxAmount)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.centralTaxAmount)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.stateUtTaxAmount)}
                            </TableCell>
                            <TableCell className={styles.numCol}>
                              {formatCurrency(row.cessAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'docs' && (
                <Stack gap="md">
                  <Text variant="heading3">Document Summary</Text>
                  <GstrSummaryGrid
                    items={
                      docsTab?.summary
                        ? [
                            {
                              label: 'Total Documents',
                              value: String(docsTab.summary.totalNumber),
                            },
                            {
                              label: 'Cancelled',
                              value: String(docsTab.summary.cancelled),
                            },
                          ]
                        : []
                    }
                  />
                  {docsData.length === 0 ? (
                    <EmptySection message="No document summary for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Nature of Document</TableHeaderCell>
                          <TableHeaderCell>Sr No From</TableHeaderCell>
                          <TableHeaderCell>Sr No To</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Total</TableHeaderCell>
                          <TableHeaderCell className={styles.numCol}>Cancelled</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {docsData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.natureOfDocument || '—'}</TableCell>
                            <TableCell>{row.srNoFrom || '—'}</TableCell>
                            <TableCell>{row.srNoTo || '—'}</TableCell>
                            <TableCell className={styles.numCol}>
                              {row.totalNumber ?? '—'}
                            </TableCell>
                            <TableCell className={styles.numCol}>{row.cancelled ?? '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}
            </CardBody>
          </Card>
        </>
      ) : null}
    </Stack>
  );
}

export default Gstr1Tab;
