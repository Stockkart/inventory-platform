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
import { vendorsApi } from '../api/vendors.api';
import { VendorEditForm } from '../ui';
import type {
  VendorResponse,
  CreateVendorDto,
  UpdateVendorDto,
} from '@inventory-platform/user/types';

export function meta() {
  return [
    { title: 'Vendors - StockKart' },
    { name: 'description', content: 'Manage your vendor contacts' },
  ];
}

function formatAddress(addr: string | null | undefined) {
  if (!addr?.trim()) return '—';
  return addr.trim();
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
    void load();
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
      dlNo: vendor.dlNo ?? '',
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
        dlNo: createForm.dlNo?.trim() || undefined,
      });
      void load();
      handleCloseCreate();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to create vendor');
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
      void load();
      handleCloseEdit();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update vendor');
    } finally {
      setSaving(false);
    }
  };

  const goRegisterPurchaseFromVendor = (vendor: VendorResponse) => {
    navigate('/dashboard/product-entry', {
      state: { prefillVendor: vendor },
    });
  };

  const goReturnToVendor = (vendor: VendorResponse) => {
    navigate('/dashboard/vendor-return', {
      state: { prefillVendor: vendor },
    });
  };

  return (
    <Stack gap="md">
      <PageHeader description="Manage your vendor contacts" />

      <Inline gap="sm" flexWrap align="stretch" width="full">
        <Box flex="1" className={surfaceChrome.minW280}>
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            onSearch={handleSearch}
            showSearchButton
            buttonVariant="solid"
            grow
            placeholder="Search by name, email, phone…"
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
          New vendor
        </Button>
      </Inline>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Inline gap="md" flexWrap align="center">
        <Text as="span" className={surfaceChrome.pricingMeta}>
          {loading ? 'Loading…' : `${total} vendor${total === 1 ? '' : 's'}`}
          {query ? ` matching “${query}”` : null}
        </Text>
      </Inline>

      <Card>
        <CardBody>
          <Table className={surfaceChrome.customersTable}>
            <TableHead>
              <TableRow>
                <TableHeaderCell className={surfaceChrome.customersNameCell}>Name</TableHeaderCell>
                <TableHeaderCell className={surfaceChrome.customersPhoneCell}>
                  Phone
                </TableHeaderCell>
                <TableHeaderCell className={surfaceChrome.customersAddressCell}>
                  Address
                </TableHeaderCell>
                <TableHeaderCell className={surfaceChrome.customersIdCell}>DL no.</TableHeaderCell>
                <TableHeaderCell className={surfaceChrome.customersIdCell}>GSTIN</TableHeaderCell>
                <TableHeaderCell className={surfaceChrome.customersActionCell}>
                  Actions
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableLoadingRow colSpan={6} label="Loading vendors…" />
              ) : data.length === 0 ? (
                <TableEmptyRow
                  colSpan={6}
                  message={
                    query
                      ? 'No vendors match your search.'
                      : 'No vendors yet. Add one with New vendor, or they’ll appear when you register products.'
                  }
                />
              ) : (
                data.map((vendor) => (
                  <TableRow key={vendor.vendorId}>
                    <TableCell className={surfaceChrome.customersNameCell}>
                      <Text as="span" weight="medium">
                        {vendor.name ?? '—'}
                      </Text>
                    </TableCell>
                    <TableCell className={surfaceChrome.customersPhoneCell}>
                      {vendor.contactPhone ?? '—'}
                    </TableCell>
                    <TableCell
                      className={surfaceChrome.customersAddressCell}
                      title={vendor.address ?? undefined}
                    >
                      {formatAddress(vendor.address)}
                    </TableCell>
                    <TableCell className={surfaceChrome.customersIdCell}>
                      {vendor.dlNo ?? '—'}
                    </TableCell>
                    <TableCell className={surfaceChrome.customersIdCell}>
                      {vendor.gstinUin ?? '—'}
                    </TableCell>
                    <TableCell className={surfaceChrome.customersActionCell}>
                      <Box className={surfaceChrome.customersActionRow}>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => goRegisterPurchaseFromVendor(vendor)}
                          title="Open product registration with this vendor selected"
                        >
                          Buy
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => goReturnToVendor(vendor)}
                          title="Open Return to vendor for this supplier"
                        >
                          Return
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(vendor)}
                        >
                          Edit
                        </Button>
                      </Box>
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

      {editModal ? (
        <EditModal
          open
          title="Edit vendor"
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
            disabled={saving}
          />
        </EditModal>
      ) : null}

      {createModalOpen ? (
        <EditModal
          open
          title="New vendor"
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
            disabled={saving}
          />
        </EditModal>
      ) : null}
    </Stack>
  );
}
