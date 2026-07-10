import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PaginationBar, SearchInput, PageHeader, EmptyState } from './PaginationBar';
import { Button } from '../forms/Button';
import { Inline } from '../layout/Stack';

const meta: Meta = {
  title: 'Patterns/List page',
};

export default meta;

export const SearchToolbar: StoryObj = {
  render: function SearchToolbarStory() {
    const [query, setQuery] = useState('');
    return (
      <SearchInput
        value={query}
        onChange={setQuery}
        onSearch={() => alert(`Search: ${query}`)}
        showSearchButton
        placeholder="Search by name, email, phone…"
      />
    );
  },
};

export const PageHeaderExample: StoryObj = {
  render: () => (
    <PageHeader
      title="Vendors"
      description="Manage your vendor contacts"
      actions={
        <Button variant="solid" size="sm">
          New vendor
        </Button>
      }
    />
  ),
};

export const Pagination: StoryObj = {
  render: function PaginationStory() {
    const [page, setPage] = useState(0);
    return <PaginationBar page={page} totalPages={5} totalItems={92} onPageChange={setPage} />;
  },
};

export const Empty: StoryObj = {
  render: () => (
    <EmptyState
      title="No vendors yet"
      description="Create your first vendor to track purchases and returns."
      action={<Button variant="solid">New vendor</Button>}
    />
  ),
};

export const ListPageChrome: StoryObj = {
  render: function ListPageChromeStory() {
    const [page, setPage] = useState(0);
    const [query, setQuery] = useState('');
    return (
      <>
        <PageHeader
          title="Vendors"
          description="Manage your vendor contacts"
          actions={<Button variant="solid">New vendor</Button>}
        />
        <Inline gap="md" style={{ marginBottom: '1rem' }}>
          <SearchInput
            value={query}
            onChange={setQuery}
            onSearch={() => undefined}
            showSearchButton
            placeholder="Search vendors…"
          />
        </Inline>
        <PaginationBar page={page} totalPages={3} totalItems={42} onPageChange={setPage} />
      </>
    );
  },
};
