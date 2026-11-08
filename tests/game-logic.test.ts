import { beforeEach, describe, expect, it } from '@jest/globals'
import { GameManager, MAX_CAPTIONS } from '../game-logic/GameManager'

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

describe('When captioning...', () => {
	const caption = (id: string, text: string, final: boolean, playerId = PLAYER_1) => {
		gameManager.handleAction({ type: 'caption', payload: { id, text, final, playerId } })
	}

	beforeEach(() => {
		gameManager = GameManager.createNew({
			playerName: PLAYER_1,
			playerId: PLAYER_1,
			roomId: ROOM_ID,
			role: 'mic',
		})
		gameManager.handleAction({
			type: 'player-joined',
			payload: { id: PLAYER_2, name: PLAYER_2, role: 'audience' },
		})
	})

	it('starts with no captions', () => {
		expect(gameManager.getState().captions).toEqual([])
	})

	it('updates an interim caption in place until it is final', () => {
		caption('c1', 'hello', false)
		caption('c1', 'hello world', false)
		caption('c1', 'Hello world.', true)

		expect(gameManager.getState().captions).toEqual([
			{ id: 'c1', playerId: PLAYER_1, text: 'Hello world.', final: true },
		])
	})

	it('ignores captions from audience members and unknown players', () => {
		caption('c1', 'hi', true, PLAYER_2)
		caption('c2', 'hi', true, 'stranger')

		expect(gameManager.getState().captions).toHaveLength(0)
	})

	it('removes a caption that becomes empty', () => {
		caption('c1', 'um', false)
		caption('c1', '  ', true)

		expect(gameManager.getState().captions).toHaveLength(0)
	})

	it(`keeps only the latest ${MAX_CAPTIONS} captions`, () => {
		for (let i = 0; i < MAX_CAPTIONS + 5; i++) caption(`c${i}`, `line ${i}`, true)

		const captions = gameManager.getState().captions
		expect(captions).toHaveLength(MAX_CAPTIONS)
		expect(captions[0].id).toBe('c5')
	})
})
