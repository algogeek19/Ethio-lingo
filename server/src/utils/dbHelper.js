import logger from './logger.js';

export const safeDbQuery = async (dbFn, fallbackFn) => {
  try {
    return await dbFn();
  } catch (error) {
    logger.warn(`Database connection failed (${error.code || error.name}). Serving from fallback storage store.`);
    return typeof fallbackFn === 'function' ? await fallbackFn() : fallbackFn;
  }
};
