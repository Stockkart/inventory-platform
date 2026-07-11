import { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  accountingChrome,
} from '@inventory-platform/ui-kit';
import { triggerBlobDownload } from '../api/download';
import { gstr2Api } from '../api/gstr2.api';
import { useGstr2ReportQuery } from '../queries/hooks';
import { formatCurrency, formatDate, getDefaultPeriod, GstrReportHeader, GstrSubTabs } from '../ui';
import { numColStyle } from '../ui/tabNav';

const TABS = [
  { id: 'b2b', label: 'B2B', title: 'B2B inward – registered suppliers' },
  { id: 'b2bur', label: 'B2BUR', title: 'B2B inward – unregistered' },
  { id: 'imps', label: 'IMPS', title: 'Import of services' },
  { id: 'impg', label: 'IMPG', title: 'Import of goods' },
  { id: 'cdnr', label: 'CDNR', title: 'Credit/Debit notes – registered' },
  { id: 'cdnur', label: 'CDNUR', title: 'Credit/Debit notes – unregistered' },
  { id: 'at', label: 'Advance', title: 'Advance Paid' },
  { id: 'atadj', label: 'Adv. Adj.', title: 'Advance Adjusted' },
  { id: 'exemp', label: 'Exempt', title: 'Exempt / Nil / Non-GST' },
  { id: 'itcr', label: 'ITC Rev.', title: 'ITC Reversal' },
  { id: 'hsnsum', label: 'HSN', title: 'HSN Summary' },
] as const;

type Gstr2SectionId = (typeof TABS)[number]['id'];

function EmptySection({ message }: { message: string }) {
  return <EmptyState title={message} />;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text as="h3" className={accountingChrome.overviewSectionTitle}>
      {children}
    </Text>
  );
}

