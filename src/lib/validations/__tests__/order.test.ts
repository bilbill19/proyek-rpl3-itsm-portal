import { describe, expect, test } from 'vitest';
import { createServiceOrderSchema } from '../../validations/order';

describe('createServiceOrderSchema', () => {
  test('valid data with DROP_OFF passes', () => {
    const data = {
      deviceType: 'Laptop',
      deviceBrand: 'Dell',
      problemDescription: 'Battery tidak tahan lama',
      serviceMethod: 'DROP_OFF',
    };
    expect(() => createServiceOrderSchema.parse(data)).not.toThrow();
  });

  test('valid ONSITE requires address', () => {
    const data = {
      deviceType: 'Laptop',
      deviceBrand: 'Dell',
      problemDescription: 'Battery tidak tahan lama',
      serviceMethod: 'ONSITE',
      address: 'Jl. Example No.123',
    };
    expect(() => createServiceOrderSchema.parse(data)).not.toThrow();
  });

  test('ONSITE without proper address fails', () => {
    const data = {
      deviceType: 'Laptop',
      deviceBrand: 'Dell',
      problemDescription: 'Battery tidak tahan lama',
      serviceMethod: 'ONSITE',
      address: 'shrt',
    };
    expect(() => createServiceOrderSchema.parse(data)).toThrow();
  });
});
