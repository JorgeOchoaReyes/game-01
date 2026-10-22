import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    env: {
      POLLY_PGLITE_DIR: "memory://",
      POLLY_AUTH_SECRET: "test-polly-secret-test-polly-secret-test-polly",
      FRANKIE_JWT_SECRET: "test-frankie-secret-test-frankie-secret-test",
    },
    testTimeout: 30000,
    fileParallelism: false,
  },
});
