import type { PackagingUnit } from '@inventory-platform/product/types';
import {
  PackagingFactorField,
  packagingFactorForDisplay,
  packagingFactorToUnitsPerPack,
  resolvePackagingUqc,
  type PackagingFactorFieldProps,
} from '@inventory-platform/ui-kit';

export { resolvePackagingUqc, packagingFactorForDisplay, packagingFactorToUnitsPerPack };

/**
 * Units such as PAC, BOX or BTL are their own pack, so the server rejects a pack size above 1
 * for them (a "pack of 20 packs" has no meaning).
 */
export function isSelfPackUnit(
  baseUnit: string | null | undefined,
  packagingUnits: PackagingUnit[],
): boolean {
  const uqc = resolvePackagingUqc(baseUnit, packagingUnits);
  if (!uqc) return false;
  const def = packagingUnits.find((u) => u.uqc === uqc);
  return (
    def != null &&
    def.allowsUnitsPerPack &&
    (def.defaultPackUqc ?? '').trim().toUpperCase() === def.uqc.toUpperCase()
  );
}

export function selfPackUnitMessage(uqc: string, unitsPerPack?: number): string {
  const size = unitsPerPack != null && unitsPerPack > 1 ? unitsPerPack : 'N';
  return `${uqc} is already a pack. For packs of ${size}, choose the unit inside the pack (e.g. PCS or TBS) and enter ${size} per pack.`;
}

type PackagingUnitInputProps = Omit<PackagingFactorFieldProps, 'packagingUnits'> & {
  packagingUnits: PackagingUnit[];
};

/** Single field: fixed {@code 1 ×} then quantity and unit (e.g. {@code 1 × 50 TBS}). */
export function PackagingUnitInput({
  packagingUnits,
  baseUnit,
  factor,
  onChange,
  ...rest
}: PackagingUnitInputProps) {
  const selfPack = isSelfPackUnit(baseUnit, packagingUnits);
  return (
    <PackagingFactorField
      {...rest}
      packagingUnits={packagingUnits}
      baseUnit={baseUnit}
      factor={factor}
      onChange={(uqc, f) => onChange(uqc, isSelfPackUnit(uqc, packagingUnits) ? 1 : f)}
      factorDisabled={selfPack && factor <= 1}
      factorTitle={
        selfPack ? selfPackUnitMessage(resolvePackagingUqc(baseUnit, packagingUnits)) : undefined
      }
    />
  );
}
