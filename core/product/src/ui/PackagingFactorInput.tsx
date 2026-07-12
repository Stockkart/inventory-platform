import type { PackagingUnit } from '@inventory-platform/product/types';
import {
  PackagingFactorField,
  packagingFactorForDisplay,
  packagingFactorToUnitsPerPack,
  resolvePackagingUqc,
  type PackagingFactorFieldProps,
} from '@inventory-platform/ui-kit';

export { resolvePackagingUqc, packagingFactorForDisplay, packagingFactorToUnitsPerPack };

type PackagingUnitInputProps = Omit<PackagingFactorFieldProps, 'packagingUnits'> & {
  packagingUnits: PackagingUnit[];
};

/** Single field: fixed {@code 1 ×} then quantity and unit (e.g. {@code 1 × 50 TBS}). */
export function PackagingUnitInput({ packagingUnits, ...rest }: PackagingUnitInputProps) {
  return <PackagingFactorField packagingUnits={packagingUnits} {...rest} />;
}
