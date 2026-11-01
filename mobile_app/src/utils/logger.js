/**
 * Production logger utility
 * Silences logs in production (__DEV__ === false) to improve performance and prevent log leaks.
 */
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

export const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  debug: (...args) => {
    if (isDev) console.debug(...args);
  },
  info: (...args) => {
    if (isDev) console.info(...args);
  },
  warn: (...args) => {
    console.warn(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
};

export default logger;
