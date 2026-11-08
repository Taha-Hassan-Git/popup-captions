import classNames from 'classnames'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Caption, Player } from '../../../game-logic/types'
import { useActiveGame, useLocalPlayer } from '../hooks/useGameState'

const TALKING_TIMEOUT_MS = 1500

// Hues 30° apart, ordered so consecutive speakers get very different colours.
export const avatarColors = [
	'hsl(0, 100%, 75%)',
	'hsl(120, 100%, 75%)',
	'hsl(240, 100%, 75%)',
	'hsl(30, 100%, 75%)',
	'hsl(150, 100%, 75%)',
	'hsl(270, 100%, 75%)',
	'hsl(60, 100%, 75%)',
	'hsl(180, 100%, 75%)',
	'hsl(300, 100%, 75%)',
	'hsl(90, 100%, 75%)',
	'hsl(210, 100%, 75%)',
	'hsl(330, 100%, 75%)',
]

export type Speaker = Player & { color: string }

/** Players using their phone as a mic, in join order, each with a stable colour. */
export function useSpeakers(): Speaker[] {
	const { gameState } = useActiveGame()
	const { players } = gameState
	return useMemo(
		() =>
			players
				.filter((player) => player.role === 'mic')
				.map((player, i) => ({
					...player,
					color: avatarColors[i % avatarColors.length],
				})),
		[players]
	)
}

/** Ids of players whose captions changed recently; captions carry no timestamps, so we watch for edits. */
function useTalkingPlayerIds(captions: Caption[]): ReadonlySet<string> {
	const previous = useRef(captions)
	const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
	const [talking, setTalking] = useState<ReadonlySet<string>>(() => new Set())

	useEffect(() => {
		const textById = new Map(previous.current.map((c) => [c.id, c.text]))
		previous.current = captions
		const changed = new Set(
			captions.filter((c) => textById.get(c.id) !== c.text).map((c) => c.playerId)
		)
		if (changed.size === 0) return

		setTalking((current) => new Set([...current, ...changed]))
		for (const playerId of changed) {
			clearTimeout(timers.current.get(playerId))
			timers.current.set(
				playerId,
				setTimeout(() => {
					timers.current.delete(playerId)
					setTalking((current) => {
						const next = new Set(current)
						next.delete(playerId)
						return next
					})
				}, TALKING_TIMEOUT_MS)
			)
		}
	}, [captions])

	useEffect(() => {
		const pending = timers.current
		return () => pending.forEach(clearTimeout)
	}, [])

	return talking
}

export function SpeakerBar() {
	const { gameState } = useActiveGame()
	const speakers = useSpeakers()
	const localPlayer = useLocalPlayer()
	const talking = useTalkingPlayerIds(gameState.captions)

	return (
		<div className="shrink-0 border-b border-gray-200/80 bg-white/80 backdrop-blur">
			{speakers.length > 0 ? (
				<div className="overflow-x-auto">
					<ul
						data-testid="speaker-bar"
						aria-label="Speakers"
						className="mx-auto flex w-max items-start gap-3 px-4 pt-4 pb-3"
					>
						{speakers.map((speaker) => (
							<SpeakerAvatar
								key={speaker.id}
								speaker={speaker}
								talking={talking.has(speaker.id)}
								isYou={speaker.id === localPlayer?.id}
							/>
						))}
					</ul>
				</div>
			) : (
				<p className="px-4 py-4 text-center text-sm font-medium text-gray-500">
					Waiting for speakers to join
				</p>
			)}
		</div>
	)
}

function SpeakerAvatar({
	speaker,
	talking,
	isYou,
}: {
	speaker: Speaker
	talking: boolean
	isYou: boolean
}) {
	const label = `${speaker.name}${isYou ? ' (you)' : ''}`
	const initial = [...speaker.name.trim()][0]?.toUpperCase() ?? '?'

	return (
		<li title={label} className="flex w-14 flex-col items-center gap-1.5">
			<span className="relative grid size-11 place-items-center">
				{/* kept mounted so the pulse fades out instead of popping off between phrases */}
				<span
					aria-hidden
					className={classNames(
						'absolute inset-0 transition-opacity duration-500',
						talking ? 'opacity-100' : 'opacity-0'
					)}
				>
					<span
						className="absolute inset-0 rounded-full scale-125 motion-safe:animate-pulse-ring"
						style={{ backgroundColor: `color-mix(in srgb, ${speaker.color} 60%, transparent)` }}
					/>
				</span>
				<span
					aria-hidden
					className="relative grid size-11 place-items-center rounded-full text-base font-semibold text-gray-900 ring-2 ring-white"
					style={{ backgroundColor: speaker.color }}
				>
					{initial}
				</span>
			</span>
			<span aria-hidden className="max-w-full truncate text-xs font-medium text-gray-600">
				{isYou ? 'You' : speaker.name}
			</span>
			<span className="sr-only">
				{label}
				{talking && ', speaking'}
			</span>
		</li>
	)
}
