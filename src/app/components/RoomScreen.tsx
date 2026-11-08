import { AArrowDown, AArrowUp, CircleHelp, Eye, Mic, QrCode } from 'lucide-react'
import { ReactNode, useState } from 'react'
import QRCode from 'react-qr-code'
import { Role } from '../../../game-logic/types'
import { useActiveGame } from '../hooks/useGameState'
import { CaptionFeed, ListeningState, MicButton, useMicCaptioning } from './Captions'
import { HowToPlayContent } from './HowToPlayContent'
import { Modal } from './Modal'
import { SpeakerBar, useSpeakers } from './Speakers'

export const roleLabels: Record<Role, string> = { mic: 'Mic', audience: 'Audience' }

const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 48
const FONT_SIZE_STEP = 2
const DEFAULT_FONT_SIZE = 20

const iconButton =
	'grid size-10 shrink-0 place-items-center rounded-full text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400'

function getInviteUrl(roomId: string): string {
	const url = new URL('/', window.location.origin)
	const lanAddress = process.env.NEXT_PUBLIC_DEV_LAN_ADDRESS
	if (lanAddress) url.hostname = lanAddress
	url.searchParams.set('roomId', roomId)
	return url.toString()
}

export function RoleIcon({ role, className }: { role: Role; className?: string }) {
	const Icon = role === 'mic' ? Mic : Eye
	return <Icon aria-label={roleLabels[role]} className={className} />
}

export function RoomScreen() {
	const { gameState } = useActiveGame()
	const speakers = useSpeakers()
	const mic = useMicCaptioning()
	const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)

	const hasCaptions = gameState.captions.length > 0
	let content: ReactNode
	if (mic.isMic) {
		content = (
			<div className="h-full flex flex-col">
				<div className="flex-1 min-h-0">
					<MicButton {...mic} />
				</div>
				{hasCaptions && (
					<section
						aria-label="Live captions"
						className="flex-1 min-h-0 mx-4 flex flex-col overflow-hidden rounded-3xl bg-gray-100 ring-1 ring-inset ring-gray-900/5 motion-safe:animate-fade-up"
					>
						<h2 className="px-5 pt-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
							Live captions
						</h2>
						<div className="flex-1 min-h-0">
							<CaptionFeed fontSize={fontSize} />
						</div>
					</section>
				)}
			</div>
		)
	} else if (hasCaptions) {
		content = <CaptionFeed fontSize={fontSize} />
	} else if (speakers.length > 0) {
		content = <ListeningState />
	} else {
		content = <NoSpeakers />
	}

	return (
		<div className="h-full flex flex-col">
			<SpeakerBar />
			<div className="flex-1 min-h-0">{content}</div>
			<nav aria-label="Room controls" className="shrink-0 p-4">
				<div className="flex items-center gap-1 rounded-full bg-white p-1.5 shadow-lg shadow-gray-900/5 ring-1 ring-gray-900/5">
					<div
						role="group"
						aria-label="Text size"
						className="flex items-center rounded-full bg-gray-100"
					>
						<button
							type="button"
							aria-label="Decrease text size"
							disabled={fontSize <= MIN_FONT_SIZE}
							onClick={() => setFontSize((size) => size - FONT_SIZE_STEP)}
							className={iconButton}
						>
							<AArrowDown className="size-5" />
						</button>
						<output
							aria-label="Text size"
							className="w-8 text-center text-sm font-semibold tabular-nums text-gray-900"
						>
							{fontSize}
						</output>
						<button
							type="button"
							aria-label="Increase text size"
							disabled={fontSize >= MAX_FONT_SIZE}
							onClick={() => setFontSize((size) => size + FONT_SIZE_STEP)}
							className={iconButton}
						>
							<AArrowUp className="size-5" />
						</button>
					</div>
					<div className="flex-1" />
					<Modal
						title="How it works"
						trigger={
							<button type="button" aria-label="How it works" className={iconButton}>
								<CircleHelp className="size-5" />
							</button>
						}
					>
						<HowToPlayContent />
					</Modal>
					<Modal
						title="Invite others"
						trigger={
							<button
								type="button"
								aria-label="Invite others"
								className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-gray-900 pl-3.5 pr-4 text-sm font-semibold text-white transition-colors hover:bg-gray-800 active:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
							>
								<QrCode aria-hidden className="size-4" />
								Invite
							</button>
						}
					>
						<InviteContent />
					</Modal>
				</div>
			</nav>
		</div>
	)
}

function InviteQRCode({ size }: { size: number }) {
	const { gameState } = useActiveGame()
	return (
		<div className="rounded-3xl bg-white p-5 shadow-xl shadow-gray-900/5 ring-1 ring-gray-900/5">
			<QRCode size={size} value={getInviteUrl(gameState.roomId)} fgColor="#111827" />
		</div>
	)
}

function RoomCode({ testId }: { testId?: string }) {
	const { gameState } = useActiveGame()
	return (
		<div className="flex flex-col items-center gap-1">
			<span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
				Room code
			</span>
			<span
				data-testid={testId}
				className="font-mono text-2xl font-semibold tracking-[0.2em] text-gray-900"
			>
				{gameState.roomId}
			</span>
		</div>
	)
}

function NoSpeakers() {
	return (
		<div className="h-full overflow-y-auto flex flex-col items-center justify-center gap-7 px-6 py-8 text-center">
			<div>
				<h2 className="text-2xl font-semibold tracking-tight text-gray-900">
					Invite people to join
				</h2>
				<p className="mt-2 text-gray-500">
					Scan to join as a speaker, or follow along in the audience.
				</p>
			</div>
			<InviteQRCode size={184} />
			<RoomCode />
		</div>
	)
}

function InviteContent() {
	const { gameState } = useActiveGame()
	const host = new URL(getInviteUrl(gameState.roomId)).host

	return (
		<div className="flex flex-col items-center gap-6 text-center">
			<InviteQRCode size={184} />
			<RoomCode testId="room-id" />
			<p className="text-sm leading-relaxed text-gray-600">
				Scan the QR code with a phone camera, or go to{' '}
				<span className="font-semibold text-gray-900">{host}</span> and enter the room code. Choose{' '}
				<span className="font-semibold text-gray-900">Mic</span> to caption from that phone, or{' '}
				<span className="font-semibold text-gray-900">Audience</span> to read along.
			</p>
		</div>
	)
}
