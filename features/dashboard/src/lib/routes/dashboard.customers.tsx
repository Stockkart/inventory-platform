import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { customersApi } from '@inventory-platform/api';
import { EditModal, CustomerEditForm } from '@inventory-platform/ui';
import type {
  CustomerResponse,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '@inventory-platform/types';
import styles from './dashboard.customers.module.css';

export function meta() {
  return [
    { title: 'Customers - StockKart' },
    { name: 'description', content: 'Manage your customer contacts' },
  ];
}

export default function CustomersPage() {
  const navigate = useNavigate();
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
    navigate('/dashboard/scan-sell', {
      state: { prefillCustomer: customer },
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
              <th>PAN</th>
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
                  <td>{c.panNo ?? c.pan ?? '—'}</td>
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

      <div className={styles.paginationBar}>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span className={styles.pageInfo}>
          Page {page + 1} of {Math.max(totalPages, 1)} • {total} total
        </span>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={totalPages <= 1 || page >= totalPages - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
        <select
          className={styles.pageSizeSelect}
          value={limit}
          onChange={(e) => {
            setPage(0);
            setLimit(Number(e.target.value));
          }}
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>

      {editModal && (
        <EditModal
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
