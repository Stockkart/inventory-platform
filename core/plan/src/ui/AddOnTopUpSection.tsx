import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AddOnResponse, ShopPlanStatusResponse } from '@inventory-platform/plan/types';
import {
  Alert,
  Badge,
  Box,
  Button,
  QtyStepper,
  Skeleton,
  Stack,
  Text,
  surfaceChrome,
  cn,
} from '@inventory-platform/ui-kit';
import {
  addOnGrantLabel,
  addOnPriceLabel,
  isComingSoonAddOn,
  maxQuantityFor,
  topUpAddOns,
  type AddOnOnlyIntent,
} from '../checkout';
import { useAddOnOptionsQuery } from '../queries/hooks';

const PANEL_TITLE = 'Add-ons & top-ups';

interface AddOnTopUpCardProps {
  addOn: AddOnResponse;
  onBuy: (intent: AddOnOnlyIntent) => void;
}

function AddOnTopUpCard({ addOn, onBuy }: AddOnTopUpCardProps) {
  const [quantity, setQuantity] = useState(1);
  const comingSoon = isComingSoonAddOn(addOn);
  const max = maxQuantityFor(addOn);
  const grant = addOnGrantLabel(addOn);

  return (
    <Box
      as="li"
      className={cn(surfaceChrome.planTopUpCard, comingSoon && surfaceChrome.planTopUpCardMuted)}
    >
      <Box className={surfaceChrome.planTopUpCardHead}>
        <Text as="h4" className={surfaceChrome.planTopUpName}>
          {addOn.name}
        </Text>
        {comingSoon ? (
          <Badge variant="warning" className={surfaceChrome.planComingSoon}>
            Coming soon
          </Badge>
        ) : null}
      </Box>
      {grant ? (
        <Text as="p" className={surfaceChrome.planTopUpGrant}>
          {grant}
        </Text>
      ) : null}
      {addOn.description ? (
        <Text as="p" className={surfaceChrome.planTopUpDescription}>
          {addOn.description}
        </Text>
      ) : null}
      <Text as="p" className={surfaceChrome.planTopUpPrice}>
        {addOnPriceLabel(addOn)}
      </Text>
      <Box className={surfaceChrome.planTopUpActions}>
        {max > 1 && !comingSoon ? (
          <QtyStepper
            value={quantity}
            onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
            onIncrement={() => setQuantity((q) => Math.min(max, q + 1))}
            decrementDisabled={quantity <= 1}
            incrementDisabled={quantity >= max}
            inputProps={{ readOnly: true, 'aria-label': `${addOn.name} quantity` }}
          />
        ) : null}
        <Button
          type="button"
          variant="solid"
          size="sm"
          disabled={comingSoon}
          onClick={() => onBuy({ code: addOn.code, quantity })}
        >
          Buy
        </Button>
      </Box>
    </Box>
  );
}

export interface AddOnTopUpSectionProps {
  status: Pick<ShopPlanStatusResponse, 'canBuyAddOnsAlone'>;
  onBuy: (intent: AddOnOnlyIntent) => void;
}

/**
 * Collapsed "Add-ons & top-ups" disclosure for My Plan. The page renders it only on an active paid
 * plan; the catalogue loads on first open. Prices are catalogue labels, the payment page quote is
 * the total.
 */
export function AddOnTopUpSection({ status, onBuy }: AddOnTopUpSectionProps) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const {
    data: catalogue = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useAddOnOptionsQuery({ enabled: open });
  const addOns = topUpAddOns(catalogue, status);

  return (
    <Box as="section" className={surfaceChrome.planTopUp} aria-label={PANEL_TITLE}>
      <Button
        type="button"
        variant="ghost"
        align="start"
        fullWidth
        className={surfaceChrome.planTopUpToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
      >
        <Box as="span" className={surfaceChrome.planTopUpHeading}>
          <Text as="span" className={surfaceChrome.planSectionTitle}>
            {PANEL_TITLE}
          </Text>
          <Text as="span" className={surfaceChrome.planTopUpSupport}>
            Extra users, modules and OCR credits for your current plan.
          </Text>
        </Box>
        <ChevronDown
          size={18}
          aria-hidden
          className={cn(surfaceChrome.planTopUpChevron, open && surfaceChrome.planTopUpChevronOpen)}
        />
      </Button>
      <Box id={bodyId} className={surfaceChrome.planTopUpBody} hidden={!open}>
        {open ? (
          isLoading ? (
            <Skeleton height={120} />
          ) : isError ? (
            <Stack gap="sm" align="start">
              <Alert variant="danger">Could not load add-ons.</Alert>
              <Button
                type="button"
                variant="solid"
                size="sm"
                loading={isFetching}
                onClick={() => void refetch()}
              >
                Retry
              </Button>
            </Stack>
          ) : addOns.length === 0 ? (
            <Text color="secondary">Your plan already includes every add-on.</Text>
          ) : (
            <Box as="ul" className={cn(surfaceChrome.listPlain, surfaceChrome.planTopUpGrid)}>
              {addOns.map((addOn) => (
                <AddOnTopUpCard key={addOn.code} addOn={addOn} onBuy={onBuy} />
              ))}
            </Box>
          )
        ) : null}
      </Box>
    </Box>
  );
}
