import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useNotify, useAuthStore, useVerticalSchemaStore } from '@inventory-platform/session';
import type { CustomerResponse } from '@inventory-platform/user/types';
import type { EstimateSummary, QuotationSummary } from '@inventory-platform/product/types';
import { cartApi } from '../api/cart.api';
import { estimatesApi } from '../api/estimates.api';
import { estimateWorkspaceHref } from '../lib/estimatePaths';
import { rememberOpenQuotationId } from '../lib/sellSession';
import { AddToCartDestinationPicker, type CartDestination } from './AddToCartDestinationPicker';
import { AddToSellQuotationPicker } from './AddToSellQuotationPicker';
import { AddToEstimatePicker } from './AddToEstimatePicker';

type Step = 'destination' | 'quotation' | 'estimate';

function customerCartFields(customer: CustomerResponse) {
  return {
    customerId: customer.customerId,
    customerName: customer.name || '',
    customerPhone: customer.phone || '',
    customerEmail: customer.email || '',
    customerAddress: customer.address || '',
    customerGstin: customer.gstin || '',
    customerDlNo: customer.dlNo || '',
    customerPan: customer.pan || customer.panNo || '',
    customerPartyType: customer.partyType ?? 'CONSUMER',
  };
}

export function CustomerSellDestinationFlow({
  customer,
  open,
  sellPath,
  onClose,
}: {
  customer: CustomerResponse | null;
  open: boolean;
  sellPath: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { error: notifyError } = useNotify;
  const activeShopId = useAuthStore((s) => s.user?.shopId ?? null);
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
  const [step, setStep] = useState<Step>('destination');
  const [busy, setBusy] = useState(false);
  const [quotations, setQuotations] = useState<QuotationSummary[]>([]);
  const [estimates, setEstimates] = useState<EstimateSummary[]>([]);
  const [businessType, setBusinessType] = useState('medical');

  useEffect(() => {
    if (!open) {
      setStep('destination');
      setBusy(false);
      setQuotations([]);
      setEstimates([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !activeShopId) return;
    void fetchShopSchema('regular').then((schema) => {
      if (schema?.verticalId && schema.shopId === activeShopId) {
        setBusinessType(schema.verticalId);
      }
    });
  }, [open, activeShopId, fetchShopSchema]);

  if (!open || !customer) {
    return null;
  }

  const goToDocument = (kind: CartDestination, purchaseId: string) => {
    if (kind === 'sell') {
      rememberOpenQuotationId(purchaseId);
    }
    const href =
      kind === 'estimate'
        ? estimateWorkspaceHref({ purchaseId })
        : `${sellPath}?purchaseId=${encodeURIComponent(purchaseId)}`;
    navigate(href, { state: { prefillCustomer: customer } });
    onClose();
  };

  const handleDestinationSelect = async (destination: CartDestination) => {
    setBusy(true);
    try {
      if (destination === 'sell') {
        const list = (await cartApi.listQuotations()).quotations;
        setQuotations(list);
        setStep('quotation');
        return;
      }
      const list = (await estimatesApi.list('OPEN', { size: 100 })).estimates;
      setEstimates(list);
      setStep('estimate');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to load open documents');
    } finally {
      setBusy(false);
    }
  };

  const handleNewQuotation = async () => {
    setBusy(true);
    try {
      const cart = await cartApi.createQuotation({
        businessType,
        ...customerCartFields(customer),
      });
      goToDocument('sell', cart.purchaseId);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to create quotation');
      setBusy(false);
    }
  };

  const handleNewEstimate = async () => {
    setBusy(true);
    try {
      const cart = await estimatesApi.create({
        businessType,
        ...customerCartFields(customer),
      });
      goToDocument('estimate', cart.purchaseId);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to create estimate');
      setBusy(false);
    }
  };

  return (
    <>
      <AddToCartDestinationPicker
        open={step === 'destination'}
        title="Start sale"
        promptPrefix="Choose where to add"
        productLabel={customer.name || 'this customer'}
        isSubmitting={busy}
        onSelect={(destination) => void handleDestinationSelect(destination)}
        onCancel={onClose}
      />
      <AddToSellQuotationPicker
        open={step === 'quotation'}
        productLabel={customer.name || 'this customer'}
        quotations={quotations}
        isSubmitting={busy}
        onSelect={(purchaseId) => goToDocument('sell', purchaseId)}
        onNewQuotation={() => void handleNewQuotation()}
        onCancel={onClose}
        onBack={() => {
          if (busy) return;
          setStep('destination');
        }}
      />
      <AddToEstimatePicker
        open={step === 'estimate'}
        productLabel={customer.name || 'this customer'}
        estimates={estimates}
        isSubmitting={busy}
        onSelect={(purchaseId) => goToDocument('estimate', purchaseId)}
        onNewEstimate={() => void handleNewEstimate()}
        onCancel={onClose}
        onBack={() => {
          if (busy) return;
          setStep('destination');
        }}
      />
    </>
  );
}
