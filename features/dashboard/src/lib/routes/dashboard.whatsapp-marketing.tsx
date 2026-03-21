import { useCallback, useEffect, useState } from 'react';
import { customersApi } from '@inventory-platform/api';
import { EditModal } from '@inventory-platform/ui';
import type { CustomerResponse } from '@inventory-platform/types';
import styles from './dashboard.whatsapp-marketing.module.css';

const MOCK_TEMPLATES = [
  { id: 'welcome', name: 'Welcome Message', body: 'Hi {{name}}, welcome to our store! We\'re glad to have you.' },
  { id: 'order-update', name: 'Order Update', body: 'Hi {{name}}, your order has been shipped. Track it here: {{link}}' },
  { id: 'promo', name: 'Special Offer', body: 'Hi {{name}}, exclusive offer just for you! Get 20% off on your next purchase.' },
  { id: 'reminder', name: 'Payment Reminder', body: 'Hi {{name}}, this is a friendly reminder about your pending payment.' },
  { id: 'feedback', name: 'Feedback Request', body: 'Hi {{name}}, how was your experience? We\'d love to hear from you!' },
];

export function meta() {
  return [
    { title: 'WhatsApp Marketing - StockKart' },
    { name: 'description', content: 'Send WhatsApp messages to your customers' },
  ];
}

export default function WhatsAppMarketingPage() {
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState(MOCK_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(MOCK_TEMPLATES[0]?.id ?? '');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await customersApi.list({
        page,
        limit,
        q: query || undefined,
      });
      setCustomers(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, limit, query]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearch = () => {
    setQuery(searchInput.trim());
    setPage(0);
  };

  const toggleCustomer = (customerId: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedCustomerIds.size === customers.length) {
      setSelectedCustomerIds(new Set());
    } else {
      setSelectedCustomerIds(new Set(customers.map((c) => c.customerId)));
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) {
      setCreateError('Template name is required');
      return;
    }
    if (!newTemplateBody.trim()) {
      setCreateError('Template message is required');
      return;
    }
    const newTemplate = {
      id: `custom-${Date.now()}`,
      name: newTemplateName.trim(),
      body: newTemplateBody.trim(),
    };
    setTemplates((prev) => [...prev, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
    setNewTemplateName('');
    setNewTemplateBody('');
    setCreateError(null);
    setCreateModalOpen(false);
  };

  const handleCloseCreate = () => {
    setCreateModalOpen(false);
    setNewTemplateName('');
    setNewTemplateBody('');
    setCreateError(null);
  };

  const handleSendPreview = () => {
    const count = selectedCustomerIds.size;
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) return;
    // Frontend only - show confirmation message
    alert(
      `Preview: Would send "${template.name}" to ${count} customer${count !== 1 ? 's' : ''}.\n\nBackend integration coming soon.`
    );
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const hasPhone = (c: CustomerResponse) => c.phone && c.phone.trim().length > 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>WhatsApp Marketing</h1>
        <p className={styles.subtitle}>
          Select a template and customers to send WhatsApp messages
        </p>
      </div>

      <div className={styles.grid}>
        {/* Left: Template & Preview */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Message Template</h2>
          <div className={styles.templateRow}>
            <select
              className={styles.select}
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.createBtn}
              onClick={() => setCreateModalOpen(true)}
            >
              Create template
            </button>
          </div>

          {selectedTemplate && (
            <div className={styles.preview}>
              <div className={styles.previewLabel}>Preview</div>
              <div className={styles.previewBubble}>
                <div className={styles.previewText}>{selectedTemplate.body}</div>
                <div className={styles.previewHint}>
                  Variables like {'{{name}}'} will be replaced per customer.
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            className={styles.sendBtn}
            onClick={handleSendPreview}
            disabled={selectedCustomerIds.size === 0}
            title={
              selectedCustomerIds.size === 0
                ? 'Select at least one customer'
                : 'Preview (no backend)'
            }
          >
            Send to {selectedCustomerIds.size} customer
            {selectedCustomerIds.size !== 1 ? 's' : ''}
          </button>
        </section>

        {/* Right: Customer selection */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Select Recipients</h2>
          <div className={styles.searchRow}>
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
          </div>

          <div className={styles.selectAllRow}>
            <button type="button" className={styles.selectAllBtn} onClick={selectAll}>
              {selectedCustomerIds.size === customers.length
                ? 'Deselect all'
                : 'Select all'}
            </button>
            <span className={styles.selectedCount}>
              {selectedCustomerIds.size} selected
            </span>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.customerList}>
            {loading ? (
              <div className={styles.loading}>Loading customers…</div>
            ) : customers.length === 0 ? (
              <div className={styles.empty}>
                No customers found. Add customers from the Customer page.
              </div>
            ) : (
              customers.map((c) => {
                const hasValidPhone = hasPhone(c);
                const isSelected = selectedCustomerIds.has(c.customerId);
                return (
                  <label
                    key={c.customerId}
                    className={`${styles.customerRow} ${
                      !hasValidPhone ? styles.customerRowNoPhone : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCustomer(c.customerId)}
                      disabled={!hasValidPhone}
                      title={
                        !hasValidPhone ? 'No phone number – cannot send WhatsApp' : ''
                      }
                    />
                    <div className={styles.customerInfo}>
                      <span className={styles.customerName}>{c.name ?? '—'}</span>
                      <span className={styles.customerContact}>
                        {c.phone ?? '—'} {c.email ? ` • ${c.email}` : ''}
                      </span>
                    </div>
                    {!hasValidPhone && (
                      <span className={styles.noPhoneBadge}>No phone</span>
                    )}
                  </label>
                );
              })
            )}
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
            <span className={styles.pageInfo}>Page {page + 1}</span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={customers.length < limit}
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
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </section>
      </div>

      {createModalOpen && (
        <EditModal
          title="Create Template"
          onClose={handleCloseCreate}
          error={createError}
          onCancel={handleCloseCreate}
          onSave={handleCreateTemplate}
          saveLabel="Create"
        >
          <div className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="tpl-name" className={styles.label}>
                Template name
              </label>
              <input
                id="tpl-name"
                type="text"
                className={styles.input}
                placeholder="e.g. Welcome message"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="tpl-body" className={styles.label}>
                Message body
              </label>
              <textarea
                id="tpl-body"
                className={styles.textarea}
                placeholder="Hi {{name}}, your message here..."
                value={newTemplateBody}
                onChange={(e) => setNewTemplateBody(e.target.value)}
                rows={5}
              />
              <span className={styles.hint}>
                Use {'{{name}}'} for customer name, {'{{phone}}'} for phone.
              </span>
            </div>
          </div>
        </EditModal>
      )}
    </div>
  );
}
