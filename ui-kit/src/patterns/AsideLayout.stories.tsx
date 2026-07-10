import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AsideLayout, SearchDropdown, StickyBar } from './AsideLayout';
import { Box, Stack, Text, Inline } from '../layout';
import { Button } from '../forms';
import { SearchInput } from './PaginationBar';
import { Card, CardBody } from '../data-display';
import { Badge } from '../feedback';

const meta: Meta = {
  title: 'Patterns/POS layout',
};

export default meta;

export const AsideLayoutDemo: StoryObj = {
  render: () => (
    <AsideLayout
      asideWidth={320}
      main={
        <Card>
          <CardBody>
            <Stack gap="sm">
              <Text variant="title">Cart / main pane</Text>
              <Text color="secondary">Flexible main column (min-width 0).</Text>
            </Stack>
          </CardBody>
        </Card>
      }
      aside={
        <Card>
          <CardBody>
            <Stack gap="sm">
              <Text variant="title">Summary</Text>
              <Text>Subtotal ₹1,240.00</Text>
              <Button variant="solid">Process Payment</Button>
            </Stack>
          </CardBody>
        </Card>
      }
    />
  ),
};

export const SearchDropdownDemo: StoryObj = {
  render: function SearchDropdownDemoStory() {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const results = ['Paracetamol 500mg', 'Amoxicillin 250mg', 'Ibuprofen 400mg'].filter((r) =>
      r.toLowerCase().includes(query.toLowerCase()),
    );

    return (
      <Box position="relative" style={{ maxWidth: 420 }}>
        <SearchInput
          value={query}
          onChange={(v) => {
            setQuery(v);
            setOpen(true);
          }}
          onSearch={() => setOpen(true)}
          placeholder="Search products…"
          showSearchButton
        />
        {open && query ? (
          <SearchDropdown role="listbox">
            <Stack gap="xs" padding="sm">
              {results.length === 0 ? (
                <Text variant="caption" color="secondary">
                  No matches
                </Text>
              ) : (
                results.map((r) => (
                  <Button
                    key={r}
                    variant="ghost"
                    onClick={() => {
                      setQuery(r);
                      setOpen(false);
                    }}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    {r}
                  </Button>
                ))
              )}
            </Stack>
          </SearchDropdown>
        ) : null}
      </Box>
    );
  },
};

export const StickyBarDemo: StoryObj = {
  render: () => (
    <Box
      style={{ height: 280, overflow: 'auto', border: '1px solid var(--sk-color-border-default)' }}
    >
      <Stack gap="md" padding="md">
        {Array.from({ length: 8 }, (_, i) => (
          <Text key={i}>Scrollable content line {i + 1}</Text>
        ))}
      </Stack>
      <StickyBar>
        <Inline justify="between" align="center" width="full">
          <Badge variant="info">StickyBar</Badge>
          <Button variant="solid" size="sm">
            Checkout
          </Button>
        </Inline>
      </StickyBar>
    </Box>
  ),
};
