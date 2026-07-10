import { useCallback, useEffect, useState } from 'react';
import { customersApi } from '@inventory-platform/user/customers';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Checkbox,
  EditModal,
  EmptyState,
  Box,
  FormField,
  Inline,
  Input,
  PageHeader,
  PaginationBar,
  SearchInput,
  Select,
  Stack,
  Text,
  Textarea,
} from '@inventory-platform/ui-kit';
import type { CustomerResponse } from '@inventory-platform/user/types';
import styles from './whatsapp-marketing.module.css';

const MOCK_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Message',
    body: "Hi {{name}}, welcome to our store! We're glad to have you.",
  },
  {
    id: 'order-update',
    name: 'Order Update',
    body: 'Hi {{name}}, your order has been shipped. Track it here: {{link}}',
  },
  {
    id: 'promo',
    name: 'Special Offer',
    body: 'Hi {{name}}, exclusive offer just for you! Get 20% off on your next purchase.',
  },
  {
    id: 'reminder',
    name: 'Payment Reminder',
    body: 'Hi {{name}}, this is a friendly reminder about your pending payment.',
  },
  {
    id: 'feedback',
    name: 'Feedback Request',
    body: "Hi {{name}}, how was your experience? We'd love to hear from you!",
  },
];

export function meta() {
  return [
    { title: 'WhatsApp Marketing - StockKart' },
    { name: 'description', content: 'Send WhatsApp messages to your customers' },
  ];
}

export function WhatsAppMarketingPage() {
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
    alert(
      `Preview: Would send "${template.name}" to ${count} customer${
        count !== 1 ? 's' : ''
      }.\n\nBackend integration coming soon.`,
    );
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const hasPhone = (c: CustomerResponse) => c.phone && c.phone.trim().length > 0;

  return (
    <Stack gap="md" className={styles.container}>
      <PageHeader
        title="WhatsApp Marketing"
        description="Select a template and customers to send WhatsApp messages"
      />

      <Box display="grid" className={styles.grid}>
        <Card className={styles.section}>
          <CardBody>
            <Text variant="title" weight="semibold" className={styles.sectionTitle}>
              Message Template
            </Text>
            <Inline gap="sm" className={styles.templateRow}>
              <Select
                className={styles.select}
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                options={templates.map((t) => ({
                  value: t.id,
                  label: t.name,
                }))}
              />
              <Button
                type="button"
                variant="outline"
                className={styles.createBtn}
                onClick={() => setCreateModalOpen(true)}
              >
                Create template
              </Button>
            </Inline>

            {selectedTemplate ? (
              <Stack gap="sm" className={styles.preview}>
                <Text variant="label" color="secondary" className={styles.previewLabel}>
                  Preview
                </Text>
                <Card className={styles.previewBubble}>
                  <CardBody>
                    <Text className={styles.previewText}>{selectedTemplate.body}</Text>
                    <Text color="secondary" variant="caption" className={styles.previewHint}>
                      Variables like {'{{name}}'} will be replaced per customer.
                    </Text>
                  </CardBody>
                </Card>
              </Stack>
            ) : null}

            <Button
              type="button"
              variant="solid"
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
            </Button>
          </CardBody>
        </Card>

        <Card className={styles.section}>
          <CardBody>
            <Text variant="title" weight="semibold" className={styles.sectionTitle}>
              Select Recipients
            </Text>
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              onSearch={handleSearch}
              showSearchButton
              placeholder="Search by name, phone, email…"
              className={styles.searchRow}
            />

            <Inline gap="sm" className={styles.selectAllRow} justify="between">
              <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
                {selectedCustomerIds.size === customers.length ? 'Deselect all' : 'Select all'}
              </Button>
              <Text color="secondary" className={styles.selectedCount}>
                {selectedCustomerIds.size} selected
              </Text>
            </Inline>

            {error ? <Alert variant="danger">{error}</Alert> : null}

            <Stack gap="none" className={styles.customerList}>
              {loading ? (
                <CenteredLoader label="Loading customers…" />
              ) : customers.length === 0 ? (
                <EmptyState
                  title="No customers found"
                  description="Add customers from the Customer page."
                />
              ) : (
                customers.map((c) => {
                  const hasValidPhone = hasPhone(c);
                  const isSelected = selectedCustomerIds.has(c.customerId);
                  return (
                    <Checkbox
                      key={c.customerId}
                      className={`${styles.customerRow} ${
                        !hasValidPhone ? styles.customerRowNoPhone : ''
                      }`}
                      checked={isSelected}
                      onChange={() => toggleCustomer(c.customerId)}
                      disabled={!hasValidPhone}
                      title={!hasValidPhone ? 'No phone number – cannot send WhatsApp' : ''}
                      label={
                        <Inline
                          gap="sm"
                          className={styles.customerInfo}
                          justify="between"
                          width="full"
                        >
                          <Stack gap="xs">
                            <Text weight="semibold" className={styles.customerName}>
                              {c.name ?? '—'}
                            </Text>
                            <Text color="secondary" className={styles.customerContact}>
                              {c.phone ?? '—'} {c.email ? ` • ${c.email}` : ''}
                            </Text>
                          </Stack>
                          {!hasValidPhone ? (
                            <Badge variant="warning" className={styles.noPhoneBadge}>
                              No phone
                            </Badge>
                          ) : null}
                        </Inline>
                      }
                    />
                  );
                })
              )}
            </Stack>

            <PaginationBar
              page={page}
              prevDisabled={page === 0}
              nextDisabled={customers.length < limit}
              disabled={loading}
              onPageChange={setPage}
              pageSize={limit}
              pageSizeOptions={[20, 50, 100]}
              onPageSizeChange={(n) => {
                setPage(0);
                setLimit(n);
              }}
              aria-label="Marketing customer picker pages"
            />
          </CardBody>
        </Card>
      </Box>

      {createModalOpen ? (
        <EditModal
          open
          title="Create Template"
          onClose={handleCloseCreate}
          error={createError}
          onCancel={handleCloseCreate}
          onSave={handleCreateTemplate}
          saveLabel="Create"
        >
          <Stack gap="md" className={styles.form}>
            <FormField label="Template name" id="tpl-name">
              <Input
                id="tpl-name"
                type="text"
                placeholder="e.g. Welcome message"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </FormField>
            <FormField
              label="Message body"
              id="tpl-body"
              hint={`Use {{name}} for customer name, {{phone}} for phone.`}
            >
              <Textarea
                id="tpl-body"
                placeholder="Hi {{name}}, your message here..."
                value={newTemplateBody}
                onChange={(e) => setNewTemplateBody(e.target.value)}
                rows={5}
              />
            </FormField>
          </Stack>
        </EditModal>
      ) : null}
    </Stack>
  );
}
