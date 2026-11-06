import { beforeEach, describe, expect, it } from '@jest/globals'
import { GameManager } from '../game-logic/GameManager'

// Constants for player names
const PLAYER_1 = 'player1'
const PLAYER_2 = 'player2'

// Test constants
const ROOM_ID = 'test-room'

let gameManager: GameManager

describe('When initialising a game...', () => {
	gameManager = GameManager.createNew({
		playerName: PLAYER_1,
		playerId: PLAYER_1,
		roomId: ROOM_ID,
	})
	const gameState = gameManager.getState()

	it('returns a game in the waiting state', () => {
		expect(gameState.state).toEqual('waiting')
	})

	it('returns a game with the correct basic information', () => {
		expect(gameState.roomId).toEqual(ROOM_ID)
	})

	it('returns a game with a valid player', () => {
		expect(gameState.players.length).toBe(1)
		expect(gameState.players[0].name).toEqual(PLAYER_1)
		expect(gameState.players[0].ready).toBeFalsy()
	})
})

describe('When in the waiting state...', () => {
	beforeEach(() => {
		gameManager = GameManager.createNew({
			playerName: PLAYER_1,
			playerId: PLAYER_1,
			roomId: ROOM_ID,
		})
	})

	it('can add players', () => {
		gameManager.handleAction({
			type: 'player-joined',
			payload: { id: PLAYER_2, name: PLAYER_2 },
		})

		const gameState = gameManager.getState()
		expect(gameState.players.length).toBe(2)
		expect(gameState.players[1].name).toEqual(PLAYER_2)
	})

	it('toggles the ready state of players', () => {
		// Toggle ready ON
		gameManager.handleAction({
			type: 'toggle-ready',
			payload: { id: PLAYER_1 },
		})

		let gameState = gameManager.getState()
		const player = gameState.players[0]
		expect(player.ready).toBeTruthy()

		// Toggle ready OFF
		gameManager.handleAction({
			type: 'toggle-ready',
			payload: { id: PLAYER_1 },
		})

		gameState = gameManager.getState()
		const updatedPlayer = gameState.players[0]
		expect(updatedPlayer.ready).toBeFalsy()
	})
})
