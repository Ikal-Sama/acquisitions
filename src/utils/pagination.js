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
