import { useEffect, useState } from 'react';
import {
  Alert,
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
import { gstr3bApi } from '../api/gstr3b.api';
import { useGstr3bReportQuery } from '../queries/hooks';
import { formatCurrency, getDefaultPeriod, GstrReportHeader, GstrSummaryGrid } from '../ui';
import { numColStyle } from '../ui/tabNav';

export function Gstr3bTab() {
  const [period, setPeriod] = useState(getDefaultPeriod);
  const { data = null, isLoading, isError, error: queryError } = useGstr3bReportQuery(period);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isError) {
      setError(queryError instanceof Error ? queryError.message : 'Failed to load GSTR-3B report');
    } else {
      setError(null);
    }
  }, [isError, queryError]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const { blob, filename } = await gstr3bApi.downloadExcel(period);
      triggerBlobDownload(blob, filename);
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
    <Stack gap="md">
      <GstrReportHeader
        title="GSTR-3B Report"
        description="Monthly summary return – outward supplies, ITC, and tax payment"
        shopInfo={
          data
            ? `GSTIN: ${data.shopGstin || '—'} · ${data.legalName || '—'} · Period: ${data.period}`
            : undefined
        }
        periodId="gstr3b-period"
        period={period}
        onPeriodChange={setPeriod}
        periodDisabled={isLoading}
        downloads={[
          {
            label: '📥 Download Excel',
            loadingLabel: 'Downloading…',
            onClick: handleDownload,
            disabled: isLoading || isDownloading,
            loading: isDownloading,
          },
        ]}
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {isLoading ? (
        <CenteredLoader label="Loading GSTR-3B report…" />
      ) : data ? (
        <Card>
          <CardBody>
            <Stack gap="lg">
              <Stack gap="md">
                <Text variant="heading3">3.1 Outward & Inward Supplies</Text>
                <GstrSummaryGrid
                  items={[
                    {
                      label: 'Outward Taxable Value',
                      value: formatCurrency(s31?.outwardTaxableValue),
                    },
                    {
                      label: 'Outward IGST',
                      value: formatCurrency(s31?.outwardTaxableIgst),
                    },
                    {
                      label: 'Outward CGST',
                      value: formatCurrency(s31?.outwardTaxableCgst),
                    },
                    {
                      label: 'Outward SGST',
                      value: formatCurrency(s31?.outwardTaxableSgst),
                    },
                    {
                      label: 'Zero Rated (Export)',
                      value: formatCurrency(s31?.zeroRatedValue),
                    },
                  ]}
                />
              </Stack>

              {interState.length > 0 ? (
                <Stack gap="md">
                  <Text variant="heading3">3.2 Inter-State Supplies</Text>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Place of Supply</TableHeaderCell>
                        <TableHeaderCell style={numColStyle}>Taxable Value</TableHeaderCell>
                        <TableHeaderCell style={numColStyle}>Integrated Tax</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {interState.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{row.placeOfSupply || '—'}</TableCell>
                          <TableCell style={numColStyle}>
                            {formatCurrency(row.taxableValue)}
                          </TableCell>
                          <TableCell style={numColStyle}>
                            {formatCurrency(row.integratedTax)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Stack>
              ) : null}

              <Stack gap="md">
                <Text variant="heading3">4. Eligible ITC</Text>
                <GstrSummaryGrid
                  items={[
                    {
                      label: 'ITC Available (Other)',
                      value: `IGST: ${formatCurrency(s4?.itcOtherIgst)} · CGST: ${formatCurrency(
                        s4?.itcOtherCgst,
                      )} · SGST: ${formatCurrency(s4?.itcOtherSgst)}`,
                    },
                    {
                      label: 'ITC Reversed',
                      value: `CGST: ${formatCurrency(
                        s4?.itcReversedOthersCgst,
                      )} · SGST: ${formatCurrency(s4?.itcReversedOthersSgst)}`,
                    },
                  ]}
                />
              </Stack>

              {s5?.compExemptInterState != null || s5?.compExemptIntraState != null ? (
                <Stack gap="md">
                  <Text variant="heading3">5. Exempt / Nil / Non-GST Inward</Text>
                  <GstrSummaryGrid
                    items={[
                      {
                        label: 'Inter-State',
                        value: formatCurrency(s5.compExemptInterState),
                      },
                      {
                        label: 'Intra-State',
                        value: formatCurrency(s5.compExemptIntraState),
                      },
                    ]}
                  />
                </Stack>
              ) : null}

              <Stack gap="md">
                <Text variant="heading3">6.1 Payment of Tax</Text>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Tax Type</TableHeaderCell>
                      <TableHeaderCell style={numColStyle}>Payable</TableHeaderCell>
                      <TableHeaderCell style={numColStyle}>Paid by ITC</TableHeaderCell>
                      <TableHeaderCell style={numColStyle}>Paid in Cash</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Integrated Tax</TableCell>
                      <TableCell style={numColStyle}>{formatCurrency(s61?.igstPayable)}</TableCell>
                      <TableCell style={numColStyle}>
                        {formatCurrency(s61?.igstPaidByItc)}
                      </TableCell>
                      <TableCell style={numColStyle}>
                        {formatCurrency(s61?.igstPaidByCash)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Central Tax</TableCell>
                      <TableCell style={numColStyle}>{formatCurrency(s61?.cgstPayable)}</TableCell>
                      <TableCell style={numColStyle}>
                        {formatCurrency(
                          (s61?.cgstPaidByItcIgst ?? 0) +
                            (s61?.cgstPaidByItcCgst ?? 0) +
                            (s61?.cgstPaidByItcSgst ?? 0),
                        )}
                      </TableCell>
                      <TableCell style={numColStyle}>
                        {formatCurrency(s61?.cgstPaidByCash)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>State/UT Tax</TableCell>
                      <TableCell style={numColStyle}>{formatCurrency(s61?.sgstPayable)}</TableCell>
                      <TableCell style={numColStyle}>
                        {formatCurrency(
                          (s61?.sgstPaidByItcIgst ?? 0) +
                            (s61?.sgstPaidByItcCgst ?? 0) +
                            (s61?.sgstPaidByItcSgst ?? 0),
                        )}
                      </TableCell>
                      <TableCell style={numColStyle}>
                        {formatCurrency(s61?.sgstPaidByCash)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Cess</TableCell>
                      <TableCell style={numColStyle}>{formatCurrency(s61?.cessPayable)}</TableCell>
                      <TableCell style={numColStyle}>—</TableCell>
                      <TableCell style={numColStyle}>—</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Stack>
            </Stack>
          </CardBody>
        </Card>
      ) : null}
    </Stack>
  );
}

export default Gstr3bTab;
