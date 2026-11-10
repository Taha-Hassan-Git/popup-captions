import { v4 as uuidv4 } from 'uuid'
import type { CaptionEngine } from '../types'

// The DOM lib doesn't ship SpeechRecognition types, so declare what we use.
interface SpeechRecognitionEventLike extends Event {
	readonly resultIndex: number
	readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEventLike extends Event {
	readonly error: string
}

interface SpeechRecognitionLike extends EventTarget {
	continuous: boolean
	interimResults: boolean
	lang: string
	processLocally?: boolean
	start(): void
	stop(): void
	onresult: ((event: SpeechRecognitionEventLike) => void) | null
	onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
	onend: (() => void) | null
}

interface SpeechRecognitionConstructor {
	new (): SpeechRecognitionLike
	available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>
}

const errorMessages: Record<string, string> = {
	'not-allowed': 'Microphone access was blocked. Allow it for this site and try again.',
	'service-not-allowed': 'Speech recognition is not allowed in this browser.',
	'audio-capture': 'No microphone was found.',
	network: 'Speech recognition needs a network connection on this device.',
	'language-not-supported': 'Your language is not supported for speech recognition.',
}

const QUICK_END_MS = 1000
const MAX_QUICK_ENDS = 3
// Android Chrome reports each partial as a new result ("hello", "hello my", ...) rather than
// updating one, so a result that extends the previous one soon after is treated as an update.
const CONTINUATION_WINDOW_MS = 3000

function isContinuation(previous: string, next: string): boolean {
	const a = previous.trim().toLowerCase()
	const b = next.trim().toLowerCase()
	return a.length > 0 && (b.startsWith(a) || a.startsWith(b))
}

function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
	if (typeof window === 'undefined') return undefined
	const w = window as unknown as {
		SpeechRecognition?: SpeechRecognitionConstructor
		webkitSpeechRecognition?: SpeechRecognitionConstructor
	}
	return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

/** 'available' | 'downloadable' | 'downloading' | 'unavailable', or 'error' if the check failed. */
async function onDeviceAvailability(Recognition: SpeechRecognitionConstructor, lang: string) {
	try {
		return (await Recognition.available?.({ langs: [lang], processLocally: true })) ?? 'error'
	} catch {
		return 'error'
	}
}

/** The browser's built-in speech recognition: on-device where supported, otherwise the browser vendor's service. */
export const webSpeechEngine: CaptionEngine = {
	id: 'web-speech',
	name: 'Browser speech recognition',

	isSupported: () => !!getSpeechRecognition(),

	async start({ onCaption, onError, onEnd }) {
		const Recognition = getSpeechRecognition()
		if (!Recognition) throw new Error("This browser doesn't support speech recognition.")
		if (!window.isSecureContext) {
			throw new Error('Microphone access needs HTTPS (or localhost). Open this page over HTTPS.')
		}

		const lang = navigator.language || 'en-US'
		// Only await when the browser supports it; Safari needs start() to stay inside the tap.
		const availability = Recognition.available
			? await onDeviceAvailability(Recognition, lang)
			: undefined
		const local = availability === 'available'

		const recognition = new Recognition()
		recognition.continuous = true
		recognition.interimResults = true
		recognition.lang = lang
		if (local) recognition.processLocally = true

		let active = true
		let idsByIndex = new Map<number, string>()
		let last: { id: string; text: string; at: number } | null = null
		let sessionStartedAt = Date.now()
		let quickEndsInARow = 0
		const pending = new Map<string, string>()

		recognition.onresult = (event) => {
			quickEndsInARow = 0
			for (let i = event.resultIndex; i < event.results.length; i++) {
				const result = event.results[i]
				const text = result[0].transcript
				const now = Date.now()

				let id = idsByIndex.get(i)
				if (!id) {
					const continues =
						last && now - last.at < CONTINUATION_WINDOW_MS && isContinuation(last.text, text)
					id = continues && last ? last.id : uuidv4()
					idsByIndex.set(i, id)
				}
				last = { id, text, at: now }

				const caption = { id, text, final: result.isFinal }
				if (caption.final) pending.delete(caption.id)
				else pending.set(caption.id, caption.text)
				onCaption(caption)
			}
		}

		recognition.onerror = (event) => {
			if (event.error === 'no-speech' || event.error === 'aborted') return
			active = false
			onError(errorMessages[event.error] ?? `Speech recognition error: ${event.error}`)
		}

		recognition.onend = () => {
			// a session can end with phrases that never became final
			pending.forEach((text, id) => onCaption({ id, text, final: true }))
			pending.clear()

			// browsers end recognition after silence or a time limit, so keep it going
			quickEndsInARow = Date.now() - sessionStartedAt < QUICK_END_MS ? quickEndsInARow + 1 : 0
			if (active && quickEndsInARow >= MAX_QUICK_ENDS) {
				active = false
				onError('Speech recognition keeps stopping. Check microphone access and try again.')
			}
			if (active) {
				idsByIndex = new Map()
				last = null
				sessionStartedAt = Date.now()
				try {
					recognition.start()
					return
				} catch {
					onError('Speech recognition stopped unexpectedly.')
				}
			}
			onEnd()
		}

		recognition.start()

		return {
			status: local ? 'on this device' : "via the browser's speech service",
			debugInfo: `${lang}, ${
				availability
					? `on-device availability: "${availability}"`
					: "browser can't report on-device support"
			}`,
			stop() {
				active = false
				recognition.stop()
			},
		}
	},
}
