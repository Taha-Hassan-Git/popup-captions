import { type Connection, routePartykitRequest, Server } from 'partyserver'
import { GameManager } from '../game-logic/GameManager'
import { Action, GameFormInfo, GameInfo, isRole } from '../game-logic/types'

type Env = {
	GameServer: DurableObjectNamespace<GameServer>
}

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

	onMessage(_connection: Connection, message: string | ArrayBuffer) {
		if (!this.gameManager) return

		const raw = typeof message === 'string' ? message : new TextDecoder().decode(message)
		const action = JSON.parse(raw) as Action
		this.gameManager.handleAction(action)
		this.broadcast(JSON.stringify(this.gameManager.getState()))
	}

	async saveGame() {
		if (this.gameManager) {
			await this.ctx.storage.put<GameInfo>('game', this.gameManager.getState())
		}
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return (await routePartykitRequest(request, env)) || new Response('Not Found', { status: 404 })
	},
} satisfies ExportedHandler<Env>
