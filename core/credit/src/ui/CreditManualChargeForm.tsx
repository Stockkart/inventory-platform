import { useState } from 'react';
import type { CreateCreditEntryDto, CreditPartyType } from '@inventory-platform/credit/types';
import styles from './credit.module.css';

type Props = {
  submitting: boolean;
  onSubmit: (body: CreateCreditEntryDto) => Promise<void>;
};

/**
 * Full party fields for the first manual charge when no credit accounts exist yet.
 */
export function CreditManualChargeForm({ submitting, onSubmit }: Props) {
  const [partyType, setPartyType] = useState<CreditPartyType>('CUSTOMER');
  const [partyId, setPartyId] = useState('');
  const [partyDisplayName, setPartyDisplayName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [referenceId, setReferenceId] = useState('');

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const amt = Number(amount.trim().replace(/,/g, ''));
    if (!partyId.trim() || !partyDisplayName.trim() || !Number.isFinite(amt) || amt <= 0) {
      return;
    }
    await onSubmit({
      partyType,
      partyId: partyId.trim(),
      partyDisplayName: partyDisplayName.trim(),
      partyPhone: partyPhone.trim() || undefined,
      amount: amt,
      note: note.trim() || undefined,
      referenceType: referenceType.trim() || undefined,
      referenceId: referenceId.trim() || undefined,
    });
    setAmount('');
    setNote('');
  }

  return (
    <div className={styles.manualChargeCard}>
      <h3 className={styles.manualChargeTitle}>Create your first credit balance</h3>
      <p className={styles.manualChargeIntro}>
        No parties in the ledger yet. Add a charge to open a customer or vendor account. After
        that, pick the party in the sidebar — you won&apos;t need to enter ids again.
      </p>
      <form className={styles.manualChargeForm} onSubmit={handleSubmit}>
        <div className={styles.manualRow}>
          <div className={styles.compactField}>
            <label className={styles.compactLabel} htmlFor="manual-party-kind">
              Party type
            </label>
            <select
              id="manual-party-kind"
              className={styles.compactInput}
              value={partyType}
              onChange={(e) => setPartyType(e.target.value as CreditPartyType)}
              disabled={submitting}
            >
              <option value="CUSTOMER">Customer</option>
              <option value="VENDOR">Vendor</option>
            </select>
          </div>
          <div className={styles.compactField}>
            <label className={styles.compactLabel} htmlFor="manual-party-id">
              Party id
            </label>
            <input
              id="manual-party-id"
              type="text"
              className={styles.compactInput}
              placeholder="Mongo / internal id used elsewhere"
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
        </div>
        <div className={styles.manualRow}>
          <div className={styles.compactField}>
            <label className={styles.compactLabel} htmlFor="manual-party-name">
              Display name
            </label>
            <input
              id="manual-party-name"
              type="text"
              className={styles.compactInput}
              placeholder="Name shown in the ledger"
              value={partyDisplayName}
              onChange={(e) => setPartyDisplayName(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          <div className={styles.compactField}>
            <label className={styles.compactLabel} htmlFor="manual-party-phone">
              Phone <span className={styles.optionalMark}>(optional)</span>
            </label>
            <input
              id="manual-party-phone"
              type="text"
              className={styles.compactInput}
              inputMode="tel"
              placeholder="Contact"
              value={partyPhone}
              onChange={(e) => setPartyPhone(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>
        <div className={styles.manualRow}>
          <div className={styles.compactField}>
            <label className={styles.compactLabel} htmlFor="manual-amt">
              Amount (₹)
            </label>
            <input
              id="manual-amt"
              type="text"
              inputMode="decimal"
              className={styles.amountInput}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          <div className={styles.compactField}>
            <label className={styles.compactLabel} htmlFor="manual-note">
              Note <span className={styles.optionalMark}>(optional)</span>
            </label>
            <input
              id="manual-note"
              type="text"
              className={styles.compactInput}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>
        <details className={styles.advancedDetails}>
          <summary className={styles.advancedSummary}>Reference (optional)</summary>
          <div className={styles.advancedFields}>
            <input
              aria-label="Reference type"
              type="text"
              className={styles.compactInput}
              value={referenceType}
              onChange={(e) => setReferenceType(e.target.value)}
              placeholder="Reference type"
              disabled={submitting}
            />
            <input
              aria-label="Reference id"
              type="text"
              className={styles.compactInput}
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="Reference id"
              disabled={submitting}
            />
          </div>
        </details>
        <button type="submit" className={styles.primarySubmit} disabled={submitting}>
          {submitting ? 'Saving…' : 'Add charge & open ledger'}
        </button>
      </form>
    </div>
  );
}
