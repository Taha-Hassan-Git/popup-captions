import classNames from 'classnames'
import { LoaderCircle, Mic, MicOff } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Caption } from '../../../game-logic/types'
import { activeCaptionEngine, SpokenCaption, useCaptionEngine } from '../captioning'
import { useActiveGame, useLocalPlayer } from '../hooks/useGameState'
import { useSpeakers } from './Speakers'

function groupBySpeaker(captions: Caption[]): Caption[][] {
	const groups: Caption[][] = []
	for (const caption of captions) {
		const last = groups[groups.length - 1]
		if (last?.[0].playerId === caption.playerId) last.push(caption)
		else groups.push([caption])
	}
	return groups
}

export function CaptionFeed({ fontSize }: { fontSize: number }) {
	const { gameState } = useActiveGame()
	const speakers = useSpeakers()
	const scrollRef = useRef<HTMLDivElement>(null)
	const { captions, players } = gameState
	const groups = useMemo(() => groupBySpeaker(captions), [captions])

	useEffect(() => {
		const el = scrollRef.current
		el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
	}, [captions, fontSize])

	return (
		<div
			ref={scrollRef}
			data-testid="caption-feed"
			className="h-full overflow-y-auto overscroll-contain flex flex-col px-4 py-4 [mask-image:linear-gradient(to_bottom,transparent,black_2rem)]"
		>
			<div className="mt-auto flex flex-col gap-5" style={{ fontSize }}>
				{groups.map((group) => {
					const playerId = group[0].playerId
					const speaker = speakers.find((s) => s.id === playerId)
					const name = players.find((p) => p.id === playerId)?.name ?? 'Unknown'
					return (
						<article key={group[0].id} className="motion-safe:animate-fade-up">
							<h3 className="mb-1.5 flex items-center gap-2 px-1 text-xs font-semibold text-gray-500">
								<span
									aria-hidden
									className="size-2 rounded-full bg-gray-400"
									style={speaker && { backgroundColor: speaker.color }}
								/>
								{name}
							</h3>
							<p className="rounded-2xl rounded-tl-md bg-white px-4 py-3 font-medium leading-snug text-gray-900 shadow-sm ring-1 ring-gray-900/5">
								{group.map((caption, i) => (
									<span key={caption.id} className={caption.final ? undefined : 'text-gray-400'}>
										{i > 0 && ' '}
										{caption.text}
									</span>
								))}
							</p>
						</article>
					)
				})}
			</div>
		</div>
	)
}

function Ripples({ className }: { className: string }) {
	return (
		<>
			<span
				aria-hidden
				className={classNames(
					'absolute inset-0 rounded-full motion-safe:animate-ripple',
					className
				)}
			/>
			<span
				aria-hidden
				className={classNames(
					'absolute inset-0 rounded-full motion-safe:animate-ripple [animation-delay:1.2s]',
					className
				)}
			/>
		</>
	)
}

export function ListeningState() {
	return (
		<div className="h-full flex flex-col items-center justify-center gap-8 px-6 text-center">
			<div className="relative grid place-items-center size-28">
				<Ripples className="bg-gray-300/50" />
				<span className="relative grid place-items-center size-28 rounded-full bg-white text-gray-900 shadow-xl shadow-gray-900/10 ring-1 ring-gray-900/5">
					<Mic aria-hidden className="size-11" />
				</span>
			</div>
			<div>
				<p className="text-xl font-semibold tracking-tight text-gray-900">Listening…</p>
				<p className="mt-1 text-sm text-gray-500">Captions will appear here when someone speaks.</p>
			</div>
		</div>
	)
}

/** Speech-to-caption state for this phone; only does anything when the local player is a mic. */
export function useMicCaptioning() {
	const { gameState, dispatch } = useActiveGame()
	const localPlayer = useLocalPlayer()
	const playerId = localPlayer?.id
	const engine = activeCaptionEngine
	const roomId = gameState.roomId
	const context = useMemo(() => ({ roomId, playerId: playerId ?? '' }), [roomId, playerId])

	const sendCaption = useCallback(
		(caption: SpokenCaption) => {
			if (!playerId) return
			dispatch({ type: 'caption', payload: { ...caption, playerId } })
		},
		[dispatch, playerId]
	)
	const { supported, listening, starting, error, progress, status, debugInfo, start, stop } =
		useCaptionEngine(engine, context, sendCaption)
	const isMic = localPlayer?.role === 'mic'

	return {
		isMic,
		supported,
		listening,
		starting,
		error,
		progress,
		devInfo:
			process.env.NODE_ENV === 'development' && status
				? [`${engine.name} ${status}`, debugInfo].filter(Boolean).join(' · ')
				: null,
		unsupportedMessage:
			isMic && !supported ? `${engine.name} isn't supported in this browser.` : null,
		start,
		stop,
	}
}

export function MicButton({
	supported,
	listening,
	starting,
	error,
	progress,
	devInfo,
	unsupportedMessage,
	start,
	stop,
}: Pick<
	ReturnType<typeof useMicCaptioning>,
	| 'supported'
	| 'listening'
	| 'starting'
	| 'error'
	| 'progress'
	| 'devInfo'
	| 'unsupportedMessage'
	| 'start'
	| 'stop'
>) {
	let title = 'Tap to start captioning'
	let detail = 'Everyone in the room will see what you say.'
	if (starting) {
		title = 'Starting…'
		detail = progress ?? 'Allow microphone access if your browser asks.'
	} else if (listening) {
		title = 'You’re live'
		detail = 'Tap the mic to stop.'
	}
	const problem = unsupportedMessage ?? error

	return (
		<div className="h-full flex flex-col items-center justify-center gap-6 px-6 text-center">
			<div className="relative grid place-items-center size-32">
				{listening && <Ripples className="bg-red-500/25" />}
				<button
					type="button"
					aria-label={listening ? 'Stop captioning' : 'Start captioning'}
					disabled={!supported || starting}
					onClick={listening ? stop : start}
					className={classNames(
						'relative grid place-items-center size-32 rounded-full transition duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-4 focus-visible:ring-offset-gray-50',
						listening
							? 'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-xl shadow-red-600/30 focus-visible:ring-red-300'
							: 'bg-white text-gray-900 shadow-xl shadow-gray-900/10 ring-1 ring-gray-900/5 hover:shadow-2xl hover:shadow-gray-900/15 focus-visible:ring-gray-300'
					)}
				>
					{starting ? (
						<LoaderCircle aria-hidden className="size-11 animate-spin text-gray-400" />
					) : listening ? (
						<Mic aria-hidden className="size-12" />
					) : (
						<MicOff aria-hidden className="size-12" />
					)}
				</button>
			</div>
			<div aria-live="polite" className="max-w-xs">
				<p className="flex items-center justify-center gap-2 text-xl font-semibold tracking-tight text-gray-900">
					{listening && (
						<span
							aria-hidden
							className="size-2 rounded-full bg-red-500 motion-safe:animate-pulse"
						/>
					)}
					{title}
				</p>
				<p className={classNames('mt-1 text-sm', problem ? 'text-red-600' : 'text-gray-500')}>
					{problem ?? detail}
				</p>
				{devInfo && (
					<p className="mt-3 rounded-md bg-amber-100 px-2 py-1 font-mono text-xs text-amber-900">
						{devInfo}
					</p>
				)}
			</div>
		</div>
	)
}
