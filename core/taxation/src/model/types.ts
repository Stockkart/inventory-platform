// GSTR-1 Taxation types
export interface B2bSezDeLine {
  recipientGstin: string;
  receiverName: string;
  invoiceNo: string;
  invoiceDate: string;
  invoiceValue: number;
  placeOfSupply: string;
  reverseCharge: string;
  applicableTaxPct: string;
  invoiceType: string;
  ecommerceGstin: string;
  rate: number;
  taxableValue: number;
  cessAmount: number;
}

export interface Gstr1B2bSummary {
  noOfRecipients: number;
  noOfInvoices: number;
  totalInvoiceValue: number;
  taxableValue: number;
  cessAmount: number;
}

export interface Gstr1B2bSezDeTab {
  summary: Gstr1B2bSummary;
  lines: B2bSezDeLine[];
}

export interface Gstr1InvoiceLine {
  invoiceNo?: string;
  invoiceDate?: string;
  invoiceValue?: number;
  placeOfSupply: string;
  applicableTaxPct: string;
  rate: number;
  taxableValue: number;
  cessAmount: number;
  ecommerceGstin?: string;
  [key: string]: unknown;
}

export interface Gstr1B2clSummary {
  noOfInvoices: number;
  totalInvoiceValue: number;
  totalTaxableValue: number;
  totalCess: number;
}

export interface Gstr1B2clTab {
  summary: Gstr1B2clSummary;
  lines: Gstr1InvoiceLine[];
}

export interface B2csLine {
  type: string;
  placeOfSupply: string;
  applicableTaxPct: string;
  rate: number;
  taxableValue: number;
  cessAmount: number;
  ecommerceGstin: string;
}

export interface Gstr1B2csSummary {
  totalTaxableValue: number;
  totalCess: number;
}

export interface Gstr1B2csTab {
  summary: Gstr1B2csSummary;
  lines: B2csLine[];
}

export interface Gstr1RefundLine {
  registered: boolean;
  recipientGstin: string;
  receiverName: string;
  noteNumber: string;
  noteDate: string;
  noteType: string;
  placeOfSupply: string;
  reverseCharge: string;
  noteSupplyType: string;
  noteValue: number;
  applicableTaxPct: string;
  rate: number;
  taxableValue: number;
  cessAmount: number;
  urType: string;
}

export interface Gstr1CdnrSummary {
  noOfRecipients: number;
  noOfNotes: number;
  totalNoteValue: number;
  totalTaxableValue: number;
  totalCess: number;
}

export interface Gstr1CdnrTab {
  summary: Gstr1CdnrSummary;
  lines: Gstr1RefundLine[];
}

export interface Gstr1CdnurSummary {
  noOfNotes: number;
  totalNoteValue: number;
  totalTaxableValue: number;
  totalCess: number;
}

export interface Gstr1CdnurTab {
  summary: Gstr1CdnurSummary;
  lines: Gstr1RefundLine[];
}

export interface Gstr1ExpSummary {
  noOfInvoices: number;
  totalInvoiceValue: number;
  noOfShippingBills: number;
  totalTaxableValue: number;
}

export interface Gstr1ExpTab {
  summary: Gstr1ExpSummary;
  lines: Gstr1InvoiceLine[];
}

export interface Gstr1AdvanceLine {
  placeOfSupply: string;
  applicableTaxPct: string;
  rate: number;
  grossAdvanceReceivedOrAdjusted: number;
  cessAmount: number;
  adjusted: boolean;
}

export interface Gstr1AtSummary {
  totalAdvanceReceived: number;
  totalCess: number;
}

export interface Gstr1AtTab {
  summary: Gstr1AtSummary;
  lines: Gstr1AdvanceLine[];
}

export interface Gstr1AtadjSummary {
  totalAdvanceAdjusted: number;
  totalCess: number;
}

export interface Gstr1AtadjTab {
  summary: Gstr1AtadjSummary;
  lines: Gstr1AdvanceLine[];
}

export interface Gstr1ExemptLine {
  description: string;
  nilRatedSupplies: number;
  exemptedOtherThanNilOrNonGst: number;
  nonGstSupplies: number;
}

export interface Gstr1ExempSummary {
  totalNilRatedSupplies: number;
  totalExemptedSupplies: number;
  totalNonGstSupplies: number;
}

export interface Gstr1ExempTab {
  summary: Gstr1ExempSummary;
  lines: Gstr1ExemptLine[];
}

