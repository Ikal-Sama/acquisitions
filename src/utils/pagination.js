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
