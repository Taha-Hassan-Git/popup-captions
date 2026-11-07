export type Action = { type: 'player-joined'; payload: { name: string; id: string; role: Role } }

export const roles = ['mic', 'audience'] as const
export type Role = (typeof roles)[number]

export function isRole(value: unknown): value is Role {
	return roles.includes(value as Role)
}

export type Player = {
	name: string
	id: string
	role: Role
}

export interface GameInfo {
	roomId: string
	players: Player[]
}

export type GameState = GameInfo | null

export interface GameFormInfo {
	roomId: string
	playerName: string
	playerId: string
	role: Role
}
