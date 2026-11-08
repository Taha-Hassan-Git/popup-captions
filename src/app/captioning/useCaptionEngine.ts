import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CaptionEngine, CaptionSession, SpokenCaption } from './types'

/** Runs any CaptionEngine and exposes its state to React. */
export function useCaptionEngine(
	engine: CaptionEngine,
	onCaption: (caption: SpokenCaption) => void
) {
	const supported = useMemo(() => engine.isSupported(), [engine])
	const [session, setSession] = useState<CaptionSession | null>(null)
	const [starting, setStarting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const sessionRef = useRef<CaptionSession | null>(null)
	const startingRef = useRef(false)
	const mountedRef = useRef(true)
	const onCaptionRef = useRef(onCaption)

	useEffect(() => {
		onCaptionRef.current = onCaption
	}, [onCaption])

	const start = useCallback(async () => {
		if (sessionRef.current || startingRef.current) return
		startingRef.current = true
		setStarting(true)
		setError(null)

		let ended = false
		try {
			const newSession = await engine.start({
				onCaption: (caption) => onCaptionRef.current(caption),
				onError: setError,
				onEnd: () => {
					ended = true
					sessionRef.current = null
					setSession(null)
				},
			})
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
		error,
		start,
		stop,
	}
}
