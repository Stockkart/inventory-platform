import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { customersApi } from '../api/customers.api';
import { EditModal, PaginationBar } from '@inventory-platform/ui-kit';
import { CustomerEditForm } from '../ui';
import { useResolvedSellPath } from '@inventory-platform/routing';
import type {
  CustomerResponse,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '@inventory-platform/types';
import { useAuthStore, useShopCapabilitiesStore } from '@inventory-platform/store';
import styles from '././customers.module.css';

export function meta() {
  return [
    { title: 'Customers - StockKart' },
    { name: 'description', content: 'Manage your customer contacts' },
  ];
}

export function CustomersPage() {
  const navigate = useNavigate();
  const activeShopId = useAuthStore((s) => s.user?.shopId ?? null);
  const shopCapabilities = useShopCapabilitiesStore((s) =>
    activeShopId ? s.byShopId[activeShopId] : undefined
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
    load();
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
      // PAN not included - derived from GSTIN, read-only in form
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
      load();
      handleCloseCreate();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to create customer'
      );
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
      load();
      handleCloseEdit();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to update customer'
      );
    } finally {
      setSaving(false);
    }
  };

  const formatAddress = (addr: string | null | undefined) => {
    if (!addr) return '—';
    return addr.length > 50 ? addr.slice(0, 50) + '…' : addr;
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

  if (loading && data.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Customers</h1>
          <p className={styles.subtitle}>Manage your customer contacts</p>
        </div>
        <div className={styles.loading}>Loading…</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Customers</h1>
        <p className={styles.subtitle}>Manage your customer contacts</p>
      </div>

      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search by name, phone, email…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          type="button"
          className={styles.searchBtn}
          onClick={handleSearch}
        >
          Search
        </button>
        <button
          type="button"
          className={styles.addBtn}
          onClick={handleOpenCreate}
        >
          New customer
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>GSTIN</th>
              <th>DL No</th>
              <th className={styles.actionsCol}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyCell}>
                  No customers found. Add one with “New customer” or they’ll
                  appear when you complete a sale.
                </td>
              </tr>
            ) : (
              data.map((c) => (
                <tr key={c.customerId}>
                  <td>{c.name ?? '—'}</td>
                  <td>{c.phone ?? '—'}</td>
                  <td>{c.email ?? '—'}</td>
                  <td>{formatAddress(c.address)}</td>
                  <td>{c.gstin ?? '—'}</td>
                  <td>{c.dlNo ?? '—'}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.sellBtn}
                        onClick={() => goScanSellWithCustomer(c)}
                        title="Open Scan and Sell with this customer filled in"
                      >
                        Sell
                      </button>
                      <button
                        type="button"
                        className={styles.returnBtn}
                        onClick={() => goReturnWithCustomer(c)}
                        title="Open Return to customer with this customer prefilled"
                      >
                        Return
                      </button>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => handleOpenEdit(c)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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

      {editModal && (
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
      )}

      {createModalOpen && (
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
      )}
    </div>
  );
}
