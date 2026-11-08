import { Action, Caption, GameFormInfo, GameInfo, Player, Role } from './types'

export const MAX_CAPTIONS = 50
export const MAX_CAPTION_LENGTH = 1000

export class GameManager {
	private game: GameInfo

	constructor(gameInfo?: GameInfo) {
		if (gameInfo) {
			// rooms saved before captions existed have no captions field
			this.game = { ...gameInfo, captions: gameInfo.captions ?? [] }
		} else {
			throw new Error('Game info is required to initialize GameManager')
		}
	}

	static createNew(formInfo: GameFormInfo): GameManager {
		const initialGame: GameInfo = {
			roomId: formInfo.roomId,
			players: [{ name: formInfo.playerName, id: formInfo.playerId, role: formInfo.role }],
			captions: [],
		}

		return new GameManager(initialGame)
	}

	getState(): GameInfo {
		return this.game
	}

	handleAction(action: Action): void {
		switch (action.type) {
			case 'player-joined': {
				const { name, id, role } = action.payload
				this.handlePlayerJoined(name, id, role)
				break
			}
			case 'caption': {
				this.handleCaption(action.payload)
				break
			}
		}
	}

	private handleCaption(caption: Caption): void {
		const speaker = this.game.players.find((player) => player.id === caption.playerId)
		if (speaker?.role !== 'mic') return

		const text = String(caption.text).trim().slice(0, MAX_CAPTION_LENGTH)
		const existing = this.game.captions.some((c) => c.id === caption.id)

		let captions: Caption[]
		if (!text) {
			captions = this.game.captions.filter((c) => c.id !== caption.id)
		} else {
			const updated: Caption = {
				id: String(caption.id),
				playerId: speaker.id,
				text,
				final: Boolean(caption.final),
			}
			captions = existing
				? this.game.captions.map((c) => (c.id === caption.id ? updated : c))
				: [...this.game.captions, updated]
		}

		this.game = { ...this.game, captions: captions.slice(-MAX_CAPTIONS) }
	}

	private readonly playerNameAdditions: string[] = [
		'The Second',
		'But Cooler',
		'2 Electric Boogaloo',
		'Jr',
	]
	private handlePlayerJoined(playerName: string, id: string, role: Role): void {
		const others = this.game.players.filter((player) => player.id !== id)
		const nameTaken = others.some((player) => player.name === playerName)
		const nameToUse = nameTaken
			? `${playerName} ${this.playerNameAdditions[Math.floor(Math.random() * this.playerNameAdditions.length)]}`
			: playerName

		const joiningPlayer: Player = { name: nameToUse, id, role }
		const isRejoining = others.length !== this.game.players.length

		const newPlayers = isRejoining
			? this.game.players.map((player) => (player.id === id ? joiningPlayer : player))
			: [...this.game.players, joiningPlayer]

		this.game = { ...this.game, players: newPlayers }
	}
}
