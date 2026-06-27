import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { db } from '#config/database.js';
import logger from '#config/logger.js';
import { budgets } from '#models/budget.model.js';

export const getAllBudgets = async (
  filters = {},
  pagination = {},
  sort = []
) => {
  try {
    const { limit, offset } = pagination;

    const conditions = [];

    if (filters.department_id) {
      conditions.push(eq(budgets.department_id, filters.department_id));
    }

    if (filters.fiscal_year) {
      conditions.push(eq(budgets.fiscal_year, filters.fiscal_year));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count: total }] = await db
      .select({ count: sql`count(*)` })
      .from(budgets)
      .where(where);

    const orderBy =
      sort.length > 0
        ? sort.map(s =>
            s.direction === 'desc'
              ? desc(budgets[s.field])
              : asc(budgets[s.field])
          )
        : [desc(budgets.fiscal_year)];

    const data = await db
      .select()
      .from(budgets)
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    return { data, total: Number(total) };
  } catch (e) {
    logger.error('Error getting budgets', e);
    throw e;
  }
};

export const getBudgetById = async id => {
  try {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(eq(budgets.id, id))
      .limit(1);

    if (!budget) throw new Error('Budget not found');

    return budget;
  } catch (e) {
    logger.error(`Error getting budget by id ${id}`, e);
    throw e;
  }
};

export const getDepartmentBudget = async (departmentId, fiscalYear) => {
  try {
    const year = fiscalYear || new Date().getFullYear();

    const [budget] = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.department_id, departmentId),
          eq(budgets.fiscal_year, year)
        )
      )
      .limit(1);

    return budget || null;
  } catch (e) {
    logger.error(`Error getting budget for department ${departmentId}`, e);
    throw e;
  }
};

export const createBudget = async data => {
  try {
    const existing = await getDepartmentBudget(
      data.department_id,
      data.fiscal_year
    );

    if (existing) {
      throw new Error(
        `Budget already exists for this department in fiscal year ${data.fiscal_year}`
      );
    }

    const [newBudget] = await db
      .insert(budgets)
      .values({ ...data, spent_amount: '0' })
      .returning();

    logger.info(
      `Budget for department ${data.department_id} (FY${data.fiscal_year}) created`
    );

    return newBudget;
  } catch (e) {
    logger.error('Error creating budget', e);
    throw e;
  }
};

export const updateBudget = async (id, updates) => {
  try {
    const [existing] = await db
      .select({ id: budgets.id })
      .from(budgets)
      .where(eq(budgets.id, id))
      .limit(1);

    if (!existing) throw new Error('Budget not found');

    const sanitizedUpdates = { ...updates, updated_at: new Date() };

    const [updated] = await db
      .update(budgets)
      .set(sanitizedUpdates)
      .where(eq(budgets.id, id))
      .returning();

    logger.info(`Budget (ID: ${id}) updated`);

    return updated;
  } catch (e) {
    logger.error(`Error updating budget ${id}`, e);
    throw e;
  }
};

export const checkBudgetAvailability = async (
  departmentId,
  amount,
  fiscalYear
) => {
  try {
    const budget = await getDepartmentBudget(departmentId, fiscalYear);

    if (!budget) {
      return {
        available: false,
        message: `No budget found for this department in FY${fiscalYear || new Date().getFullYear()}`,
      };
    }

    const allocated = parseFloat(budget.allocated_amount);
    const spent = parseFloat(budget.spent_amount);
    const remaining = allocated - spent;

    if (amount > remaining) {
      return {
        available: false,
        message: `Insufficient budget. Allocated: $${allocated.toFixed(2)}, Spent: $${spent.toFixed(2)}, Remaining: $${remaining.toFixed(2)}, Required: $${amount.toFixed(2)}`,
        remaining,
        required: amount,
      };
    }

    return { available: true, remaining };
  } catch (e) {
    logger.error('Error checking budget availability', e);
    throw e;
  }
};

export const deductFromBudget = async (departmentId, amount, fiscalYear) => {
  try {
    const year = fiscalYear || new Date().getFullYear();

    const budget = await getDepartmentBudget(departmentId, year);

    if (!budget) throw new Error('No budget found for this department');

    const newSpent = (parseFloat(budget.spent_amount) + amount).toFixed(2);

    const [updated] = await db
      .update(budgets)
      .set({ spent_amount: newSpent, updated_at: new Date() })
      .where(eq(budgets.id, budget.id))
      .returning();

    logger.info(
      `Budget (ID: ${budget.id}) spent_amount updated to $${newSpent}`
    );

    return updated;
  } catch (e) {
    logger.error('Error deducting from budget', e);
    throw e;
  }
};

export const deleteBudget = async id => {
  try {
    const [deleted] = await db
      .delete(budgets)
      .where(eq(budgets.id, id))
      .returning();

    if (!deleted) throw new Error('Budget not found');

    logger.info(`Budget (ID: ${id}) deleted`);

    return deleted;
  } catch (e) {
    logger.error(`Error deleting budget ${id}`, e);
    throw e;
  }
};
