/** "3-day trial" from the API's trial length (`trialDays`); "Free trial" when an older API omits it. */
export function trialLabel(trialDays: number | null | undefined): string {
  return trialDays != null && trialDays > 0 ? `${trialDays}-day trial` : 'Free trial';
}

/** "Free 3-day trial" for the landing carousel; "Free trial" without a trial length. */
export function freeTrialLabel(trialDays: number | null | undefined): string {
  return trialDays != null && trialDays > 0 ? `Free ${trialDays}-day trial` : 'Free trial';
}
