import { describe, expect, test } from 'vitest';
import { inventoryItemSchema, stockAdjustmentSchema, inventoryCategories } from '../../validations/inventory';

describe('inventoryItemSchema', () => {
  test('passes with valid minimal data', () => {
    const data = {
      sku: 'ABC123',
      name: 'SSD 512GB',
      category: inventoryCategories[0],
      stock: 10,
      purchasePrice: 500000,
      sellingPrice: 750000,
    };
    expect(() => inventoryItemSchema.parse(data)).not.toThrow();
  });

  test('fails when required fields missing', () => {
    const data = {};
    expect(() => inventoryItemSchema.parse(data)).toThrow();
  });
});

describe('stockAdjustmentSchema', () => {
  test('passes with valid data', () => {
    const data = { type: 'IN', quantity: 5 };
    expect(() => stockAdjustmentSchema.parse(data)).not.toThrow();
  });
  test('fails with negative quantity', () => {
    const data = { type: 'OUT', quantity: -1 };
    expect(() => stockAdjustmentSchema.parse(data)).toThrow();
  });
});
