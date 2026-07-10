import type { CreditAccountResponse } from '@inventory-platform/credit/types';
import { Box, Button, Text } from '@inventory-platform/ui-kit';
import type { CreditBalanceTone } from '../model/credit-utils';
import { presentCreditBalance } from '../model/credit-utils';
import { accountBalHeadlineStyle, accountBalToneStyle, accountBtnStyle } from './creditStyles';

type Props = {
  accounts: CreditAccountResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyMessage?: string;
};

export function CreditAccountList({
  accounts,
  selectedId,
  onSelect,
  emptyMessage = 'No credit accounts yet. Add a charge or settlement first.',
}: Props) {
  if (!accounts.length) {
    return (
      <Text color="secondary" variant="caption">
        {emptyMessage}
      </Text>
    );
  }

  return (
    <Box
      as="ul"
      display="flex"
      flexDirection="column"
      gap="sm"
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
    >
      {accounts.map((a) => {
        const active = a.id === selectedId;
        const pr = presentCreditBalance(a);
        const tone = pr.tone as CreditBalanceTone;
        return (
          <Box as="li" key={a.id}>
            <Button
              type="button"
              variant="ghost"
              style={accountBtnStyle(active)}
              onClick={() => onSelect(a.id)}
            >
              <Text as="span" weight="semibold">
                {a.partyDisplayName}
              </Text>
              <Text as="span" variant="caption" color="secondary">
                {a.partyType === 'CUSTOMER'
                  ? 'Customer — you collect from them'
                  : 'Vendor — you pay them'}
              </Text>
              <Box
                as="span"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: '0.35rem 0.75rem',
                  marginTop: '0.15rem',
                  paddingTop: '0.35rem',
                  borderTop: '1px dashed var(--sk-color-border-default)',
                }}
              >
                <Text
                  as="span"
                  variant="caption"
                  weight="bold"
                  style={accountBalHeadlineStyle[tone]}
                >
                  {pr.headline}
                </Text>
                {pr.tone !== 'settled' ? (
                  <Text as="span" weight="bold" style={accountBalToneStyle[tone]}>
                    {pr.amountLine}
                  </Text>
                ) : null}
              </Box>
            </Button>
          </Box>
        );
      })}
    </Box>
  );
}
