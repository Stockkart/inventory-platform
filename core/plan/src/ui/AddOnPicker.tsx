import {
  Badge,
  Checkbox,
  Inline,
  QtyStepper,
  Stack,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import type { AddOnResponse } from '@inventory-platform/plan/types';
import {
  addOnPriceLabel,
  isComingSoonAddOn,
  maxQuantityFor,
  type AddOnSelection,
} from '../checkout';

interface AddOnPickerProps {
  addOns: AddOnResponse[];
  selection: AddOnSelection;
  onChange: (code: string, quantity: number) => void;
  disabled?: boolean;
}

/**
 * Add-ons for the chosen plan, or for the current plan on an add-on-only order. Prices shown are
 * catalogue prices; the quote is the total. SMS packs show as coming soon and cannot be picked.
 */
export function AddOnPicker({ addOns, selection, onChange, disabled }: AddOnPickerProps) {
  if (addOns.length === 0) return null;
  return (
    <Stack gap="sm">
      <Text variant="heading4" weight="semibold">
        Add-ons
      </Text>
      {addOns.map((addOn) => {
        const quantity = selection[addOn.code] ?? 0;
        const max = maxQuantityFor(addOn);
        const comingSoon = isComingSoonAddOn(addOn);
        return (
          <Inline key={addOn.code} justify="between" align="center" width="full" gap="md">
            <Stack gap="xs">
              <Inline gap="xs" align="center">
                <Checkbox
                  id={`addon-${addOn.code}`}
                  label={addOn.name}
                  checked={quantity > 0}
                  disabled={disabled || comingSoon}
                  onChange={(event) => onChange(addOn.code, event.target.checked ? 1 : 0)}
                />
                {comingSoon ? (
                  <Badge variant="warning" className={surfaceChrome.planComingSoon}>
                    Coming soon
                  </Badge>
                ) : null}
              </Inline>
              {addOn.description ? (
                <Text variant="caption" color="secondary">
                  {addOn.description}
                </Text>
              ) : null}
            </Stack>
            <Inline gap="sm" align="center">
              {max > 1 && quantity > 0 ? (
                <QtyStepper
                  value={quantity}
                  disabled={disabled}
                  onDecrement={() => onChange(addOn.code, quantity - 1)}
                  onIncrement={() => onChange(addOn.code, Math.min(max, quantity + 1))}
                  incrementDisabled={quantity >= max}
                  inputProps={{ readOnly: true, 'aria-label': `${addOn.name} quantity` }}
                />
              ) : null}
              <Text weight="semibold">{addOnPriceLabel(addOn)}</Text>
            </Inline>
          </Inline>
        );
      })}
    </Stack>
  );
}
