const DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
};

export const parsePagination = query => {
  const page = Math.max(1, parseInt(query.page, 10) || DEFAULTS.page);
  const limit = Math.min(
    DEFAULTS.maxLimit,
    Math.max(1, parseInt(query.limit, 10) || DEFAULTS.limit)
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

export const paginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit) || 0,
});

export const parseSort = (query, allowedFields = []) => {
  if (!query.sort) return [];

  const sortFields = [];

  for (const part of query.sort.split(',')) {
    const [rawField, rawDir = 'asc'] = part.split(':');
    const field = rawField.trim();
    const direction = rawDir.trim().toLowerCase() === 'desc' ? 'desc' : 'asc';

    if (field && allowedFields.includes(field)) {
      sortFields.push({ field, direction });
    }
  }

  return sortFields;
};

export const parseFields = (query, allowedFields = []) => {
  if (!query.fields) return [];

  return query.fields
    .split(',')
    .map(f => f.trim())
    .filter(f => f && allowedFields.includes(f));
};

const filterValue = (raw, type) => {
  if (type === 'number') {
    const v = Number(raw);
    return isNaN(v) ? undefined : v;
  }
  if (type === 'integer') {
    const v = parseInt(raw, 10);
    return isNaN(v) ? undefined : v;
  }
  if (type === 'date') {
    const v = new Date(raw);
    return isNaN(v.getTime()) ? undefined : v;
  }
  return raw;
};

export const parseFilters = (query, filterConfig = {}) => {
  const filters = [];

  for (const [key, rawValue] of Object.entries(query)) {
    const dotIndex = key.lastIndexOf('.');
    let field;
    let operator;

    if (dotIndex > 0 && dotIndex < key.length - 1) {
      field = key.slice(0, dotIndex);
      operator = key.slice(dotIndex + 1);
    } else {
      field = key;
      operator = 'eq';
    }

    const config = filterConfig[field];
    if (!config || !config.operators.includes(operator)) continue;

    const value = filterValue(rawValue, config.type);
    if (value === undefined) continue;

    filters.push({ field, operator, value });
  }

  return filters;
};
