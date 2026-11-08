import type { NextConfig } from 'next'
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'
import { networkInterfaces } from 'os'

const PRIVATE_IPV4 = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/

function getLanAddress(): string {
	const addresses = Object.values(networkInterfaces()).flat()
	const lan = addresses.find(
		(a) => a && a.family === 'IPv4' && !a.internal && PRIVATE_IPV4.test(a.address)
	)
	return lan?.address ?? ''
}

export default function config(phase: string): NextConfig {
	if (phase !== PHASE_DEVELOPMENT_SERVER) return {}
	return {
		// lets dev QR codes point phones at this machine instead of localhost
		env: { NEXT_PUBLIC_DEV_LAN_ADDRESS: getLanAddress() },
		// proxy wrangler (including WebSockets) so phones on an HTTPS page don't hit mixed content
		async rewrites() {
			return [{ source: '/parties/:path*', destination: 'http://127.0.0.1:8787/parties/:path*' }]
		},
	}
}
