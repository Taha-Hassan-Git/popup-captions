export const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? '127.0.0.1:8787'

// Local/LAN addresses are served over plain http/ws; anything else (e.g. a
// deployed *.workers.dev host) uses https/wss. This mirrors partysocket's own
// protocol detection so the client socket and server-side fetch stay in sync.
const LOCAL_HOST_PATTERN =
	/^(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/
export const PROTOCOL = LOCAL_HOST_PATTERN.test(PARTYKIT_HOST) ? 'http' : 'https'
export const PARTYKIT_URL = `${PROTOCOL}://${PARTYKIT_HOST}`
