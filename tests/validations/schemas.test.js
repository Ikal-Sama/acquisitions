import { signupSchema, signInSchema } from '#validations/auth.validation.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from '#validations/departments.validation.js';
import {
  createVendorSchema,
  updateVendorSchema,
} from '#validations/vendors.validation.js';
import { createBudgetSchema } from '#validations/budgets.validation.js';
import { createRequisitionSchema } from '#validations/requisitions.validation.js';
import { createPurchaseOrderSchema } from '#validations/purchase_orders.validation.js';
import {
  createAssetSchema,
  updateAssetSchema,
} from '#validations/assets.validation.js';
import { updateUserSchema } from '#validations/users.validation.js';

describe('Auth Validation Schemas', () => {
  describe('signupSchema', () => {
    it('should accept valid signup data', () => {
      const result = signupSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });

    it('should default role to user', () => {
      const result = signupSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('user');
      }
    });

    it('should accept admin role', () => {
      const result = signupSchema.safeParse({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
      });

      expect(result.success).toBe(true);
    });

    it('should reject short name', () => {
      const result = signupSchema.safeParse({
        name: 'A',
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = signupSchema.safeParse({
        name: 'John',
        email: 'not-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = signupSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
        password: '12345',
      });

      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const result = signupSchema.safeParse({
        name: 'John',
        email: 'john@example.com',
        password: 'password123',
        role: 'superadmin',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('signInSchema', () => {
    it('should accept valid sign-in data', () => {
      const result = signInSchema.safeParse({
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject missing password', () => {
      const result = signInSchema.safeParse({
        email: 'john@example.com',
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('Department Validation Schemas', () => {
  describe('createDepartmentSchema', () => {
    it('should accept valid data', () => {
      const result = createDepartmentSchema.safeParse({
        name: 'Engineering',
        code: 'ENG',
        description: 'Engineering department',
      });

      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const result = createDepartmentSchema.safeParse({
        code: 'ENG',
      });

      expect(result.success).toBe(false);
    });

    it('should require code', () => {
      const result = createDepartmentSchema.safeParse({
        name: 'Engineering',
      });

      expect(result.success).toBe(false);
    });

    it('should reject short code', () => {
      const result = createDepartmentSchema.safeParse({
        name: 'Engineering',
        code: 'E',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('updateDepartmentSchema', () => {
    it('should accept partial update', () => {
      const result = updateDepartmentSchema.safeParse({
        name: 'Updated Name',
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty object (refine requires at least one field)', () => {
      const result = updateDepartmentSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });
});

describe('Vendor Validation Schemas', () => {
  describe('createVendorSchema', () => {
    it('should accept valid data', () => {
      const result = createVendorSchema.safeParse({
        name: 'ACME Corp',
        email: 'contact@acme.com',
        phone: '123-456-7890',
      });

      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const result = createVendorSchema.safeParse({
        email: 'contact@acme.com',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('updateVendorSchema', () => {
    it('should accept partial update', () => {
      const result = updateVendorSchema.safeParse({
        phone: 'new-phone',
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('Budget Validation Schemas', () => {
  describe('createBudgetSchema', () => {
    it('should accept valid data', () => {
      const result = createBudgetSchema.safeParse({
        department_id: 1,
        fiscal_year: 2026,
        allocated_amount: '50000.00',
      });

      expect(result.success).toBe(true);
    });

    it('should reject missing department_id', () => {
      const result = createBudgetSchema.safeParse({
        fiscal_year: 2026,
        allocated_amount: '50000.00',
      });

      expect(result.success).toBe(false);
    });

    it('should reject negative allocated amount', () => {
      const result = createBudgetSchema.safeParse({
        department_id: 1,
        fiscal_year: 2026,
        allocated_amount: '-100.00',
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('Requisition Validation Schemas', () => {
  describe('createRequisitionSchema', () => {
    it('should accept valid data', () => {
      const result = createRequisitionSchema.safeParse({
        title: 'Office Supplies',
        department_id: 1,
        quantity: 10,
        estimated_cost: '500.00',
      });

      expect(result.success).toBe(true);
    });

    it('should reject negative quantity', () => {
      const result = createRequisitionSchema.safeParse({
        title: 'Office Supplies',
        department_id: 1,
        quantity: -1,
        estimated_cost: '500.00',
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('Purchase Order Validation Schemas', () => {
  describe('createPurchaseOrderSchema', () => {
    it('should accept valid data', () => {
      const result = createPurchaseOrderSchema.safeParse({
        vendor_id: 1,
        total_amount: '1500.00',
        payment_terms: 'Net 30',
      });

      expect(result.success).toBe(true);
    });

    it('should reject missing vendor_id', () => {
      const result = createPurchaseOrderSchema.safeParse({
        total_amount: '1500.00',
      });

      expect(result.success).toBe(false);
    });

    it('should reject negative total amount', () => {
      const result = createPurchaseOrderSchema.safeParse({
        vendor_id: 1,
        total_amount: '-50.00',
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('Asset Validation Schemas', () => {
  describe('createAssetSchema', () => {
    it('should accept valid data with just name', () => {
      const result = createAssetSchema.safeParse({
        name: 'Laptop',
      });

      expect(result.success).toBe(true);
    });

    it('should reject missing name', () => {
      const result = createAssetSchema.safeParse({
        serial_number: 'SN12345',
      });

      expect(result.success).toBe(false);
    });

    it('should accept data with all fields', () => {
      const result = createAssetSchema.safeParse({
        name: 'Laptop',
        serial_number: 'SN12345',
        purchase_price: 1500,
        location: 'Office A',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('updateAssetSchema', () => {
    it('should accept partial update', () => {
      const result = updateAssetSchema.safeParse({
        location: 'New Office',
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty object', () => {
      const result = updateAssetSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });
});

describe('User Update Validation Schemas', () => {
  describe('updateUserSchema', () => {
    it('should accept valid update', () => {
      const result = updateUserSchema.safeParse({
        name: 'Updated Name',
        email: 'updated@example.com',
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty object', () => {
      const result = updateUserSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const result = updateUserSchema.safeParse({
        email: 'not-email',
      });

      expect(result.success).toBe(false);
    });
  });
});
