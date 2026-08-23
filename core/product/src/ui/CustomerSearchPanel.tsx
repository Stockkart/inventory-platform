import { useState } from 'react';
import { Search, UserRound } from 'lucide-react';
import { customersApi, customerHasUniqueIdentifier } from '@inventory-platform/user/customers';
import type {
  CreateCustomerDto,
  CustomerPartyType,
  CustomerResponse,
} from '@inventory-platform/user/types';
import {
  Alert,
  Box,
  Button,
  FormField,
  FormRow,
  Icon,
  IconButton,
  Input,
  Label,
  Modal,
  Select,
  Stack,
  Text,
  productChrome,
} from '@inventory-platform/ui-kit';

const PARTY_TYPE_OPTIONS: Array<{ value: CustomerPartyType; label: string }> = [
  { value: 'CONSUMER', label: 'Consumer' },
  { value: 'RETAILER', label: 'Retailer' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'WHOLESALER', label: 'Wholesaler' },
];

export interface CustomerSearchPanelProps {
  selected: CustomerResponse | null;
  onSelect: (customer: CustomerResponse) => void;
  onClear: () => void;
  disabled?: boolean;
  idPrefix?: string;
}

function partyTypeLabel(partyType?: CustomerPartyType | null): string {
  if (!partyType) return 'Consumer';
  return PARTY_TYPE_OPTIONS.find((o) => o.value === partyType)?.label ?? partyType;
}

