import { Mic, MicOff } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Caption } from '../../../game-logic/types'
import {
	captionEngines,
	getCaptionEngine,
	SpokenCaption,
	useCaptionEngine,
} from '../captioning'
import { useActiveGame, useLocalPlayer } from '../hooks/useGameState'
import { Button } from './Button'
import { RedMessage, YellowMessage } from './Message'
import { Panel } from './Panel'

export function CaptionFeed() {
	const { gameState } = useActiveGame()
	const bottomRef = useRef<HTMLDivElement>(null)
	const { captions, players } = gameState

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
	}, [captions])

	const speakerName = (caption: Caption) =>
		players.find((player) => player.id === caption.playerId)?.name ?? 'Unknown'

	return (
		<Panel className="!p-4">
			<div data-testid="caption-feed" className="h-[320px] overflow-y-auto flex flex-col gap-3">
				{captions.length === 0 ? (
					<p className="m-auto text-gray-400">Captions will appear here</p>
				) : (
					captions.map((caption, i) => (
						<div key={caption.id}>
							{captions[i - 1]?.playerId !== caption.playerId && (
								<p className="text-xs font-medium text-gray-500">{speakerName(caption)}</p>
							)}
							<p
								className={
									caption.final ? 'text-xl text-gray-900' : 'text-xl text-gray-400 italic'
								}
							>
								{caption.text}
							</p>
						</div>
					))
				)}
				<div ref={bottomRef} />
			</div>
		</Panel>
	)
}

export function MicControls() {
	const { dispatch } = useActiveGame()
	const localPlayer = useLocalPlayer()
	const playerId = localPlayer?.id
	const [engineId, setEngineId] = useState(() => captionEngines[0].id)
	const engine = getCaptionEngine(engineId)

	const sendCaption = useCallback(
		(caption: SpokenCaption) => {
			if (!playerId) return
			dispatch({ type: 'caption', payload: { ...caption, playerId } })
		},
		[dispatch, playerId]
	)
	const { supported, listening, starting, status, error, start, stop } = useCaptionEngine(
		engine,
		sendCaption
	)

	if (localPlayer?.role !== 'mic') return null

	return (
		<Panel variant="column" className="!p-4">
			{captionEngines.length > 1 && (
				<label className="w-full flex flex-col gap-1 text-sm text-gray-600">
					Captioning engine
					<select
						value={engine.id}
						disabled={listening || starting}
						onChange={(e) => setEngineId(e.target.value)}
						className="p-2 border border-gray-200 rounded-md bg-white text-base text-gray-900"
					>
						{captionEngines.map((option) => (
							<option key={option.id} value={option.id}>
								{option.name}
							</option>
						))}
					</select>
				</label>
			)}
			{supported ? (
				<Button
					variant={listening ? 'secondary' : 'primary'}
					className="w-full flex items-center justify-center gap-2"
					disabled={starting}
					onClick={listening ? stop : start}
				>
					{listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
					{listening ? 'Stop captioning' : 'Start captioning'}
				</Button>
			) : (
				<YellowMessage message={`${engine.name} isn't supported in this browser.`} />
			)}
			{listening && (
				<p className="text-sm text-gray-500 flex items-center gap-2">
					<span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
					Listening ({status})
				</p>
			)}
			{error && <RedMessage message={error} />}
		</Panel>
	)
}
