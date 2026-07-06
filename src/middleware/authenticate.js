import { timingSafeEqual } from 'node:crypto';
import { config } from '../config/index.js';
import { API_KEY_HEADER } from '../config/constants.js';

function unauthorized() {
  const err = new Error('Unauthorized');
  err.statusCode = 401;
  err.code = 'UNAUTHORIZED';
  return err;
}

function safeCompare(provided, expected) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function authenticate(req, _res, next) {
  const apiKey = req.headers[API_KEY_HEADER];

  if (typeof apiKey !== 'string' || !safeCompare(apiKey, config.apiKey)) {
    next(unauthorized());
    return;
  }

  next();
}
