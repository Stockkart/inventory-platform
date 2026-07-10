# @inventory-platform/ui-kit

StockKart design system — presentation-only React components, tokens, and patterns.

## Commands

```bash
# Component catalog (local)
pnpm nx storybook ui-kit

# Static catalog build
pnpm nx build-storybook ui-kit
```

## Import

```tsx
import {
  Button,
  FormField,
  Input,
  Stack,
  PageHeader,
  SearchInput,
  Table,
  TableEmptyRow,
  PaginationBar,
  EditModal,
} from '@inventory-platform/ui-kit';
```

Theme tokens load automatically when you wrap the app in `ThemeProvider` from ui-kit (or shell re-export).

For raw CSS variables in app entry CSS:

```css
@import '@inventory-platform/ui-kit/theme/tokens.css';
```

## Architecture

| Layer          | Location                                    | Examples                                    |
| -------------- | ------------------------------------------- | ------------------------------------------- |
| Primitives     | `ui-kit/src/forms`, `layout`, `feedback`, … | `Button`, `Input`, `Stack`                  |
| Patterns       | `ui-kit/src/patterns`                       | `PaginationBar`, `EditModal`, `SearchInput` |
| Domain widgets | `core/*/ui`                                 | `VendorEditForm`, `PurchaseList`            |
| Pages          | `core/*/pages`                              | Compose ui-kit + domain ui                  |

ui-kit must **not** import API clients, session stores, routing, or domain types.

---

## Migration recipes

### 1. List page (search + table + pagination + edit modal)

Use for Vendors, Customers, reminders lists, accounting parties, etc.

```tsx
import { useState } from 'react';
import {
  PageHeader,
  SearchInput,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableLoadingRow,
  TableEmptyRow,
  PaginationBar,
  EditModal,
  Alert,
  Stack,
} from '@inventory-platform/ui-kit';

export function ExampleListPage() {
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const runSearch = () => {
    setQuery(searchInput.trim());
    setPage(0);
  };

  return (
    <Stack gap="md">
      <PageHeader
        title="Vendors"
        description="Manage vendor contacts"
        actions={
          <Button variant="solid" onClick={() => setEditOpen(true)}>
            New vendor
          </Button>
        }
      />

      <SearchInput
        value={searchInput}
        onChange={setSearchInput}
        onSearch={runSearch}
        showSearchButton
        placeholder="Search by name, email, phone…"
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Phone</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableLoadingRow colSpan={2} label="Loading…" />
          ) : rows.length === 0 ? (
            <TableEmptyRow colSpan={2} message="No vendors match your search." />
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>—</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <PaginationBar page={page} totalPages={5} totalItems={100} onPageChange={setPage} />

      <EditModal
        open={editOpen}
        title="New vendor"
        onClose={() => setEditOpen(false)}
        onCancel={() => setEditOpen(false)}
        onSave={async () => setEditOpen(false)}
      >
        {/* domain form fields */}
      </EditModal>
    </Stack>
  );
}
```

**Boy-scout rule:** when editing a legacy page, replace raw `<table>`, `<input type="search">`, and modal markup with the components above. CSS modules can remain for layout gaps until the file is fully migrated.

---

### 2. Simple form (auth, settings, manual entry)

```tsx
import { useState } from 'react';
import { Stack, FormField, Input, Button, Alert } from '@inventory-platform/ui-kit';

export function ExampleForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <Stack gap="md" style={{ maxWidth: 400 }}>
      <FormField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        required
        error={error ?? undefined}
      />
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Button variant="solid" type="submit">
        Sign in
      </Button>
    </Stack>
  );
}
```

For custom controls (Select, Checkbox), use the **children slot** on `FormField`:

```tsx
<FormField label="Role" hint="Dashboard access level">
  <Select value={role} onChange={(e) => setRole(e.target.value)}>
    <option value="staff">Staff</option>
  </Select>
</FormField>
```

---

### 3. Dashboard section (card + header)

```tsx
import { PageHeader, Card, CardHeader, CardBody, Stack, Text } from '@inventory-platform/ui-kit';

export function ExampleDashboardSection() {
  return (
    <Stack gap="lg">
      <PageHeader title="Overview" description="Today's snapshot" />
      <Card>
        <CardHeader>
          <Text variant="heading3">Low stock</Text>
        </CardHeader>
        <CardBody>{/* domain content */}</CardBody>
      </Card>
    </Stack>
  );
}
```

---

## Storybook

Every public export should have a story under `src/**/*.stories.tsx`. Run `pnpm nx storybook ui-kit` to browse components, toggle theme, and run a11y checks (addon-a11y).

## Tokens

Design tokens live in `src/theme/tokens.css` as `--sk-*` variables. Legacy app aliases (`--bg-primary`, `--text-primary`, `--link`, …) are mapped for backward compatibility. Prefer `--sk-*` in new ui-kit CSS modules.
