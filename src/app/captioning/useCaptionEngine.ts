import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CaptionContext, CaptionEngine, CaptionSession, SpokenCaption } from './types'

/** Runs any CaptionEngine and exposes its state to React. */
export function useCaptionEngine(
	engine: CaptionEngine,
	context: CaptionContext,
	onCaption: (caption: SpokenCaption) => void
) {
	const supported = useMemo(() => engine.isSupported(), [engine])
	const [session, setSession] = useState<CaptionSession | null>(null)
	const [starting, setStarting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [progress, setProgress] = useState<string | null>(null)
	const sessionRef = useRef<CaptionSession | null>(null)
	const startingRef = useRef(false)
	const mountedRef = useRef(true)
	const onCaptionRef = useRef(onCaption)
	const contextRef = useRef(context)

	useEffect(() => {
		onCaptionRef.current = onCaption
		contextRef.current = context
	}, [onCaption, context])

	const start = useCallback(async () => {
		if (sessionRef.current || startingRef.current) return
		startingRef.current = true
		setStarting(true)
		setError(null)

		let ended = false
		try {
			const newSession = await engine.start(
				{
					onCaption: (caption) => onCaptionRef.current(caption),
					onError: setError,
					onProgress: setProgress,
					onEnd: () => {
						ended = true
						sessionRef.current = null
						setSession(null)
					},
				},
				contextRef.current
			)
			if (!mountedRef.current) {
				newSession.stop()
			} else if (!ended) {
				sessionRef.current = newSession
				setSession(newSession)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not start captioning.')
		} finally {
			startingRef.current = false
			setStarting(false)
			setProgress(null)
		}
	}, [engine])

	const stop = useCallback(() => {
		sessionRef.current?.stop()
	}, [])

	useEffect(() => {
		mountedRef.current = true
		return () => {
			mountedRef.current = false
			sessionRef.current?.stop()
		}
	}, [])

	return {
		supported,
		listening: session !== null,
		starting,
		status: session?.status ?? null,
		debugInfo: session?.debugInfo ?? null,
		error,
		progress,
		start,
		stop,
	}
}
