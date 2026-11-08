// Creates a self-signed HTTPS certificate for local dev that covers this machine's LAN addresses,
// so phones can open the app over HTTPS (browsers only allow microphone access on secure pages).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'

const DIR = 'certificates'
const KEY = `${DIR}/dev-key.pem`
const CERT = `${DIR}/dev-cert.pem`
const HOSTS = `${DIR}/dev-hosts.txt`
const PRIVATE_IPV4 = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/

const lanAddresses = Object.values(networkInterfaces())
	.flat()
	.filter((a) => a && a.family === 'IPv4' && !a.internal && PRIVATE_IPV4.test(a.address))
	.map((a) => a.address)

const subjectAltNames = [
	'DNS:localhost',
	'IP:127.0.0.1',
	'IP:::1',
	...lanAddresses.map((address) => `IP:${address}`),
].join(',')

const upToDate =
	existsSync(KEY) && existsSync(CERT) && existsSync(HOSTS) && readFileSync(HOSTS, 'utf8') === subjectAltNames

if (!upToDate) {
	mkdirSync(DIR, { recursive: true })
	execFileSync(
		'openssl',
		[
			'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256',
			// iOS rejects TLS certificates valid for longer than 825 days
			'-days', '825',
			'-keyout', KEY,
			'-out', CERT,
			'-subj', '/CN=Popup local dev',
			'-addext', `subjectAltName=${subjectAltNames}`,
			'-addext', 'extendedKeyUsage=serverAuth',
		],
		{ stdio: 'pipe' }
	)
	writeFileSync(HOSTS, subjectAltNames)
	console.log(`Created dev certificate for localhost, ${lanAddresses.join(', ') || '(no LAN address found)'}`)
}
