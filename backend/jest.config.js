/** @type {import('jest').Config} */
const config = {
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          target: "esnext",
          module: "commonjs",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          exactOptionalPropertyTypes: true,
          noUncheckedIndexedAccess: true,
          types: ["node", "jest"],
        },
      },
    ],
  },
  testEnvironment: "node",
  // Load test env vars BEFORE any module is imported so env.schema doesn't
  // throw on missing DATABASE_URL / STORAGE_* during the config import chain.
  setupFiles: ["<rootDir>/tests/setup.env.ts"],
  moduleNameMapper: {
    // Map @prisma/client to a stub so tests don't need a generated client or
    // a real DB. Individual tests override specific prisma methods via jest.mock.
    "^@prisma/client$": "<rootDir>/tests/__mocks__/prisma-client.ts",
  },
};

module.exports = config;