'use client'
import { usePathname } from 'next/navigation'
import { GameProvider, useGameState, useLocalPlayer } from '../hooks/useGameState'
import { usePlayerId } from '../hooks/usePlayerId'
import { LoadingScreen } from './LoadingScreen'
import { Pill } from './Pill'
import { RoleIcon, roleLabels, RoomScreen } from './RoomScreen'

const ROUTE = '/game/'
export default function GameContainer() {
	const path = usePathname()
	const roomId = path.slice(ROUTE.length)
	const playerId = usePlayerId()

	if (!playerId) {
		return <LoadingScreen />
	}

	return (
		<div className="flex flex-col w-full items-center">
			<GameProvider playerId={playerId} roomId={roomId}>
				<InfoBar />
				<Game />
			</GameProvider>
		</div>
	)
}
function InfoBar() {
	const gameState = useGameState()
	const localPlayer = useLocalPlayer()
	if (!gameState) return null
	return (
		<div className="bg-gray-100 border border-gray-100 w-screen">
			<div className="max-w-[640px] mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-10 text-sm">
					<div className="flex items-center space-x-4">
						<span className="flex items-center">
							<div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
							<span className="text-gray-600">Room: </span>
							<Pill>{gameState.roomId}</Pill>
						</span>
					</div>
					{localPlayer && (
						<Pill className="gap-1">
							<RoleIcon role={localPlayer.role} className="w-4 h-4 text-gray-600" />
							<span data-testid="info-bar-role" className="font-medium text-gray-900">
								{roleLabels[localPlayer.role]}
							</span>
						</Pill>
					)}
				</div>
			</div>
		</div>
	)
}
function Game() {
	const gameState = useGameState()

	return (
		<div className="flex flex-col gap-5 items-center w-full pt-5">
			{gameState ? <RoomScreen /> : <LoadingScreen />}
		</div>
	)
}
