import { FileText, Smartphone } from 'lucide-react';
import {
  Box,
  Button,
  Icon,
  Modal,
  Stack,
  Text,
  cn,
  productChrome,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import type { LucideIcon } from 'lucide-react';

export type CartDestination = 'sell' | 'estimate';

export interface AddToCartDestinationPickerProps {
  open: boolean;
  productLabel: string;
  isSubmitting: boolean;
  onSelect: (destination: CartDestination) => void;
  onCancel: () => void;
  title?: string;
  promptPrefix?: string;
}

const DESTINATIONS: Array<{
  value: CartDestination;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    value: 'sell',
    title: 'Scan and Sell',
    description: 'Open sale — checkout when ready',
    icon: Smartphone,
  },
  {
    value: 'estimate',
    title: 'Estimate',
    description: 'Printable quote — convert later',
    icon: FileText,
  },
];

export function AddToCartDestinationPicker({
  open,
  productLabel,
  isSubmitting,
  onSelect,
  onCancel,
  title = 'Add to cart',
  promptPrefix = 'Choose a destination for',
}: AddToCartDestinationPickerProps) {
  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <Modal.Header title={title} onClose={onCancel} />
      <Modal.Body>
        <Stack gap="md">
          <Text color="secondary">
            {promptPrefix}{' '}
            <Text as="span" weight="semibold">
              {productLabel}
            </Text>
          </Text>

          <Box
            className={cn(productChrome.printOptionList, isSubmitting && surfaceChrome.busyDim)}
            role="listbox"
            aria-label="Cart destination"
          >
            {DESTINATIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="ghost"
                fullWidth
                align="start"
                role="option"
                disabled={isSubmitting}
                className={productChrome.printOption}
                onClick={() => onSelect(option.value)}
              >
                <Box className={productChrome.printOptionIcon} aria-hidden>
                  <Icon icon={option.icon} size="md" />
                </Box>
                <Box className={productChrome.printOptionBody}>
                  <Text as="span" className={productChrome.printOptionTitle}>
                    {option.title}
                  </Text>
                  <Text as="span" className={productChrome.printOptionDesc}>
                    {option.description}
                  </Text>
                </Box>
              </Button>
            ))}
          </Box>
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
