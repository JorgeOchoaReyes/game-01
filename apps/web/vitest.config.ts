import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // run through `pnpm test`, which starts the Firebase emulators around vitest
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    env: {
      FRANKIE_JWT_SECRET: "test-frankie-secret-test-frankie-secret-test",
    },
    testTimeout: 30000,
    fileParallelism: false,
  },
});
