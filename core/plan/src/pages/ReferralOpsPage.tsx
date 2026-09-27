import { useState } from 'react';
import { Card, CardBody, PageHeader, Stack, Tabs } from '@inventory-platform/ui-kit';
import { ReviewQueue } from '../admin/referrals/ReviewQueue';
import { RewardsPanel } from '../admin/referrals/RewardsPanel';
import { WalletPanel } from '../admin/referrals/WalletPanel';

export function ReferralOpsPage() {
  const [tab, setTab] = useState('queue');

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader
        title="Referral operations"
        description="Review referrals, approve or reverse rewards, and adjust shop wallets. Every action is audited."
      />
      <Card>
        <CardBody>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'queue', label: 'Review queue', panel: <ReviewQueue /> },
              { value: 'rewards', label: 'Rewards', panel: <RewardsPanel /> },
              { value: 'wallets', label: 'Wallets', panel: <WalletPanel /> },
            ]}
          />
        </CardBody>
      </Card>
    </Stack>
  );
}
