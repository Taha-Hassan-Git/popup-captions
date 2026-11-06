import { Action, GameFormInfo, GameInfo, Player, StateNames } from './types'

export class GameManager {
	private readonly STATE_TRANSITIONS: Record<StateNames, StateNames> = {
		waiting: 'playing',
		playing: 'waiting',
	} as const

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
			state: 'waiting',
			roomId: formInfo.roomId,
			players: [{ name: formInfo.playerName, id: formInfo.playerId, ready: false }],
		}

		return new GameManager(initialGame)
	}

	getState(): GameInfo {
		return this.game
	}

	handleAction(action: Action): void {
		switch (action.type) {
			case 'player-joined': {
				this.handlePlayerJoined(action.payload.name, action.payload.id)
				break
			}
			case 'toggle-ready': {
				this.handleToggleReady(action.payload.id)
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
	private handlePlayerJoined(playerName: string, id: string): void {
		const sameName = this.game.players.some((player) => player.name === playerName)
		let nameToUse = playerName

		if (sameName) {
			// does this player have the same id?, if so, do nothing
			const sameId = this.game.players.some((player) => player.id === id)
			if (sameId) return
			//if not then it's a different player, update the playerName to be different
			nameToUse = `${playerName} ${this.playerNameAdditions[Math.floor(Math.random() * this.playerNameAdditions.length)]}`
		}

		const newPlayer: Player = {
			name: nameToUse,
			id,
			ready: false,
		}

		const newPlayers = [...this.game.players, newPlayer]

		this.game = { ...this.game, players: newPlayers }
	}

	private handleToggleReady(id: string): void {
		const newPlayers = this.game.players.map((player) =>
			player.id === id ? { ...player, ready: !player.ready } : player
		)
		this.game = { ...this.game, players: newPlayers }
		this.tryAdvanceGameState()
	}

	private tryAdvanceGameState(): void {
		const allPlayersReady = this.game.players.every((player) => player.ready)

		if (allPlayersReady) {
			this.advanceToNextState()
		}
	}

	private advanceToNextState(): void {
		const prevState = this.game.state
		const nextState = this.STATE_TRANSITIONS[prevState]
		this.game = { ...this.game, state: nextState }
	}
}
