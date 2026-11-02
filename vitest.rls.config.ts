import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

// Row-level security tests need a local Supabase (`supabase start`), so they stay out of `npm test`.
export default defineConfig({
  test: {
    include: ['supabase/tests/**/*.test.ts'],
    env: loadEnv('test', '.', ''),
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
