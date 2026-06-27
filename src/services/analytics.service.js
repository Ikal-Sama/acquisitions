import { db } from '#config/database.js';
import { sql, eq, and } from 'drizzle-orm';
import { departments } from '#models/department.model.js';
import { vendors } from '#models/vendor.model.js';
import { purchaseOrders } from '#models/purchase_order.model.js';
import { requisitions } from '#models/requisition.model.js';
import { assets } from '#models/asset.model.js';
import { budgets } from '#models/budget.model.js';

export const getSummary = async () => {
  const [
    deptCount,
    vendorCount,
    poCounts,
    reqCounts,
    assetCount,
    budgetTotals,
  ] = await Promise.all([
    db.select({ count: sql`count(*)` }).from(departments),
    db.select({ count: sql`count(*)` }).from(vendors),
    db
      .select({
        status: purchaseOrders.status,
        count: sql`count(*)`,
        total: sql`coalesce(sum(${purchaseOrders.total_amount}), 0)`,
      })
      .from(purchaseOrders)
      .groupBy(purchaseOrders.status),
    db
      .select({
        status: requisitions.status,
        count: sql`count(*)`,
      })
      .from(requisitions)
      .groupBy(requisitions.status),
    db.select({ count: sql`count(*)` }).from(assets),
    db
      .select({
        allocated: sql`coalesce(sum(${budgets.allocated_amount}), 0)`,
        spent: sql`coalesce(sum(${budgets.spent_amount}), 0)`,
      })
      .from(budgets),
  ]);

  return {
    departments: Number(deptCount[0]?.count ?? 0),
    vendors: Number(vendorCount[0]?.count ?? 0),
    purchase_orders: poCounts.map(r => ({
      status: r.status,
      count: Number(r.count),
      total: Number(r.total),
    })),
    requisitions: reqCounts.map(r => ({
      status: r.status,
      count: Number(r.count),
    })),
    assets: Number(assetCount[0]?.count ?? 0),
    budget: {
      total_allocated: Number(budgetTotals[0]?.allocated ?? 0),
      total_spent: Number(budgetTotals[0]?.spent ?? 0),
    },
  };
};

export const getSpendByDepartment = async () => {
  const result = await db
    .select({
      department_id: budgets.department_id,
      department_name: departments.name,
      allocated: sql`coalesce(sum(${budgets.allocated_amount}), 0)`,
      spent: sql`coalesce(sum(${budgets.spent_amount}), 0)`,
    })
    .from(budgets)
    .innerJoin(departments, eq(budgets.department_id, departments.id))
    .groupBy(budgets.department_id, departments.name)
    .orderBy(departments.name);

  return result.map(r => ({
    department_id: r.department_id,
    department_name: r.department_name,
    allocated: Number(r.allocated),
    spent: Number(r.spent),
  }));
};

export const getSpendByVendor = async () => {
  const result = await db
    .select({
      vendor_id: purchaseOrders.vendor_id,
      vendor_name: vendors.name,
      total_spent: sql`coalesce(sum(${purchaseOrders.total_amount}), 0)`,
      order_count: sql`count(*)`,
    })
    .from(purchaseOrders)
    .innerJoin(vendors, eq(purchaseOrders.vendor_id, vendors.id))
    .groupBy(purchaseOrders.vendor_id, vendors.name)
    .orderBy(vendors.name);

  return result.map(r => ({
    vendor_id: r.vendor_id,
    vendor_name: r.vendor_name,
    total_spent: Number(r.total_spent),
    order_count: Number(r.order_count),
  }));
};

export const getBudgetUtilization = async fiscalYear => {
  const conditions = [sql`1=1`];

  if (fiscalYear) {
    conditions.push(eq(budgets.fiscal_year, fiscalYear));
  }

  const result = await db
    .select({
      id: budgets.id,
      department_id: budgets.department_id,
      department_name: departments.name,
      fiscal_year: budgets.fiscal_year,
      allocated: budgets.allocated_amount,
      spent: budgets.spent_amount,
    })
    .from(budgets)
    .innerJoin(departments, eq(budgets.department_id, departments.id))
    .where(and(...conditions))
    .orderBy(budgets.fiscal_year, departments.name);

  return result.map(r => {
    const allocated = Number(r.allocated);
    const spent = Number(r.spent);
    const utilization_pct =
      allocated > 0 ? Math.round((spent / allocated) * 10000) / 100 : 0;

    return {
      id: r.id,
      department_id: r.department_id,
      department_name: r.department_name,
      fiscal_year: r.fiscal_year,
      allocated,
      spent,
      remaining: allocated - spent,
      utilization_pct,
    };
  });
};
