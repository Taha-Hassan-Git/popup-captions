import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
	baseDirectory: __dirname,
})

const eslintConfig = [
	...compat.extends('next/core-web-vitals', 'next/typescript'),
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
]

export default eslintConfig
