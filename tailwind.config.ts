import type { Config } from 'tailwindcss'

export default {
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			colors: {
				background: 'var(--background)',
				foreground: 'var(--foreground)',
			},
			fontFamily: {
				sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
				mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
			},
			keyframes: {
				ripple: {
					'0%': { transform: 'scale(1)', opacity: '1' },
					'100%': { transform: 'scale(1.7)', opacity: '0' },
				},
				'pulse-ring': {
					'0%, 100%': { transform: 'scale(1.15)', opacity: '1' },
					'50%': { transform: 'scale(1.4)', opacity: '0.5' },
				},
				'fade-up': {
					from: { opacity: '0', transform: 'translateY(8px)' },
					to: { opacity: '1', transform: 'none' },
				},
				'fade-in': {
					from: { opacity: '0' },
					to: { opacity: '1' },
				},
				'dialog-in': {
					from: { opacity: '0', transform: 'translate(-50%, -48%) scale(0.96)' },
					to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
				},
			},
			animation: {
				ripple: 'ripple 2.4s cubic-bezier(0, 0, 0.2, 1) infinite',
				'pulse-ring': 'pulse-ring 1.2s ease-in-out infinite',
				'fade-up': 'fade-up 300ms ease-out',
				'fade-in': 'fade-in 150ms ease-out',
				'dialog-in': 'dialog-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
			},
		},
	},
	plugins: [],
} satisfies Config
