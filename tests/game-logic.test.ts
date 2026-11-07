import { beforeEach, describe, expect, it } from '@jest/globals'
import { GameManager } from '../game-logic/GameManager'

// Constants for player names
const PLAYER_1 = 'player1'
const PLAYER_2 = 'player2'

// Test constants
const ROOM_ID = 'test-room'

let gameManager: GameManager

describe('When creating a room...', () => {
	gameManager = GameManager.createNew({
		playerName: PLAYER_1,
		playerId: PLAYER_1,
		roomId: ROOM_ID,
		role: 'mic',
	})
	const gameState = gameManager.getState()

	it('returns a room with the correct basic information', () => {
		expect(gameState.roomId).toEqual(ROOM_ID)
	})

	it('returns a room with the creator and their role', () => {
		expect(gameState.players).toHaveLength(1)
		expect(gameState.players[0].name).toEqual(PLAYER_1)
		expect(gameState.players[0].role).toEqual('mic')
	})
})

describe('When joining a room...', () => {
	beforeEach(() => {
		gameManager = GameManager.createNew({
			playerName: PLAYER_1,
			playerId: PLAYER_1,
			roomId: ROOM_ID,
			role: 'mic',
		})
	})

	it('adds players with their chosen role', () => {
		gameManager.handleAction({
			type: 'player-joined',
			payload: { id: PLAYER_2, name: PLAYER_2, role: 'audience' },
		})

		const gameState = gameManager.getState()
		expect(gameState.players).toHaveLength(2)
		expect(gameState.players[1].name).toEqual(PLAYER_2)
		expect(gameState.players[1].role).toEqual('audience')
	})

	it('updates a rejoining player instead of duplicating them', () => {
		gameManager.handleAction({
			type: 'player-joined',
			payload: { id: PLAYER_1, name: 'renamed', role: 'audience' },
		})

		const [player] = gameManager.getState().players
		expect(gameManager.getState().players).toHaveLength(1)
		expect(player.name).toEqual('renamed')
		expect(player.role).toEqual('audience')
	})

	it('gives a different player with the same name a distinct name', () => {
		gameManager.handleAction({
			type: 'player-joined',
			payload: { id: PLAYER_2, name: PLAYER_1, role: 'audience' },
		})

		const players = gameManager.getState().players
		expect(players).toHaveLength(2)
		expect(players[1].name).not.toEqual(PLAYER_1)
		expect(players[1].name.startsWith(PLAYER_1)).toBe(true)
	})
})
