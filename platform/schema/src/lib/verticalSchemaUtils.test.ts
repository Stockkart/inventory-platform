import { describe, expect, it } from 'vitest';
import { isRegistrationSchemaLoaded, isRegistrationSchemaReady } from './verticalSchemaUtils';

const registrationField = {
  key: 'brand',
  label: 'Brand',
  type: 'string',
  storage: 'extension',
  showIn: ['registration'],
};

function shopSchema(mode: string, fields: unknown[]) {
  return {
    shopId: 'shop-1',
    verticalId: 'sports',
    mode,
    entities: { inventory: { fields } },
  };
}

describe('isRegistrationSchemaLoaded', () => {
  it('is true once the schema for this shop and mode arrives, even with no fields', () => {
    expect(isRegistrationSchemaLoaded(shopSchema('basic', []), 'BASIC', { shopId: 'shop-1' })).toBe(
      true,
    );
  });

  it('is false for another mode, another shop or no shop', () => {
    const schema = shopSchema('regular', [registrationField]);
    expect(isRegistrationSchemaLoaded(schema, 'BASIC', { shopId: 'shop-1' })).toBe(false);
    expect(isRegistrationSchemaLoaded(schema, 'REGULAR', { shopId: 'shop-2' })).toBe(false);
    expect(isRegistrationSchemaLoaded(schema, 'REGULAR', { shopId: null })).toBe(false);
    expect(isRegistrationSchemaLoaded(null, 'REGULAR', { shopId: 'shop-1' })).toBe(false);
  });
});

describe('isRegistrationSchemaReady', () => {
  it('needs at least one registration field', () => {
    expect(isRegistrationSchemaReady(shopSchema('basic', []), 'BASIC', { shopId: 'shop-1' })).toBe(
      false,
    );
    expect(
      isRegistrationSchemaReady(shopSchema('basic', [registrationField]), 'BASIC', {
        shopId: 'shop-1',
      }),
    ).toBe(true);
  });
});
