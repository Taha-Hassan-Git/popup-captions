export type Action =
	| { type: 'toggle-ready'; payload: { id: string } }
	| { type: 'player-joined'; payload: { name: string; id: string } }

export type Player = {
	name: string
	id: string
	ready: boolean
}

export type StateNames = 'playing' | 'waiting'

export interface GameInfo {
	state: StateNames
	roomId: string
	players: Player[]
}

export type GameLoading = { state: 'loading' }

export type GameState = GameInfo | GameLoading

export interface GameFormInfo {
	roomId: string
	playerName: string
	playerId: string
}
