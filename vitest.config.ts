import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        include: ['tests/*.test.{ts,js}'],
        pool: 'threads',
        maxWorkers: 2
    }
});
