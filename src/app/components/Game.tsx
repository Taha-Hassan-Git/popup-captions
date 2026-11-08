'use client'
import { usePathname } from 'next/navigation'
import { GameProvider, useGameState } from '../hooks/useGameState'
import { usePlayerId } from '../hooks/usePlayerId'
import { LoadingScreen } from './LoadingScreen'
import { RoomScreen } from './RoomScreen'

const ROUTE = '/game/'
export default function GameContainer() {
	const path = usePathname()
	const roomId = path.slice(ROUTE.length)
	const playerId = usePlayerId()

	if (!playerId) {
		return <LoadingScreen />
	}

	return (
		<GameProvider playerId={playerId} roomId={roomId}>
			<Game />
		</GameProvider>
	)
}

function Game() {
	const gameState = useGameState()
	return gameState ? <RoomScreen /> : <LoadingScreen />
}
