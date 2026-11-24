import usePartySocket from 'partysocket/react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Action, CaptionLanguage, GameInfo, GameState, Player } from '../../../game-logic/types'
import { PARTYKIT_HOST, PARTYKIT_SOCKET_PROTOCOL } from '../env'

interface GameContextValue {
	gameState: GameState
	dispatch: (action: Action) => void
	localPlayer: Player | null
	language: CaptionLanguage
	setLanguage: (language: CaptionLanguage) => void
}

const gameContext = createContext<GameContextValue>({
	gameState: null,
	dispatch: () => {},
	localPlayer: null,
	language: 'en-US',
	setLanguage: () => {},
})

/** Before anyone picks a room language, mics use one matching their phone's settings. */
function guessLanguage(): CaptionLanguage {
	const preferred = typeof navigator === 'undefined' ? '' : navigator.language
	return preferred.toLowerCase().startsWith('es') ? 'es-MX' : 'en-US'
}

export function GameProvider({
	children,
	playerId,
	roomId,
}: {
	children: React.ReactNode
	playerId: string
	roomId: string
}) {
	const [gameState, setGameState] = useState<GameState>(null)

	const socket = usePartySocket({
		host: PARTYKIT_HOST,
		protocol: PARTYKIT_SOCKET_PROTOCOL,
		party: 'game-server',
		room: roomId,
		id: playerId,
		onMessage(event) {
			const message = JSON.parse(event.data) as GameInfo
			if (message) setGameState(message)
		},
	})

	const localPlayer = useMemo(() => {
		if (!gameState) return null
		return gameState.players.find((player) => player.id === playerId) ?? null
	}, [gameState, playerId])

	const dispatch = useCallback(
		(action: Action) => {
			socket.send(JSON.stringify(action))
		},
		[socket]
	)

	// A choice made here shows straight away and lasts until the room reports a different language,
	// so the toggle still works on this phone if the party server doesn't store room languages yet.
	const roomLanguage = gameState?.language
	const [choice, setChoice] = useState<{
		language: CaptionLanguage
		roomLanguage: CaptionLanguage | undefined
	} | null>(null)
	const [fallbackLanguage] = useState(guessLanguage)
	const language =
		choice && choice.roomLanguage === roomLanguage
			? choice.language
			: (roomLanguage ?? fallbackLanguage)

	const setLanguage = useCallback(
		(next: CaptionLanguage) => {
			setChoice({ language: next, roomLanguage })
			dispatch({ type: 'set-language', payload: { language: next } })
		},
		[dispatch, roomLanguage]
	)

	return (
		<gameContext.Provider value={{ gameState, dispatch, localPlayer, language, setLanguage }}>
			{children}
		</gameContext.Provider>
	)
}

export function useGameState(): GameState {
	return useContext(gameContext).gameState
}

export function useDispatch(): (action: Action) => void {
	return useContext(gameContext).dispatch
}

/** The local player, or null if viewing as a spectator (never joined a room). */
export function useLocalPlayer(): Player | null {
	return useContext(gameContext).localPlayer
}

/** The language mics in this room transcribe, and a way for anyone in the room to change it. */
export function useRoomLanguage() {
	const { language, setLanguage } = useContext(gameContext)
	return { language, setLanguage }
}

/** Asserts the room has loaded. */
export function useActiveGame(): { gameState: GameInfo; dispatch: (action: Action) => void } {
	const { gameState, dispatch } = useContext(gameContext)
	if (!gameState) {
		throw new Error('Room is still loading')
	}
	return { gameState, dispatch }
}
