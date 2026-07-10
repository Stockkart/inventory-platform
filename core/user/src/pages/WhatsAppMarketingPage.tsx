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
  FormField,
  Grid,
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
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader
        title="WhatsApp Marketing"
        description="Select a template and customers to send WhatsApp messages"
      />

      <Grid columns={2} gap="md" width="full">
        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="title" weight="semibold">
                Message Template
              </Text>
              <Inline gap="sm" width="full">
                <Select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  options={templates.map((t) => ({
                    value: t.id,
                    label: t.name,
                  }))}
                />
                <Button type="button" variant="outline" onClick={() => setCreateModalOpen(true)}>
                  Create template
                </Button>
              </Inline>

              {selectedTemplate ? (
                <Stack gap="sm">
                  <Text variant="label" color="secondary">
                    Preview
                  </Text>
                  <Card>
                    <CardBody>
                      <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedTemplate.body}</Text>
                      <Text color="secondary" variant="caption">
                        Variables like {'{{name}}'} will be replaced per customer.
                      </Text>
                    </CardBody>
                  </Card>
                </Stack>
              ) : null}

              <Button
                type="button"
                variant="solid"
                fullWidth
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
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="title" weight="semibold">
                Select Recipients
              </Text>
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                onSearch={handleSearch}
                showSearchButton
                placeholder="Search by name, phone, email…"
              />

              <Inline gap="sm" justify="between" width="full">
                <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
                  {selectedCustomerIds.size === customers.length ? 'Deselect all' : 'Select all'}
                </Button>
                <Text color="secondary">{selectedCustomerIds.size} selected</Text>
              </Inline>

              {error ? <Alert variant="danger">{error}</Alert> : null}

              <Stack
                gap="none"
                width="full"
                border
                rounded="md"
                overflow="auto"
                style={{ maxHeight: '22.5rem' }}
              >
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
                        style={!hasValidPhone ? { opacity: 0.7 } : undefined}
                        checked={isSelected}
                        onChange={() => toggleCustomer(c.customerId)}
                        disabled={!hasValidPhone}
                        title={!hasValidPhone ? 'No phone number – cannot send WhatsApp' : ''}
                        label={
                          <Inline gap="sm" justify="between" width="full">
                            <Stack gap="xs">
                              <Text weight="semibold">{c.name ?? '—'}</Text>
                              <Text color="secondary" variant="caption">
                                {c.phone ?? '—'} {c.email ? ` • ${c.email}` : ''}
                              </Text>
                            </Stack>
                            {!hasValidPhone ? <Badge variant="warning">No phone</Badge> : null}
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
            </Stack>
          </CardBody>
        </Card>
      </Grid>

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
          <Stack gap="md">
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
