import usePartySocket from 'partysocket/react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Action, GameInfo, GameState, Player } from '../../../game-logic/types'
import { PARTYKIT_HOST } from '../env'

interface GameContextValue {
	gameState: GameState
	dispatch: (action: Action) => void
	localPlayer: Player | null
}

const gameContext = createContext<GameContextValue>({
	gameState: { state: 'loading' },
	dispatch: () => {},
	localPlayer: null,
})

export function GameProvider({
	children,
	playerId,
	roomId,
}: {
	children: React.ReactNode
	playerId: string
	roomId: string
}) {
	const [gameState, setGameState] = useState<GameState>({ state: 'loading' })

	const socket = usePartySocket({
		host: PARTYKIT_HOST,
		party: 'game-server',
		room: roomId,
		id: playerId,
		onMessage(event) {
			const message = JSON.parse(event.data) as GameInfo
			if (message) setGameState(message)
		},
	})

	const localPlayer = useMemo(() => {
		if (gameState.state === 'loading') return null
		return gameState.players.find((player) => player.id === playerId) ?? null
	}, [gameState, playerId])

	const dispatch = useCallback(
		(action: Action) => {
			socket.send(JSON.stringify(action))
		},
		[socket]
	)

	return (
		<gameContext.Provider value={{ gameState, dispatch, localPlayer }}>
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

/** Asserts the game has loaded — use inside lobby/play/finished screens. */
export function useActiveGame(): { gameState: GameInfo; dispatch: (action: Action) => void } {
	const { gameState, dispatch } = useContext(gameContext)
	if (gameState.state === 'loading') {
		throw new Error('Game is still loading')
	}
	return { gameState, dispatch }
}
