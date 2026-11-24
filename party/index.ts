import { type Connection, getServerByName, routePartykitRequest, Server } from 'partyserver'
import { GameManager } from '../game-logic/GameManager'
import { Action, GameFormInfo, GameInfo, isRole } from '../game-logic/types'

type Env = {
	GameServer: DurableObjectNamespace<GameServer>
	/** Local dev reads it from .env; deploy with `wrangler secret put ZOOM_API_KEY`. */
	ZOOM_API_KEY?: string
}

const SCRIBE_LIVE_URL = 'https://api.zoom.us/v2/aiservices/scribe/live'
const SCRIBE_PATH = /^\/scribe\/([^/]+)$/
// Clients may configure and close their session, but can't use other Scribe features through our key.
const ALLOWED_CLIENT_EVENTS = new Set(['session.update', 'session.close'])

export class GameServer extends Server<Env> {
	gameManager: GameManager | undefined

	async onStart() {
		const savedGame = await this.ctx.storage.get<GameInfo>('game')
		if (savedGame) {
			this.gameManager = new GameManager(savedGame)
		}
	}

	async onRequest(req: Request) {
		const formInfo = (await req.json()) as GameFormInfo
		if (!isRole(formInfo.role)) {
			return new Response('Invalid role', { status: 400 })
		}
		try {
			if (!this.gameManager) {
				// setting up a new game
				this.gameManager = GameManager.createNew(formInfo)
				await this.saveGame()
			} else {
				// new player joining an existing game
				this.gameManager.handleAction({
					type: 'player-joined',
					payload: {
						name: formInfo.playerName,
						id: formInfo.playerId,
						role: formInfo.role,
					},
				})
				await this.saveGame()
				this.broadcast(JSON.stringify(this.gameManager.getState()))
			}
			return new Response(JSON.stringify(this.gameManager.getState()), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		} catch {
			return new Response('Error creating game', { status: 500 })
		}
	}

	onConnect(connection: Connection) {
		if (!this.gameManager) return
		connection.send(JSON.stringify(this.gameManager.getState()))
	}

	onMessage(connection: Connection, message: string | ArrayBuffer) {
		if (!this.gameManager) return

		const raw = typeof message === 'string' ? message : new TextDecoder().decode(message)
		let action: Action
		try {
			action = JSON.parse(raw) as Action
		} catch {
			return
		}
		if (action.type === 'caption') {
			// the socket id is the player id, so mics can't caption as someone else
			action = { ...action, payload: { ...action.payload, playerId: connection.id } }
		}
		this.gameManager.handleAction(action)
		this.broadcast(JSON.stringify(this.gameManager.getState()))
		if (action.type === 'caption' && action.payload.final) {
			void this.saveGame()
		}
	}

	async saveGame() {
		if (this.gameManager) {
			await this.ctx.storage.put<GameInfo>('game', this.gameManager.getState())
		}
	}

	isMic(playerId: string): boolean {
		return !!this.gameManager
			?.getState()
			.players.some((player) => player.id === playerId && player.role === 'mic')
	}
}

function closeQuietly(socket: WebSocket, code = 1000, reason = '') {
	// only 1000 and 3000-4999 can be sent; others (e.g. 1006) only describe how a socket closed
	const sendable = code === 1000 || (code >= 3000 && code <= 4999)
	try {
		socket.close(sendable ? code : 1000, reason)
	} catch {
		// already closed
	}
}

/** Streams a mic's audio to Zoom Scribe Live so the API key never reaches the phone. */
async function relayToScribe(request: Request, env: Env, roomId: string): Promise<Response> {
	if (request.headers.get('Upgrade') !== 'websocket') {
		return new Response('Expected a WebSocket', { status: 426 })
	}
	if (!env.ZOOM_API_KEY) return new Response('Remote captioning is not configured', { status: 503 })

	const playerId = new URL(request.url).searchParams.get('playerId')
	const room = await getServerByName<Env, GameServer>(env.GameServer, roomId)
	if (!playerId || !(await room.isMic(playerId))) {
		return new Response('Only mics in this room can caption', { status: 403 })
	}

	const upstreamResponse = await fetch(SCRIBE_LIVE_URL, {
		headers: {
			Upgrade: 'websocket',
			'Sec-WebSocket-Protocol': 'live-asr',
			'x-api-key': env.ZOOM_API_KEY,
		},
	})
	const upstream = upstreamResponse.webSocket
	if (!upstream) {
		return new Response(`Zoom Scribe refused the connection (${upstreamResponse.status})`, {
			status: 502,
		})
	}
	upstream.accept()

	const { 0: client, 1: server } = new WebSocketPair()
	server.accept()

	server.addEventListener('message', (event) => {
		if (typeof event.data !== 'string') {
			upstream.send(event.data)
			return
		}
		try {
			if (ALLOWED_CLIENT_EVENTS.has(JSON.parse(event.data).type)) upstream.send(event.data)
		} catch {
			// ignore malformed messages
		}
	})
	upstream.addEventListener('message', (event) => server.send(event.data))
	server.addEventListener('close', (event) => closeQuietly(upstream, event.code, event.reason))
	upstream.addEventListener('close', (event) => closeQuietly(server, event.code, event.reason))
	server.addEventListener('error', () => closeQuietly(upstream))
	upstream.addEventListener('error', () => closeQuietly(server, 1000, 'Zoom Scribe connection failed'))

	return new Response(null, { status: 101, webSocket: client })
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const scribeRoom = new URL(request.url).pathname.match(SCRIBE_PATH)?.[1]
		if (scribeRoom) return relayToScribe(request, env, decodeURIComponent(scribeRoom))
		return (await routePartykitRequest(request, env)) || new Response('Not Found', { status: 404 })
	},
} satisfies ExportedHandler<Env>
