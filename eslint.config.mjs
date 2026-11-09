import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { defineConfig, globalIgnores } from 'eslint/config'

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	globalIgnores([
		'.next/**',
		'.wrangler/**',
		'out/**',
		'build/**',
		'coverage/**',
		'playwright-report/**',
		'test-results/**',
		'next-env.d.ts',
	]),
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
		},
	},
	{
		// Playwright fixtures use a callback conventionally named `use`, which the
		// react-hooks plugin mistakes for a React Hook. Disable that rule for tests.
		files: ['tests/**'],
		rules: {
			'react-hooks/rules-of-hooks': 'off',
		},
	},
])

export default eslintConfig
