import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { vendorsApi } from '../api/vendors.api';
import { EditModal, PaginationBar } from '@inventory-platform/ui-kit';
import { VendorEditForm } from '../ui';
import type { VendorResponse, CreateVendorDto, UpdateVendorDto } from '@inventory-platform/user/types';
import styles from '././vendors.module.css';

export function meta() {
  return [
    { title: 'Vendors - StockKart' },
    { name: 'description', content: 'Manage your vendor contacts' },
  ];
}

export function VendorsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<VendorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [editModal, setEditModal] = useState<VendorResponse | null>(null);
  const [editForm, setEditForm] = useState<UpdateVendorDto>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateVendorDto>({
    name: '',
    contactPhone: '',
    businessType: 'RETAIL',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await vendorsApi.list({ page, limit, q: query || undefined });
      setData(res.data ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vendors');
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

  const handleOpenEdit = (vendor: VendorResponse) => {
    setEditModal(vendor);
    setEditForm({
      name: vendor.name ?? '',
      contactPhone: vendor.contactPhone ?? '',
      contactEmail: vendor.contactEmail ?? '',
      address: vendor.address ?? '',
      companyName: vendor.companyName ?? '',
      businessType: vendor.businessType ?? '',
      gstinUin: vendor.gstinUin ?? '',
    });
    setSaveError(null);
  };

  const handleCloseEdit = () => {
    setEditModal(null);
    setSaveError(null);
  };

  const handleOpenCreate = () => {
    setCreateForm({
      name: '',
      contactPhone: '',
      businessType: 'RETAIL',
    });
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
    if (!createForm.contactPhone?.trim() && !createForm.contactEmail?.trim()) {
      setSaveError('Either phone or email is required');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await vendorsApi.create({
        name: createForm.name.trim(),
        contactPhone: createForm.contactPhone?.trim() || '',
        contactEmail: createForm.contactEmail?.trim() || undefined,
        address: createForm.address?.trim() || undefined,
        businessType: createForm.businessType ?? 'RETAIL',
        gstinUin: createForm.gstinUin?.trim() || undefined,
      });
      load();
      handleCloseCreate();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to create vendor'
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
      await vendorsApi.update(editModal.vendorId, editForm);
      load();
      handleCloseEdit();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to update vendor'
      );
    } finally {
      setSaving(false);
    }
  };

  const formatAddress = (addr: string | null | undefined) => {
    if (!addr) return '—';
    return addr.length > 50 ? addr.slice(0, 50) + '…' : addr;
  };

  const goRegisterPurchaseFromVendor = (vendor: VendorResponse) => {
    navigate('/dashboard/product-registration', {
      state: { prefillVendor: vendor },
    });
  };

  const goReturnToVendor = (vendor: VendorResponse) => {
    navigate('/dashboard/vendor-return', {
      state: { prefillVendor: vendor },
    });
  };

  if (loading && data.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Vendors</h1>
          <p className={styles.subtitle}>Manage your vendor contacts</p>
        </div>
        <div className={styles.loading}>Loading…</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vendors</h1>
        <p className={styles.subtitle}>Manage your vendor contacts</p>
      </div>

      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search by name, email, phone…"
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
          New vendor
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact Phone</th>
              <th>Address</th>
              <th>Email</th>
              <th>Business Type</th>
              <th>GSTIN</th>
              <th className={styles.actionsCol}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyCell}>
                  No vendors found. Vendors are added when you register products
                  with a vendor.
                </td>
              </tr>
            ) : (
              data.map((v) => (
                <tr key={v.vendorId}>
                  <td>{v.name ?? '—'}</td>
                  <td>{v.contactPhone ?? '—'}</td>
                  <td>{formatAddress(v.address)}</td>
                  <td>{v.contactEmail ?? '—'}</td>
                  <td>{v.businessType ?? '—'}</td>
                  <td>{v.gstinUin ?? '—'}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.buyStockBtn}
                        onClick={() => goRegisterPurchaseFromVendor(v)}
                        title="Open product registration with this vendor selected"
                      >
                        Buy
                      </button>
                      <button
                        type="button"
                        className={styles.returnBtn}
                        onClick={() => goReturnToVendor(v)}
                        title="Open Return to vendor for this supplier"
                      >
                        Return
                      </button>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => handleOpenEdit(v)}
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
        aria-label="Vendor pages"
      />

      {editModal && (
        <EditModal
          open
          title="Edit Vendor"
          onClose={handleCloseEdit}
          error={saveError}
          onCancel={handleCloseEdit}
          onSave={handleSave}
          saving={saving}
        >
          <VendorEditForm
            value={editForm}
            onChange={(v) =>
              setEditForm((prev) => ({
                ...prev,
                ...v,
                businessType: v.businessType as UpdateVendorDto['businessType'],
              }))
            }
          />
        </EditModal>
      )}

      {createModalOpen && (
        <EditModal
          open
          title="New Vendor"
          onClose={handleCloseCreate}
          error={saveError}
          onCancel={handleCloseCreate}
          onSave={handleCreate}
          saving={saving}
          saveLabel="Create"
        >
          <VendorEditForm
            value={createForm}
            onChange={(v) =>
              setCreateForm((prev) => ({
                ...prev,
                ...v,
                businessType: (v.businessType ??
                  prev.businessType) as CreateVendorDto['businessType'],
              }))
            }
          />
        </EditModal>
      )}
    </div>
  );
}