export function CustomerSearchPanel({
  selected,
  onSelect,
  onClear,
  disabled = false,
  idPrefix = 'customer',
}: CustomerSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerResponse[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateCustomerDto>({
    name: '',
    partyType: 'CONSUMER',
  });

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    setShowDropdown(true);
    try {
      const list = await customersApi.search(q);
      setResults(list);
      if (list.length === 1) {
        onSelect(list[0]);
        setShowDropdown(false);
        setQuery(list[0].name || list[0].phone || q);
      }
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const openCreate = () => {
    setCreateError(null);
    setForm({
      name: query.trim() || '',
      partyType: 'CONSUMER',
      phone: '',
      email: '',
      address: '',
      gstin: '',
      pan: '',
      dlNo: '',
    });
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    const name = form.name?.trim() ?? '';
    if (!name) {
      setCreateError('Customer name is required');
      return;
    }
    const partyType = form.partyType ?? 'CONSUMER';
    const hasUnique = customerHasUniqueIdentifier(form);
    if (!hasUnique) {
      setCreateError(
        'Add phone, email, GSTIN, PAN, or DL. Name and address alone stay on walk-in.',
      );
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const created = await customersApi.create({
        name,
        partyType,
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        address: form.address?.trim() || undefined,
        gstin: form.gstin?.trim() || undefined,
        pan: form.pan?.trim() || undefined,
        dlNo: form.dlNo?.trim() || undefined,
      });
      onSelect(created);
      setQuery(created.name || created.phone || '');
      setShowCreateModal(false);
      setShowDropdown(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setIsCreating(false);
    }
  };

  const clearSelection = () => {
    onClear();
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <Box className={productChrome.customerPartyStack}>
      <Box className={productChrome.customerPartySearchField}>
        <Label htmlFor={`${idPrefix}-customerSearch`}>Find customer</Label>
        <Box className={productChrome.customerPartySearchRow}>
          <Input
            type="search"
            id={`${idPrefix}-customerSearch`}
            placeholder="Name, phone, email, GST…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleSearch();
              }
            }}
            disabled={disabled || isSearching}
            className={productChrome.customerPartySearchInput}
            autoComplete="off"
          />
          <IconButton
            type="button"
            label={isSearching ? 'Searching' : 'Search customers'}
            className={productChrome.customerPartySearchBtn}
            onClick={() => void handleSearch()}
            disabled={disabled || isSearching || !query.trim()}
          >
            <Icon icon={Search} size="sm" />
          </IconButton>
        </Box>
      </Box>

      {showDropdown && results.length > 0 ? (
        <Box
          className={productChrome.customerPartyDropdown}
          role="listbox"
          aria-label="Matching customers"
        >
          {results.map((customer) => (
            <Button
              key={customer.customerId}
              type="button"
              variant="ghost"
              role="option"
              className={productChrome.customerPartyResult}
              onClick={() => {
                onSelect(customer);
                setQuery(customer.name || customer.phone || '');
                setShowDropdown(false);
              }}
            >
              <Text weight="semibold">{customer.name}</Text>
              <Text variant="caption" color="muted">
                {[customer.phone, customer.email, partyTypeLabel(customer.partyType)]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {customer.gstin ? (
                <Text variant="caption" color="muted">
                  GSTIN {customer.gstin}
                </Text>
              ) : null}
            </Button>
          ))}
        </Box>
      ) : null}

      {showDropdown && results.length === 0 && !isSearching ? (
        <Box className={productChrome.customerPartyEmpty}>
          <Box className={productChrome.customerPartyEmptyLead}>
            <Box className={productChrome.customerPartyEmptyIcon} aria-hidden>
              <Icon icon={Search} size="sm" />
            </Box>
            <Stack gap="xs">
              <Text className={productChrome.customerPartyEmptyTitle}>No match</Text>
              <Text className={productChrome.customerPartyEmptyHint}>
                Try another search, or save a new customer with phone or GST.
              </Text>
            </Stack>
          </Box>
          <Button type="button" variant="solid" fullWidth onClick={openCreate} disabled={disabled}>
            New customer
          </Button>
        </Box>
      ) : null}

      {selected ? (
        <Box className={productChrome.customerPartySelected}>
          <Box className={productChrome.customerPartySelectedTop}>
            <Box display="flex" align="center" gap="sm">
              <Box className={productChrome.customerPartyEmptyIcon} aria-hidden>
                <Icon icon={UserRound} size="sm" />
              </Box>
              <Stack gap="xs">
                <Text weight="semibold">{selected.name}</Text>
                <Text variant="caption" color="muted">
                  {[partyTypeLabel(selected.partyType), selected.phone, selected.email]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </Stack>
            </Box>
          </Box>
          {selected.address ? (
            <Text variant="caption" color="secondary">
              {selected.address}
            </Text>
          ) : null}
          {selected.gstin || selected.pan || selected.dlNo ? (
            <Text variant="caption" color="muted">
              {[
                selected.gstin ? `GSTIN ${selected.gstin}` : null,
                selected.pan ? `PAN ${selected.pan}` : null,
                selected.dlNo ? `DL ${selected.dlNo}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
          <Box className={productChrome.customerPartyActions}>
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={openCreate}
              disabled={disabled}
            >
              New customer
            </Button>
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={clearSelection}
              disabled={disabled}
            >
              Clear
            </Button>
          </Box>
        </Box>
      ) : !showDropdown ? (
        <Box className={productChrome.customerPartyEmpty}>
          <Box className={productChrome.customerPartyEmptyLead}>
            <Box className={productChrome.customerPartyEmptyIcon} aria-hidden>
              <Icon icon={UserRound} size="sm" />
            </Box>
            <Stack gap="xs">
              <Text className={productChrome.customerPartyEmptyTitle}>Walk-in sale</Text>
              <Text className={productChrome.customerPartyEmptyHint}>
                Search to attach a saved customer, or create one with phone, email, or GST.
              </Text>
            </Stack>
          </Box>
          <Button
            type="button"
            variant="solid"
            fullWidth
            onClick={openCreate}
            disabled={disabled || isCreating}
          >
            New customer
          </Button>
        </Box>
      ) : null}

      <Modal
        open={showCreateModal}
        onClose={() => !isCreating && setShowCreateModal(false)}
        size="md"
      >
        <Modal.Header
          title="New customer"
          onClose={() => !isCreating && setShowCreateModal(false)}
        />
        <Modal.Body>
          <Stack gap="md">
            {createError ? <Alert variant="danger">{createError}</Alert> : null}
            <FormField
              label="Name"
              required
              value={form.name ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              disabled={isCreating}
            />
            <FormField label="Party type">
              <Select
                value={form.partyType ?? 'CONSUMER'}
                options={PARTY_TYPE_OPTIONS}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    partyType: e.target.value as CustomerPartyType,
                  }))
                }
                disabled={isCreating}
              />
            </FormField>
            <FormRow>
              <FormField
                label="Phone"
                type="tel"
                value={form.phone ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                disabled={isCreating}
              />
              <FormField
                label="Email"
                type="email"
                value={form.email ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                disabled={isCreating}
              />
            </FormRow>
            <FormField
              label="Address"
              value={form.address ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
              multiline
              rows={2}
              disabled={isCreating}
            />
            <FormRow>
              <FormField
                label="GSTIN"
                value={form.gstin ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, gstin: v }))}
                disabled={isCreating}
              />
              <FormField
                label="PAN"
                value={form.pan ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, pan: v }))}
                disabled={isCreating}
              />
            </FormRow>
            <FormField
              label="DL No"
              value={form.dlNo ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, dlNo: v }))}
              disabled={isCreating}
            />
            <Text variant="caption" color="muted">
              Need at least one of phone, email, GSTIN, PAN, or DL.
            </Text>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowCreateModal(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="solid"
            onClick={() => void handleCreate()}
            disabled={isCreating}
          >
            {isCreating ? 'Creating…' : 'Create customer'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Box>
  );
}
