import * as path from "path";
import crypto from "crypto";

import { getEnv, getEnvInt } from "./environment";

export const PORT = getEnvInt("PORT", 8000);
export const WWW_ROOT = getEnv("WWW_ROOT", path.resolve("../frontend/build"));
export const SESSION_SECRET = getEnv(
  "SESSION_SECRET",
  crypto.randomBytes(128).toString("base64")
);

// OAuth2 client / provider config
export const OAUTH_PROVIDER_URL: string | null = getEnv(
  "AUTH_PROVIDER_URL",
  null
);
export const OAUTH_CLIENT_URL = getEnv(
  "OAUTH_CLIENT_URL",
  OAUTH_PROVIDER_URL ? undefined : null
);
export const OAUTH_CLIENT_ID = getEnv(
  "OAUTH_CLIENT_ID",
  OAUTH_PROVIDER_URL ? undefined : null
);
export const OAUTH_CLIENT_SECRET = getEnv(
  "OAUTH_CLIENT_SECRET",
  OAUTH_PROVIDER_URL ? undefined : null
);
export const USE_OAUTH = !!OAUTH_PROVIDER_URL;

// local dev
export const LOCAL_HTTP_PROXY = getEnv("LOCAL_HTTP_PROXY", null);
export const LOCAL_HTTPS_CERT_FILE = getEnv("LOCAL_HTTPS_CERT_FILE", null);
export const LOCAL_HTTPS_PRIVATE_KEY_FILE = getEnv(
  "LOCAL_HTTPS_PRIVATE_KEY_FILE",
  LOCAL_HTTPS_CERT_FILE ? undefined : null
);
