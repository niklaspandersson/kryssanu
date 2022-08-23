import * as path from 'path';
import crypto from 'crypto';

import { getEnv, getEnvInt } from './environment';

export const IS_DEV = getEnv('NODE_ENV', 'production') === 'development';
export const LISTEN_HOST = getEnv('LISTEN_HOST', '0.0.0.0');
export const PORT = getEnvInt('PORT', 8000);

export const WWW_ROOT = getEnv('WWW_ROOT', path.resolve('../client/build'));
export const SESSION_SECRET = getEnv(
  'SESSION_SECRET',
  crypto.randomBytes(128).toString('base64')
);

export const MONGODB_URI = getEnv('MONGODB_URI', 'mongodb://localhost:27017');
export const MONGODB_DBNAME = getEnv('MONGODB_DBNAME', 'kryssanu');
export const BIRDS_PATH = getEnv(
  'BIRDS_PATH',
  path.resolve('./data/sweden.json')
);

// OAuth2 client / provider config
export const GOOGLE_CLIENT_ID = getEnv('GOOGLE_CLIENT_ID', null);
export const GOOGLE_CLIENT_SECRET = getEnv(
  'GOOGLE_CLIENT_SECRET',
  GOOGLE_CLIENT_ID ? undefined : null
);
export const GOOGLE_OAUTH_REDIRECT_URL = getEnv(
  'GOOGLE_OAUTH_REDIRECT_URL',
  GOOGLE_CLIENT_ID ? undefined : null
);
export const USE_OAUTH = !!GOOGLE_CLIENT_ID;

// local dev
export const DEV_HTTP_PROXY = getEnv('DEV_HTTP_PROXY', null);
export const DEV_HTTPS_CERT_FILE = getEnv('DEV_HTTPS_CERT_FILE', null);
export const DEV_HTTPS_PRIVATE_KEY_FILE = getEnv(
  'DEV_HTTPS_PRIVATE_KEY_FILE',
  DEV_HTTPS_CERT_FILE ? undefined : null
);
export const DEV_FAKE_USER_ID = getEnv('DEV_FAKE_USER_ID', null);
export const USE_HTTPS = !!DEV_HTTPS_CERT_FILE;