export function Gstr2Tab() {
  const [period, setPeriod] = useState(getDefaultPeriod);
  const { data = null, isLoading, isError, error: queryError } = useGstr2ReportQuery(period);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Gstr2SectionId>('b2b');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isError) {
      setError(queryError instanceof Error ? queryError.message : 'Failed to load GSTR-2 report');
    } else {
      setError(null);
    }
  }, [isError, queryError]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const { blob, filename } = await gstr2Api.downloadExcel(period);
      triggerBlobDownload(blob, filename);
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
    <Stack gap="md">
      <GstrReportHeader
        description="Inward supplies for the period — download Excel for your GSTR-2 working papers."
        periodId="gstr2-period"
        period={period}
        onPeriodChange={setPeriod}
        periodDisabled={isLoading}
        downloads={[
          {
            label: 'Download Excel',
            loadingLabel: 'Downloading…',
            onClick: handleDownload,
            disabled: isLoading || isDownloading,
            loading: isDownloading,
          },
        ]}
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {isLoading ? (
        <CenteredLoader label="Loading GSTR-2 report…" />
      ) : data ? (
        <>
          <GstrSubTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

          <Card>
            <CardBody>
              {activeTab === 'b2b' && (
                <Stack gap="md">
                  <SectionTitle>B2B Inward Supplies (Registered Suppliers)</SectionTitle>
                  {b2bData.length === 0 ? (
                    <EmptySection message="No B2B inward supplies for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Supplier GSTIN</TableHeaderCell>
                          <TableHeaderCell>Invoice No</TableHeaderCell>
                          <TableHeaderCell>Date</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Invoice Value</TableHeaderCell>
                          <TableHeaderCell>Place of Supply</TableHeaderCell>
                          <TableHeaderCell>Rate %</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Taxable Value</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>CGST</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>SGST</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {b2bData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.supplierGstin || '—'}</TableCell>
                            <TableCell>{row.invoiceNo || '—'}</TableCell>
                            <TableCell>{formatDate(row.invoiceDate ?? '')}</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.invoiceValue)}
                            </TableCell>
                            <TableCell>{row.placeOfSupply || '—'}</TableCell>
                            <TableCell>{row.rate ?? '—'}%</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.taxableValue)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.centralTaxPaid)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.stateUtTaxPaid)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'b2bur' && (
                <Stack gap="md">
                  <SectionTitle>B2BUR Inward Supplies (Unregistered Suppliers)</SectionTitle>
                  {b2burData.length === 0 ? (
                    <EmptySection message="No B2BUR inward supplies for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Supplier Name</TableHeaderCell>
                          <TableHeaderCell>Invoice No</TableHeaderCell>
                          <TableHeaderCell>Date</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Invoice Value</TableHeaderCell>
                          <TableHeaderCell>Place of Supply</TableHeaderCell>
                          <TableHeaderCell>Rate %</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Taxable Value</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>CGST</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>SGST</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {b2burData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.supplierName || '—'}</TableCell>
                            <TableCell>{row.invoiceNo || '—'}</TableCell>
                            <TableCell>{formatDate(row.invoiceDate ?? '')}</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.invoiceValue)}
                            </TableCell>
                            <TableCell>{row.placeOfSupply || '—'}</TableCell>
                            <TableCell>{row.rate ?? '—'}%</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.taxableValue)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.centralTaxPaid)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.stateUtTaxPaid)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'imps' && (
                <Stack gap="md">
                  <SectionTitle>Import of Services</SectionTitle>
                  {impsData.length === 0 ? (
                    <EmptySection message="No import of services for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Invoice No</TableHeaderCell>
                          <TableHeaderCell>Date</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Invoice Value</TableHeaderCell>
                          <TableHeaderCell>Place of Supply</TableHeaderCell>
                          <TableHeaderCell>Rate %</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Taxable Value</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>IGST</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {impsData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.invoiceNo || '—'}</TableCell>
                            <TableCell>{formatDate(row.invoiceDate ?? '')}</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.invoiceValue)}
                            </TableCell>
                            <TableCell>{row.placeOfSupply || '—'}</TableCell>
                            <TableCell>{row.rate ?? '—'}%</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.taxableValue)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.integratedTaxPaid)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'impg' && (
                <Stack gap="md">
                  <SectionTitle>Import of Goods</SectionTitle>
                  {impgData.length === 0 ? (
                    <EmptySection message="No import of goods for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Port</TableHeaderCell>
                          <TableHeaderCell>Bill of Entry No</TableHeaderCell>
                          <TableHeaderCell>Date</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Bill Value</TableHeaderCell>
                          <TableHeaderCell>Rate %</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Taxable Value</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>IGST</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {impgData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.portCode || '—'}</TableCell>
                            <TableCell>{row.billOfEntryNo || '—'}</TableCell>
                            <TableCell>{formatDate(row.billOfEntryDate ?? '')}</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.billOfEntryValue)}
                            </TableCell>
                            <TableCell>{row.rate ?? '—'}%</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.taxableValue)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.integratedTaxPaid)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'cdnr' && (
                <Stack gap="md">
                  <SectionTitle>Credit/Debit Notes from Registered Suppliers</SectionTitle>
                  {cdnrData.length === 0 ? (
                    <EmptySection message="No CDNR entries for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Supplier GSTIN</TableHeaderCell>
                          <TableHeaderCell>Note No</TableHeaderCell>
                          <TableHeaderCell>Note date</TableHeaderCell>
                          <TableHeaderCell>Original invoice</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Note Value</TableHeaderCell>
                          <TableHeaderCell>Rate %</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Taxable Value</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>CGST</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>SGST</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cdnrData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.supplierGstin || '—'}</TableCell>
                            <TableCell>{row.noteNumber || '—'}</TableCell>
                            <TableCell>{formatDate(row.noteDate ?? '')}</TableCell>
                            <TableCell>
                              {(row.invoiceNo || '—') +
                                (row.invoiceDate ? ` (${formatDate(row.invoiceDate)})` : '')}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.noteValue)}
                            </TableCell>
                            <TableCell>{row.rate ?? '—'}%</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.taxableValue)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.centralTaxPaid)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.stateUtTaxPaid)}
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
                  <SectionTitle>Credit/Debit Notes from Unregistered Suppliers</SectionTitle>
                  {cdnurData.length === 0 ? (
                    <EmptySection message="No CDNUR entries for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Note No</TableHeaderCell>
                          <TableHeaderCell>Note date</TableHeaderCell>
                          <TableHeaderCell>Original invoice</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Note Value</TableHeaderCell>
                          <TableHeaderCell>Rate %</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Taxable Value</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cdnurData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.noteNumber || '—'}</TableCell>
                            <TableCell>{formatDate(row.noteDate ?? '')}</TableCell>
                            <TableCell>
                              {(row.invoiceNo || '—') +
                                (row.invoiceDate ? ` (${formatDate(row.invoiceDate)})` : '')}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.noteValue)}
                            </TableCell>
                            <TableCell>{row.rate ?? '—'}%</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.taxableValue)}
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
                  <SectionTitle>Tax on Advance Paid</SectionTitle>
                  {atData.length === 0 ? (
                    <EmptySection message="No advance tax entries for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Place of Supply</TableHeaderCell>
                          <TableHeaderCell>Rate %</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Gross Advance Paid</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Cess</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {atData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.placeOfSupply || '—'}</TableCell>
                            <TableCell>{row.rate ?? '—'}%</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.grossAdvancePaid)}
                            </TableCell>
                            <TableCell style={numColStyle}>
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
                  <SectionTitle>Advance Adjustment</SectionTitle>
                  {atadjData.length === 0 ? (
                    <EmptySection message="No advance adjustment entries for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Place of Supply</TableHeaderCell>
                          <TableHeaderCell>Rate %</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Advance to Adjust</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Cess Adjusted</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {atadjData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.placeOfSupply || '—'}</TableCell>
                            <TableCell>{row.rate ?? '—'}%</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.grossAdvanceToBeAdjusted)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.cessAdjusted)}
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
                  <SectionTitle>Exempt / Nil / Non-GST Supplies</SectionTitle>
                  {exempData.length === 0 ? (
                    <EmptySection message="No exempt entries for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Description</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Composition</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Nil Rated</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Exempted</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Non-GST</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {exempData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.description || '—'}</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.compositionTaxablePerson)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.nilRatedSupplies)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.exemptedOtherThanNilOrNonGst)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.nonGstSupplies)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'itcr' && (
                <Stack gap="md">
                  <SectionTitle>ITC Reversal</SectionTitle>
                  {itcrData.length === 0 ? (
                    <EmptySection message="No ITC reversal entries for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Description</TableHeaderCell>
                          <TableHeaderCell>Add/Reduce</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>IGST</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>CGST</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>SGST</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Cess</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {itcrData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.description || '—'}</TableCell>
                            <TableCell>{row.toBeAddedOrReduced || '—'}</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.itcIntegratedTaxAmount)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.itcCentralTaxAmount)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.itcStateUtTaxAmount)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.itcCessAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              )}

              {activeTab === 'hsnsum' && (
                <Stack gap="md">
                  <SectionTitle>HSN Summary</SectionTitle>
                  {hsnData.length === 0 ? (
                    <EmptySection message="No HSN summary for this period." />
                  ) : (
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>HSN</TableHeaderCell>
                          <TableHeaderCell>Description</TableHeaderCell>
                          <TableHeaderCell>UQC</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Qty</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Total Value</TableHeaderCell>
                          <TableHeaderCell>Rate %</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>Taxable Value</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>CGST</TableHeaderCell>
                          <TableHeaderCell style={numColStyle}>SGST</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {hsnData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.hsn || '—'}</TableCell>
                            <TableCell>{row.description || '—'}</TableCell>
                            <TableCell>{row.uqc || '—'}</TableCell>
                            <TableCell style={numColStyle}>{row.totalQuantity ?? '—'}</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.totalValue)}
                            </TableCell>
                            <TableCell>{row.rate ?? '—'}%</TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.taxableValue)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.centralTaxAmount)}
                            </TableCell>
                            <TableCell style={numColStyle}>
                              {formatCurrency(row.stateUtTaxAmount)}
                            </TableCell>
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

export default Gstr2Tab;
