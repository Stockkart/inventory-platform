import type { PackagingUnit } from '../model/types';

/**
 * Whether the operator must state how many base units are in a pack.
 *
 * A PACK_ONLY unit is sold whole, so for most of them the pack size is the thing that makes
 * the stock countable: MLT is sold as bottles, and "how many ml in the bottle" has to be
 * answered or a sale cannot be converted to base units.
 *
 * Some PACK_ONLY units are their own pack. TUB, BTL, CAN and DRM all carry
 * {@link PackagingUnit.defaultPackUqc} equal to their own UQC: a tube is a tube, and one base
 * unit is one pack. There is no second number to give, so demanding one leaves a real product
 * with nothing valid to enter — a 30 g Canesten tube billed 20 ECH is twenty single tubes, and
 * `1 x 1 TUB` is the only honest answer.
 *
 * A pack factor stays *allowed* for those units, since a shop may still buy them cased; it is
 * only no longer required.
 */
/** Narrows, so the caller can name the unit in the message it raises. */
export function requiresExplicitPackSize(
  unit: PackagingUnit | undefined | null,
): unit is PackagingUnit {
  if (!unit?.allowsUnitsPerPack) return false;
  if (unit.sellUnitRule !== 'PACK_ONLY') return false;
  return unit.defaultPackUqc != null && unit.defaultPackUqc !== unit.uqc;
}
