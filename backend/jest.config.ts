import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  // macOS can create AppleDouble `._*` sidecar files on external drives.
  // They are binary metadata, not TypeScript tests.
  testPathIgnorePatterns: ['/node_modules/', '/\\._[^/]+$'],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  setupFilesAfterEnv: [],
  testTimeout: 15000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
};

export default config;