export interface Gstr1HsnLine {
  hsn: string;
  description: string;
  uqc: string;
  totalQuantity: number;
  totalValue: number;
  rate: number;
  taxableValue: number;
  integratedTaxAmount: number;
  centralTaxAmount: number;
  stateUtTaxAmount: number;
  cessAmount: number;
  b2b: boolean;
}

export interface Gstr1HsnSummary {
  noOfHsn: number;
  totalValue: number;
  totalTaxableValue: number;
  totalIntegratedTax: number;
  totalCentralTax: number;
  totalStateUtTax: number;
  totalCess: number;
}

export interface Gstr1HsnTab {
  summary: Gstr1HsnSummary;
  lines: Gstr1HsnLine[];
}

export interface Gstr1DocumentSummaryLine {
  natureOfDocument: string;
  srNoFrom: string;
  srNoTo: string;
  totalNumber: number;
  cancelled: number;
}

export interface Gstr1DocsSummary {
  totalNumber: number;
  cancelled: number;
}

export interface Gstr1DocsTab {
  summary: Gstr1DocsSummary;
  lines: Gstr1DocumentSummaryLine[];
}

export interface Gstr1ReportResponse {
  shopId: string;
  shopGstin: string;
  period: string;
  year: number;
  month: number;
  'b2b,sez,de': Gstr1B2bSezDeTab;
  b2cl: Gstr1B2clTab;
  b2cs: Gstr1B2csTab;
  cdnr: Gstr1CdnrTab;
  cdnur: Gstr1CdnurTab;
  exp: Gstr1ExpTab;
  at: Gstr1AtTab;
  atadj: Gstr1AtadjTab;
  exemp: Gstr1ExempTab;
  'hsn(b2b)': Gstr1HsnTab;
  'hsn(b2c)': Gstr1HsnTab;
  docs: Gstr1DocsTab;
}

// GSTR-2 types (inward supplies)
export interface Gstr2B2bLineDto {
  supplierGstin?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  invoiceValue?: number;
  placeOfSupply?: string;
  reverseCharge?: string;
  invoiceType?: string;
  rate?: number;
  taxableValue?: number;
  integratedTaxPaid?: number;
  centralTaxPaid?: number;
  stateUtTaxPaid?: number;
  cessAmount?: number;
  itcEligibility?: string;
  availedItcIntegrated?: number;
  availedItcCentral?: number;
  availedItcStateUt?: number;
  availedItcCess?: number;
}

export interface Gstr2B2burLineDto {
  supplierName?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  invoiceValue?: number;
  placeOfSupply?: string;
  supplyType?: string;
  rate?: number;
  taxableValue?: number;
  integratedTaxPaid?: number;
  centralTaxPaid?: number;
  stateUtTaxPaid?: number;
  cessAmount?: number;
  itcEligibility?: string;
  availedItcIntegrated?: number;
  availedItcCentral?: number;
  availedItcStateUt?: number;
  availedItcCess?: number;
}

export interface Gstr2ImpsLineDto {
  invoiceNo?: string;
  invoiceDate?: string;
  invoiceValue?: number;
  placeOfSupply?: string;
  rate?: number;
  taxableValue?: number;
  integratedTaxPaid?: number;
  cessPaid?: number;
  itcEligibility?: string;
  availedItcIntegrated?: number;
  availedItcCess?: number;
}

export interface Gstr2ImpgLineDto {
  portCode?: string;
  billOfEntryNo?: string;
  billOfEntryDate?: string;
  billOfEntryValue?: number;
  documentType?: string;
  sezSupplierGstin?: string;
  rate?: number;
  taxableValue?: number;
  integratedTaxPaid?: number;
  cessPaid?: number;
  itcEligibility?: string;
  availedItcIntegrated?: number;
  availedItcCess?: number;
}

export interface Gstr2CdnrLineDto {
  supplierGstin?: string;
  noteNumber?: string;
  noteDate?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  preGst?: string;
  documentType?: string;
  reasonForIssuing?: string;
  supplyType?: string;
  noteValue?: number;
  rate?: number;
  taxableValue?: number;
  integratedTaxPaid?: number;
  centralTaxPaid?: number;
  stateUtTaxPaid?: number;
  cessPaid?: number;
  itcEligibility?: string;
  availedItcIntegrated?: number;
}

export interface Gstr2CdnurLineDto {
  noteNumber?: string;
  noteDate?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  preGst?: string;
  documentType?: string;
  reasonForIssuing?: string;
  supplyType?: string;
  invoiceType?: string;
  noteValue?: number;
  rate?: number;
  taxableValue?: number;
  integratedTaxPaid?: number;
  centralTaxPaid?: number;
  stateUtTaxPaid?: number;
  cessPaid?: number;
  itcEligibility?: string;
  availedItcIntegrated?: number;
}

