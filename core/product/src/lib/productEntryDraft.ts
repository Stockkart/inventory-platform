/**
 * Keeps a half-finished product entry alive across a page refresh.
 *
 * Scanning a vendor bill runs OCR and fills the grid with rows the operator then
 * corrects by hand. Before this, a refresh threw all of that away and the bill had
 * to be scanned again.
 *
 * Unlike the vendor in `sellSession`, this uses localStorage rather than
 * sessionStorage, so the draft also survives closing the tab or the browser. That
 * buys two obligations localStorage does not give us for free: the key is scoped to
 * the shop, because a counter PC is shared and one shop's half-typed invoice must
 * not surface for the next; and the payload carries a timestamp, because
 * localStorage never expires on its own and a stale draft reappearing as if it were
 * today's work is worse than losing it.
 */

const DRAFT_KEY_PREFIX = 'sk-product-entry-draft';

/**
 * How long a draft stays restorable. Long enough that a real interruption — a power
 * cut, a machine restart, a shift ending mid-bill — does not lose the work, short
 * enough that an abandoned draft does not resurface looking current. A bill left
 * unfinished longer than this has almost certainly been entered another way, and
 * restore is silent, so a stale draft arrives with nothing to say it is stale.
 */
export const DRAFT_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;

export interface ProductEntryDraft<TProduct = unknown, TVendor = unknown> {
  /** Epoch millis. Used only to age the draft out; never shown to the operator. */
  savedAt: number;
  products: TProduct[];
  /**
   * The vendor the bill is being entered against. Carried here rather than in
   * sessionStorage so it survives a browser restart alongside the rows it belongs
   * to; a draft that came back with its lines but no vendor was worse than either
   * outcome on its own.
   */
  vendor?: TVendor | null;
  billingMode?: string;
  vendorInvoiceNo?: string;
  vendorInvoiceDate?: string;
  vendorLineSubTotal?: string;
  vendorTaxTotal?: string;
  vendorShippingCharge?: string;
  vendorOtherCharges?: string;
  vendorOverallDiscount?: string;
  vendorRoundOff?: string;
  vendorInvoiceTotal?: string;
}

/**
 * The shop the draft belongs to. Read from the same key the API layer sends as
 * X-Shop-Id, so a draft cannot outlive a shop switch.
 */
function draftKey(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const shopId = localStorage.getItem('x_shop_id')?.trim();
    return shopId ? `${DRAFT_KEY_PREFIX}:${shopId}` : null;
  } catch {
    // Browsers set to block site data throw on access rather than returning null.
    return null;
  }
}

/**
 * Persist the draft. Failures are swallowed: localStorage throws when it is full or
 * when the browser blocks site data, and a form that refuses to accept typing is a
 * worse outcome than a draft that quietly does not survive a refresh.
 */
export function saveProductEntryDraft<TProduct, TVendor = unknown>(
  draft: Omit<ProductEntryDraft<TProduct, TVendor>, 'savedAt'>,
): void {
  const key = draftKey();
  if (!key) return;
  try {
    const payload: ProductEntryDraft<TProduct, TVendor> = { ...draft, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Out of quota or storage denied. Drop the stale entry rather than leave a
    // partial one that would restore worse data than nothing.
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing further we can do */
    }
  }
}

/**
 * The saved draft, or null when there is none, it is unreadable, or it has aged out.
 * An expired or corrupt draft is removed on read so it cannot be offered again.
 */
export function readProductEntryDraft<TProduct, TVendor = unknown>(): ProductEntryDraft<
  TProduct,
  TVendor
> | null {
  const key = draftKey();
  if (!key) return null;
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ProductEntryDraft<TProduct, TVendor>;
    const fresh =
      typeof parsed?.savedAt === 'number' && Date.now() - parsed.savedAt < DRAFT_MAX_AGE_MS;
    // A vendor is usually chosen before the bill is scanned, so a draft holding only
    // a vendor is still worth keeping: losing it means re-picking on every refresh.
    const hasContent =
      (Array.isArray(parsed.products) && parsed.products.length > 0) || Boolean(parsed.vendor);
    const usable = fresh && hasContent;
    if (!usable) {
      clearProductEntryDraft();
      return null;
    }
    return parsed;
  } catch {
    clearProductEntryDraft();
    return null;
  }
}

/** Forget the draft. Called once the entry has been submitted, or the form cleared. */
export function clearProductEntryDraft(): void {
  const key = draftKey();
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing further we can do */
  }
}
