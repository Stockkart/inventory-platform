import { useState } from 'react';
import { Card, CardBody, PageHeader, Stack, Tabs } from '@inventory-platform/ui-kit';
import { PlansPanel } from '../admin/catalogue/PlansPanel';
import { AddOnsPanel } from '../admin/catalogue/AddOnsPanel';
import { GrantsPanel } from '../admin/catalogue/GrantsPanel';

export function CatalogueAdminPage() {
  const [tab, setTab] = useState('plans');

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader
        title="Plans & add-ons"
        description="Edit what shops can buy and grant add-ons to a shop. Every change is audited."
      />
      <Card>
        <CardBody>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'plans', label: 'Plans', panel: <PlansPanel /> },
              { value: 'addons', label: 'Add-ons', panel: <AddOnsPanel /> },
              { value: 'grants', label: 'Shop add-ons', panel: <GrantsPanel /> },
            ]}
          />
        </CardBody>
      </Card>
    </Stack>
  );
}