export interface Gstr2AtLineDto {
  placeOfSupply?: string;
  rate?: number;
  grossAdvancePaid?: number;
  cessAmount?: number;
}

export interface Gstr2AtadjLineDto {
  placeOfSupply?: string;
  rate?: number;
  grossAdvanceToBeAdjusted?: number;
  cessAdjusted?: number;
}

export interface Gstr2ExempLineDto {
  description?: string;
  compositionTaxablePerson?: number;
  nilRatedSupplies?: number;
  exemptedOtherThanNilOrNonGst?: number;
  nonGstSupplies?: number;
}

export interface Gstr2ItcrLineDto {
  description?: string;
  toBeAddedOrReduced?: string;
  itcIntegratedTaxAmount?: number;
  itcCentralTaxAmount?: number;
  itcStateUtTaxAmount?: number;
  itcCessAmount?: number;
}

export interface Gstr2HsnLineDto {
  hsn?: string;
  description?: string;
  uqc?: string;
  totalQuantity?: number;
  totalValue?: number;
  rate?: number;
  taxableValue?: number;
  integratedTaxAmount?: number;
  centralTaxAmount?: number;
  stateUtTaxAmount?: number;
  cessAmount?: number;
}

export interface Gstr2TabDto<T> {
  lines: T[];
}

export interface Gstr2ReportResponse {
  shopId: string;
  shopGstin: string;
  period: string;
  year: number;
  month: number;
  b2b: Gstr2TabDto<Gstr2B2bLineDto>;
  b2bur: Gstr2TabDto<Gstr2B2burLineDto>;
  imps: Gstr2TabDto<Gstr2ImpsLineDto>;
  impg: Gstr2TabDto<Gstr2ImpgLineDto>;
  cdnr: Gstr2TabDto<Gstr2CdnrLineDto>;
  cdnur: Gstr2TabDto<Gstr2CdnurLineDto>;
  at: Gstr2TabDto<Gstr2AtLineDto>;
  atadj: Gstr2TabDto<Gstr2AtadjLineDto>;
  exemp: Gstr2TabDto<Gstr2ExempLineDto>;
  itcr: Gstr2TabDto<Gstr2ItcrLineDto>;
  hsnsum: Gstr2TabDto<Gstr2HsnLineDto>;
}

// GSTR-3B types
export interface Gstr3bSection31Dto {
  outwardTaxableValue?: number;
  outwardTaxableIgst?: number;
  outwardTaxableCgst?: number;
  outwardTaxableSgst?: number;
  outwardTaxableCess?: number;
  zeroRatedValue?: number;
  zeroRatedIgst?: number;
  nilExemptValue?: number;
  inwardRcmValue?: number;
  inwardRcmIgst?: number;
  inwardRcmCgst?: number;
  inwardRcmSgst?: number;
  inwardRcmCess?: number;
  nonGstValue?: number;
}

export interface Gstr3bInterStateSupplyDto {
  placeOfSupply?: string;
  taxableValue?: number;
  integratedTax?: number;
}

export interface Gstr3bSection4Dto {
  itcOtherIgst?: number;
  itcOtherCgst?: number;
  itcOtherSgst?: number;
  itcReversedOthersIgst?: number;
  itcReversedOthersCgst?: number;
  itcReversedOthersSgst?: number;
}

export interface Gstr3bSection5Dto {
  compExemptInterState?: number;
  compExemptIntraState?: number;
  nonGstInterState?: number;
  nonGstIntraState?: number;
}

export interface Gstr3bSection61Dto {
  igstPayable?: number;
  igstPaidByItc?: number;
  igstPaidByCash?: number;
  cgstPayable?: number;
  cgstPaidByItcIgst?: number;
  cgstPaidByItcCgst?: number;
  cgstPaidByItcSgst?: number;
  cgstPaidByCash?: number;
  sgstPayable?: number;
  sgstPaidByItcIgst?: number;
  sgstPaidByItcCgst?: number;
  sgstPaidByItcSgst?: number;
  sgstPaidByCash?: number;
  cessPayable?: number;
}

export interface Gstr3bReportResponse {
  shopId: string;
  shopGstin: string;
  legalName: string;
  period: string;
  year: number;
  month: number;
  section31?: Gstr3bSection31Dto;
  interStateSupplies?: Gstr3bInterStateSupplyDto[];
  section4?: Gstr3bSection4Dto;
  section5?: Gstr3bSection5Dto;
  section61?: Gstr3bSection61Dto;
}
