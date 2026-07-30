import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  // Server
  NODE_ENV: string;
  PORT: number;
  API_PREFIX: string;

  // Database
  DATABASE_URL: string;

  // JWT
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRY: string;
  JWT_REFRESH_EXPIRY: string;

  // Bcrypt
  BCRYPT_SALT_ROUNDS: number;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // CORS
  CORS_ORIGIN: string;

  // Logging
  LOG_LEVEL: string;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvVarAsNumber(key: string, defaultValue?: number): number {
  const raw = process.env[key];
  if (raw !== undefined) {
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a number, got: ${raw}`);
    }
    return parsed;
  }
  if (defaultValue !== undefined) return defaultValue;
  throw new Error(`Missing required environment variable: ${key}`);
}

export const env: EnvConfig = {
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: getEnvVarAsNumber('PORT', 4000),
  API_PREFIX: getEnvVar('API_PREFIX', '/api/v1'),

  DATABASE_URL: getEnvVar('DATABASE_URL'),

  JWT_ACCESS_SECRET: getEnvVar('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: getEnvVar('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRY: getEnvVar('JWT_ACCESS_EXPIRY', '15m'),
  JWT_REFRESH_EXPIRY: getEnvVar('JWT_REFRESH_EXPIRY', '7d'),

  BCRYPT_SALT_ROUNDS: getEnvVarAsNumber('BCRYPT_SALT_ROUNDS', 12),

  RATE_LIMIT_WINDOW_MS: getEnvVarAsNumber('RATE_LIMIT_WINDOW_MS', 900000),
  RATE_LIMIT_MAX_REQUESTS: getEnvVarAsNumber('RATE_LIMIT_MAX_REQUESTS', 100),

  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', 'http://localhost:3000,http://localhost:3001,https://coldstorage-api.onrender.com,https://coldstorage-4lql.onrender.com'),

  LOG_LEVEL: getEnvVar('LOG_LEVEL', 'debug'),
};

export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// ── Production secret validation ──────────────────
if (isProd) {
  const weak = (s: string) =>
    s.length < 32 ||
    /dev|test|change|example|secret/i.test(s) ||
    s === 'dev-access-secret-key-coldstorage-2024' ||
    s === 'dev-refresh-secret-key-coldstorage-2024';

  if (weak(env.JWT_ACCESS_SECRET) || weak(env.JWT_REFRESH_SECRET)) {
    throw new Error(
      '🚨 FATAL: JWT secrets are too weak for production. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }
}
