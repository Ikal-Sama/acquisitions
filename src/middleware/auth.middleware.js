import { jwttoken } from '#utils/jwt.js';
import logger from '#config/logger.js';

const authenticate = (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwttoken.verify(token);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (e) {
    logger.warn('Authentication failed', e);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default authenticate;
