import { Action, GameFormInfo, GameInfo, Player, Role } from './types'

export class GameManager {
	private game: GameInfo

	constructor(gameInfo?: GameInfo) {
		if (gameInfo) {
			this.game = gameInfo
		} else {
			throw new Error('Game info is required to initialize GameManager')
		}
	}

	static createNew(formInfo: GameFormInfo): GameManager {
		const initialGame: GameInfo = {
			roomId: formInfo.roomId,
			players: [{ name: formInfo.playerName, id: formInfo.playerId, role: formInfo.role }],
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
		}
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
