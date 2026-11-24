export type Action =
	| { type: 'player-joined'; payload: { name: string; id: string; role: Role } }
	| { type: 'caption'; payload: Caption }
	| { type: 'set-language'; payload: { language: CaptionLanguage } }

/** Languages mics can transcribe, as BCP 47 tags for speech recognition. */
export const captionLanguages = ['en-US', 'es-MX'] as const
export type CaptionLanguage = (typeof captionLanguages)[number]

export function isCaptionLanguage(value: unknown): value is CaptionLanguage {
	return captionLanguages.includes(value as CaptionLanguage)
}

/** A caption id is reused while a phrase is interim, then sent once more with `final: true`. */
export type Caption = {
	id: string
	playerId: string
	text: string
	final: boolean
}

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
	captions: Caption[]
	/** The language every mic in the room transcribes; unset until someone picks one. */
	language?: CaptionLanguage
}

export type GameState = GameInfo | null

export interface GameFormInfo {
	roomId: string
	playerName: string
	playerId: string
	role: Role
}
