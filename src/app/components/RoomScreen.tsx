import { Eye, Mic } from 'lucide-react'
import QRCode from 'react-qr-code'
import { Player, Role } from '../../../game-logic/types'
import { useActiveGame, useLocalPlayer } from '../hooks/useGameState'
import { CaptionFeed, MicControls } from './Captions'
import { Panel } from './Panel'
import { Pill } from './Pill'

export const roleLabels: Record<Role, string> = { mic: 'Mic', audience: 'Audience' }

export function RoleIcon({ role, className }: { role: Role; className?: string }) {
	const Icon = role === 'mic' ? Mic : Eye
	return <Icon aria-label={roleLabels[role]} className={className} />
}

export function RoomScreen() {
	const { gameState } = useActiveGame()
	return (
		<>
			<CaptionFeed />
			<MicControls />
			<Panel>
				<div className="max-h-[280px] overflow-y-scroll w-full">
					<div className="flex items-center gap-2 mb-2">
						Room ID:
						<Pill>
							<p data-testid={'room-id'}>{gameState.roomId}</p>
						</Pill>
					</div>
					<div className="border-b mb-2"></div>
					<ul className="space-y-3 p-4">
						{gameState.players.map((player) => (
							<PlayerListItem key={player.id} player={player} />
						))}
					</ul>
				</div>
			</Panel>
			<Panel variant="column">
				<p>Invite others with this link:</p>
				<div className="bg-gray-100 p-4 border rounded-lg mt-4">
					<QRCode size={120} value={`${window.location.origin}/?roomId=${gameState.roomId}`} />
				</div>
			</Panel>
		</>
	)
}

function PlayerListItem({ player }: { player: Player }) {
	const localPlayer = useLocalPlayer()
	return (
		<li className="flex items-center gap-3">
			<RoleIcon role={player.role} className="w-5 h-5 text-gray-500" />
			<span className="font-bold flex-1">
				{player.name}
				{player.id === localPlayer?.id && <span className="font-normal text-gray-500"> (you)</span>}
			</span>
			<span className="text-gray-500 text-sm">{roleLabels[player.role]}</span>
		</li>
	)
}
