import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Button,
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
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { useResolvedSellPath } from '@inventory-platform/routing';
import { useAuthStore, useShopCapabilitiesStore } from '@inventory-platform/session';
import { customersApi } from '../api/customers.api';
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
  if (!addr) return '—';
  return addr.length > 50 ? `${addr.slice(0, 50)}…` : addr;
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
  const [createForm, setCreateForm] = useState<CreateCustomerDto>({ name: '' });
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
      setData(res.data ?? []);
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
    setEditModal(customer);
    setEditForm({
      name: customer.name ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? undefined,
      address: customer.address ?? undefined,
      gstin: customer.gstin ?? undefined,
      dlNo: customer.dlNo ?? undefined,
    });
    setSaveError(null);
  };

  const handleCloseEdit = () => {
    setEditModal(null);
    setSaveError(null);
  };

  const handleOpenCreate = () => {
    setCreateForm({ name: '' });
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
    setSaving(true);
    setSaveError(null);
    try {
      await customersApi.create({
        name: createForm.name.trim(),
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
      <PageHeader
        description="Manage your customer contacts"
        actions={
          <Button variant="solid" onClick={handleOpenCreate}>
            New customer
          </Button>
        }
      />

      <SearchInput
        value={searchInput}
        onChange={setSearchInput}
        onSearch={handleSearch}
        showSearchButton
        placeholder="Search by name, phone, email…"
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Phone</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Address</TableHeaderCell>
            <TableHeaderCell>GSTIN</TableHeaderCell>
            <TableHeaderCell>DL No</TableHeaderCell>
            <TableHeaderCell className={surfaceChrome.minW14Nowrap}>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableLoadingRow colSpan={7} label="Loading customers…" />
          ) : data.length === 0 ? (
            <TableEmptyRow
              colSpan={7}
              message='No customers found. Add one with "New customer" or they’ll appear when you complete a sale.'
            />
          ) : (
            data.map((customer) => (
              <TableRow key={customer.customerId}>
                <TableCell>{customer.name ?? '—'}</TableCell>
                <TableCell>{customer.phone ?? '—'}</TableCell>
                <TableCell>{customer.email ?? '—'}</TableCell>
                <TableCell>{formatAddress(customer.address)}</TableCell>
                <TableCell>{customer.gstin ?? '—'}</TableCell>
                <TableCell>{customer.dlNo ?? '—'}</TableCell>
                <TableCell>
                  <Inline gap="sm" flexWrap>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => goScanSellWithCustomer(customer)}
                      title="Open Scan and Sell with this customer filled in"
                    >
                      Sell
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => goReturnWithCustomer(customer)}
                      title="Open Return to customer with this customer prefilled"
                    >
                      Return
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(customer)}
                    >
                      Edit
                    </Button>
                  </Inline>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <PaginationBar
        page={page}
        totalPages={Math.max(totalPages, 1)}
        totalItems={total}
        disabled={loading}
        onPageChange={setPage}
        pageSize={limit}
        pageSizeOptions={[10, 20, 50]}
        onPageSizeChange={(n) => {
          setPage(0);
          setLimit(n);
        }}
        aria-label="Customer pages"
      />

      {editModal ? (
        <EditModal
          open
          title="Edit Customer"
          onClose={handleCloseEdit}
          error={saveError}
          onCancel={handleCloseEdit}
          onSave={handleSave}
          saving={saving}
        >
          <CustomerEditForm
            value={editForm}
            onChange={setEditForm}
            panNo={editModal.panNo ?? editModal.pan}
          />
        </EditModal>
      ) : null}

      {createModalOpen ? (
        <EditModal
          open
          title="New Customer"
          onClose={handleCloseCreate}
          error={saveError}
          onCancel={handleCloseCreate}
          onSave={handleCreate}
          saving={saving}
          saveLabel="Create"
        >
          <CustomerEditForm
            value={createForm}
            onChange={(v) => setCreateForm((prev) => ({ ...prev, ...v }))}
          />
        </EditModal>
      ) : null}
    </Stack>
  );
}
