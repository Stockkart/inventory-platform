import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  EditModal,
  Inline,
  PageHeader,
  PaginationBar,
  SearchInput,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableLoadingRow,
  TableRow,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { useResolvedSellPath } from '@inventory-platform/routing';
import { useAuthStore, useShopCapabilitiesStore } from '@inventory-platform/session';
import { customersApi, customerHasUniqueIdentifier } from '../api/customers.api';
import { CustomerEditForm } from '../ui';
import type {
  CustomerResponse,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '@inventory-platform/user/types';

export function meta() {
  return [
    { title: 'Customers - StockKart' },
    { name: 'description', content: 'Manage your customer contacts' },
  ];
}

function formatAddress(addr: string | null | undefined) {
  if (!addr?.trim()) return '—';
  return addr.trim();
}

function partyTypeLabel(partyType?: string | null) {
  if (!partyType || partyType === 'CONSUMER') return 'Consumer';
  return partyType.charAt(0) + partyType.slice(1).toLowerCase();
}

export function CustomersPage() {
  const navigate = useNavigate();
  const activeShopId = useAuthStore((s) => s.user?.shopId ?? null);
  const shopCapabilities = useShopCapabilitiesStore((s) =>
    activeShopId ? s.byShopId[activeShopId] : undefined,
  );
  const sellPath = useResolvedSellPath(shopCapabilities ?? null);
  const [data, setData] = useState<CustomerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [editModal, setEditModal] = useState<CustomerResponse | null>(null);
  const [editForm, setEditForm] = useState<UpdateCustomerDto>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateCustomerDto>({
    name: '',
    partyType: 'CONSUMER',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await customersApi.list({
        page,
        limit,
        q: query || undefined,
      });
      setData((res.data ?? []).filter((c) => !c.isGeneral));
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, limit, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSearch = () => {
    setQuery(searchInput.trim());
    setPage(0);
  };

  const handleOpenEdit = (customer: CustomerResponse) => {
    if (customer.isGeneral) {
      setSaveError('The general customer placeholder cannot be edited');
      return;
    }
    setEditModal(customer);
    setEditForm({
      name: customer.name ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? undefined,
      address: customer.address ?? undefined,
      gstin: customer.gstin ?? undefined,
      dlNo: customer.dlNo ?? undefined,
      pan: customer.pan ?? undefined,
      partyType: customer.partyType ?? 'CONSUMER',
    });
    setSaveError(null);
  };

  const handleCloseEdit = () => {
    setEditModal(null);
    setSaveError(null);
  };

  const handleOpenCreate = () => {
    setCreateForm({ name: '', partyType: 'CONSUMER' });
    setSaveError(null);
    setCreateModalOpen(true);
  };

  const handleCloseCreate = () => {
    setCreateModalOpen(false);
    setSaveError(null);
  };

  const handleCreate = async () => {
    if (!createForm.name?.trim()) {
      setSaveError('Name is required');
      return;
    }
    if (!customerHasUniqueIdentifier(createForm)) {
      setSaveError(
        'Add phone, email, GSTIN, PAN, or DL to create a unique customer. Name and address alone use the general customer on bills.',
      );
      return;
    }
    const partyType = createForm.partyType ?? 'CONSUMER';
    setSaving(true);
    setSaveError(null);
    try {
      await customersApi.create({
        name: createForm.name.trim(),
        partyType,
        phone: createForm.phone?.trim() || undefined,
        email: createForm.email?.trim() || undefined,
        address: createForm.address?.trim() || undefined,
        gstin: createForm.gstin?.trim() || undefined,
        dlNo: createForm.dlNo?.trim() || undefined,
        pan: createForm.pan?.trim() || undefined,
      });
      void load();
      handleCloseCreate();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editModal) return;
    if (!customerHasUniqueIdentifier(editForm)) {
      setSaveError('Keep at least one of phone, email, GSTIN, PAN, or DL');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await customersApi.update(editModal.customerId, editForm);
      void load();
      handleCloseEdit();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const goScanSellWithCustomer = (customer: CustomerResponse) => {
    navigate(sellPath, {
      state: { prefillCustomer: customer },
    });
  };

  const goReturnWithCustomer = (customer: CustomerResponse) => {
    navigate('/dashboard/refund', {
      state: { prefillCustomer: customer, prefillTab: 'process' },
    });
  };

  return (
    <Stack gap="md">
      <PageHeader description="Manage your customer contacts" />

      <Inline gap="sm" flexWrap align="stretch" width="full">
        <Box flex="1" className={surfaceChrome.minW280}>
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            onSearch={handleSearch}
            showSearchButton
            buttonVariant="solid"
            grow
            placeholder="Search by name, phone, email, GST, PAN, DL…"
            disabled={loading}
            searchLabel={loading ? 'Searching…' : 'Search'}
          />
        </Box>
        <Button
          type="button"
          variant="solid"
          onClick={handleOpenCreate}
          className={surfaceChrome.flexShrink0}
        >
          New customer
        </Button>
      </Inline>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Inline gap="md" flexWrap align="center">
        <Text as="span" className={surfaceChrome.pricingMeta}>
          {loading ? 'Loading…' : `${total} customer${total === 1 ? '' : 's'}`}
          {query ? ` matching “${query}”` : null}
        </Text>
      </Inline>

      <Card>
        <CardBody>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Phone</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Address</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableLoadingRow colSpan={6} />
              ) : data.length === 0 ? (
                <TableEmptyRow colSpan={6} message="No customers found" />
              ) : (
                data.map((customer) => (
                  <TableRow key={customer.customerId}>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{partyTypeLabel(customer.partyType)}</TableCell>
                    <TableCell>{customer.phone || '—'}</TableCell>
                    <TableCell>{customer.email || '—'}</TableCell>
                    <TableCell>{formatAddress(customer.address)}</TableCell>
                    <TableCell>
                      <Inline gap="sm">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleOpenEdit(customer)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => goScanSellWithCustomer(customer)}
                        >
                          Sell
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => goReturnWithCustomer(customer)}
                        >
                          Return
                        </Button>
                      </Inline>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        totalItems={total}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setLimit(n);
          setPage(0);
        }}
      />

      <EditModal
        open={createModalOpen}
        title="New customer"
        onClose={handleCloseCreate}
        onCancel={handleCloseCreate}
        onSave={() => void handleCreate()}
        saving={saving}
        error={saveError}
        saveLabel="Create"
      >
        <CustomerEditForm value={createForm} onChange={setCreateForm} disabled={saving} />
      </EditModal>

      <EditModal
        open={editModal !== null}
        title="Edit customer"
        onClose={handleCloseEdit}
        onCancel={handleCloseEdit}
        onSave={() => void handleSave()}
        saving={saving}
        error={saveError}
      >
        {editModal ? (
          <CustomerEditForm
            value={editForm}
            onChange={setEditForm}
            panNo={editModal.panNo}
            disabled={saving}
          />
        ) : null}
      </EditModal>
    </Stack>
  );
}
