import { describe, expect, test } from 'vitest';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, createOrderSchema } from '../../validations/auth';

describe('registerSchema', () => {
  test('passes with valid data', () => {
    const data = {
      name: 'Budi',
      email: 'budi@example.com',
      phone: '0812345678',
      password: 'secret123',
      confirmPassword: 'secret123',
    };
    expect(() => registerSchema.parse(data)).not.toThrow();
  });

  test('fails when passwords do not match', () => {
    const data = {
      name: 'Budi',
      email: 'budi@example.com',
      phone: '0812345678',
      password: 'secret123',
      confirmPassword: 'different',
    };
    expect(() => registerSchema.parse(data)).toThrow();
  });
});

describe('loginSchema', () => {
  test('passes with valid credentials', () => {
    const data = { email: 'user@example.com', password: 'pwd' };
    expect(() => loginSchema.parse(data)).not.toThrow();
  });

  test('fails with invalid email', () => {
    const data = { email: 'invalid-email', password: 'pwd' };
    expect(() => loginSchema.parse(data)).toThrow();
  });
});

describe('forgotPasswordSchema', () => {
  test('valid email passes', () => {
    expect(() => forgotPasswordSchema.parse({ email: 'test@example.com' })).not.toThrow();
  });
  test('invalid email fails', () => {
    expect(() => forgotPasswordSchema.parse({ email: 'bad' })).toThrow();
  });
});

describe('resetPasswordSchema', () => {
  test('valid data passes', () => {
    const data = {
      token: '1234567890',
      email: 'user@example.com',
      password: 'newpass',
      confirmPassword: 'newpass',
    };
    expect(() => resetPasswordSchema.parse(data)).not.toThrow();
  });
  test('mismatched passwords fail', () => {
    const data = {
      token: '1234567890',
      email: 'user@example.com',
      password: 'newpass',
      confirmPassword: 'different',
    };
    expect(() => resetPasswordSchema.parse(data)).toThrow();
  });
});

describe('createOrderSchema', () => {
  test('valid minimal data passes', () => {
    const data = {
      deviceType: 'Laptop',
      deviceBrand: 'Asus',
      problemDescription: 'Layar rusak',
    };
    expect(() => createOrderSchema.parse(data)).not.toThrow();
  });
  test('missing required fields fail', () => {
    const data = {};
    expect(() => createOrderSchema.parse(data)).toThrow();
  });
});

