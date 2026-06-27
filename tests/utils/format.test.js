import { formatValidationError } from '#utils/format.js';
import { z } from 'zod';

describe('formatValidationError', () => {
  it('should return fallback string for null input', () => {
    expect(formatValidationError(null)).toBe('Validation failed');
  });

  it('should return fallback string for undefined input', () => {
    expect(formatValidationError(undefined)).toBe('Validation failed');
  });

  it('should return fallback for object without issues array', () => {
    expect(formatValidationError({})).toBe('Validation failed');
  });

  it('should join multiple issue messages with comma', () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
    });

    const result = schema.safeParse({ name: '', age: -1 });

    expect(result.success).toBe(false);

    const formatted = formatValidationError(result.error);

    expect(formatted).toContain(',');
    expect(formatted.length).toBeGreaterThan(10);
  });

  it('should return single message for one issue', () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: 'not-an-email' });

    expect(result.success).toBe(false);

    const formatted = formatValidationError(result.error);

    expect(formatted).toBeTruthy();
    expect(formatted.includes(',')).toBe(false);
  });

  it('should stringify non-standard error objects', () => {
    const customError = { issues: 'not-an-array', other: 'data' };
    const result = formatValidationError(customError);

    expect(result).toBe(JSON.stringify(customError));
  });
});
