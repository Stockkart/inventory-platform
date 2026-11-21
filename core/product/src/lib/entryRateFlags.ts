/** Shop capability flags that decide which rate sections stock entry shows. */
export interface EntryRateFlagInputs {
  simplePricing: boolean;
  retailPricing: boolean;
  rateRules: boolean;
}

export interface EntryRateFlags {
  /** Schemes, item type, discount-applicable, generated rates (everyone but cafe). */
  showCommercialTerms: boolean;
  /** The hand-typed "Rates (optional)" editor and default rate select (distributors only). */
  showRateTiers: boolean;
  /** The server's generated-rates preview (any non-cafe shop with rate rules). */
  showGeneratedRates: boolean;
}

/**
 * Display flags only. Retailers with rate rules see the generated rates, never the legacy
 * hand-typed editor, so turning rules on does not change what a retailer can type.
 */
export function entryRateFlags({
  simplePricing,
  retailPricing,
  rateRules,
}: EntryRateFlagInputs): EntryRateFlags {
  const showCommercialTerms = !simplePricing;
  return {
    showCommercialTerms,
    showRateTiers: !simplePricing && !retailPricing,
    showGeneratedRates: showCommercialTerms && rateRules,
  };
}
