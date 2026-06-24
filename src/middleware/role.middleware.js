import logger from '#config/logger.js';

export const requireRole = (...allowedRoles) => {
  const roles = allowedRoles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Forbidden: user ${req.user.id} (role=${req.user.role}) tried to access ${req.method} ${req.originalUrl} (requires one of: ${roles.join(', ')})`
      );

      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

export default requireRole;
