import { v4 as uuidv4 } from 'uuid'
import { PARTYKIT_HOST, PARTYKIT_SOCKET_PROTOCOL, PROTOCOL } from '../../env'
import { captionConfig } from '../config'
import type { CaptionEngine } from '../types'
import { concat, resample, toPcm16 } from './audio'
import { isMicrophoneSupported, type Microphone, openMicrophone } from './microphone'

const SCRIBE_SAMPLE_RATE = 16_000
const FRAME_MS = 100
// after session.close Scribe flushes remaining transcripts, then closes; don't wait forever
const CLOSE_TIMEOUT_MS = 5_000

type ScribeEvent =
	| { type: 'transcription.delta'; item_id: string; delta: string }
	| { type: 'transcription.completed'; item_id: string; transcript: string }
	| { type: 'error'; error: { code: string; message: string; fatal: boolean } }
	| { type: 'session.closed'; reason: string }
	| { type: string }

function relayUrl(roomId: string, playerId: string): string {
	const scheme = PARTYKIT_SOCKET_PROTOCOL ?? (PROTOCOL === 'https' ? 'wss' : 'ws')
	const query = new URLSearchParams({ playerId })
	return `${scheme}://${PARTYKIT_HOST}/scribe/${encodeURIComponent(roomId)}?${query}`
}

/** Zoom Scribe Live: audio streams to Zoom via the party Worker, which holds the API key. */
export const zoomScribeEngine: CaptionEngine = {
	id: 'zoom-scribe',
	name: 'Zoom Scribe',

	isSupported: () => isMicrophoneSupported() && typeof WebSocket !== 'undefined',

	async start({ onCaption, onError, onEnd }, { roomId, playerId }) {
		// opened first, while the tap's user activation is still valid
		const microphoneRequest = openMicrophone()
		const socket = new WebSocket(relayUrl(roomId, playerId))
		socket.binaryType = 'arraybuffer'
		const opened = new Promise<void>((resolve, reject) => {
			socket.addEventListener('open', () => resolve(), { once: true })
			socket.addEventListener(
				'close',
				() => reject(new Error("Couldn't connect to Zoom Scribe. Is the party server running?")),
				{ once: true }
			)
		})

		let microphone: Microphone
		try {
			;[microphone] = await Promise.all([microphoneRequest, opened])
		} catch (err) {
			microphoneRequest.then((m) => m.stop()).catch(() => {})
			socket.close()
			throw err
		}

		const { language, model } = captionConfig.zoomScribe
		socket.send(
			JSON.stringify({
				type: 'session.update',
				config: { language, interim_results: true, ...(model ? { model } : {}) },
				audio: { format: 'pcm16' },
			})
		)

		// Scribe item ids are only unique per session, but captions share a room
		const sessionTag = uuidv4()
		const captionId = (itemId: string) => `${sessionTag}-${itemId}`
		const pending = new Map<string, string>()
		let stopping = false
		let ended = false
		let errorReported = false
		let closeTimer: ReturnType<typeof setTimeout> | undefined

		const reportError = (message: string) => {
			errorReported = true
			onError(message)
		}

		const frameSamples = (microphone.sampleRate * FRAME_MS) / 1000
		let buffered: Float32Array[] = []
		let bufferedSamples = 0

		const sendBuffered = () => {
			if (!bufferedSamples || socket.readyState !== WebSocket.OPEN) return
			const audio = resample(concat(buffered), microphone.sampleRate, SCRIBE_SAMPLE_RATE)
			buffered = []
			bufferedSamples = 0
			socket.send(toPcm16(audio).buffer)
		}

		microphone.onChunk = (chunk) => {
			buffered.push(chunk)
			bufferedSamples += chunk.length
			if (bufferedSamples >= frameSamples) sendBuffered()
		}

		socket.addEventListener('message', (event) => {
			if (typeof event.data !== 'string') return
			let message: ScribeEvent
			try {
				message = JSON.parse(event.data)
			} catch {
				return
			}

			if (message.type === 'transcription.delta' && 'delta' in message) {
				const text = message.delta.trim()
				if (!text) return
				pending.set(message.item_id, text)
				onCaption({ id: captionId(message.item_id), text, final: false })
			} else if (message.type === 'transcription.completed' && 'transcript' in message) {
				const text = message.transcript.trim() || pending.get(message.item_id)
				pending.delete(message.item_id)
				if (text) onCaption({ id: captionId(message.item_id), text, final: true })
			} else if (message.type === 'error' && 'error' in message && message.error.fatal) {
				reportError(`Zoom Scribe: ${message.error.message}`)
			} else if (message.type === 'session.closed' && 'reason' in message && !stopping) {
				if (!errorReported) reportError(`Zoom Scribe ended the session (${message.reason}).`)
			}
		})

		socket.addEventListener('close', () => {
			if (ended) return
			ended = true
			clearTimeout(closeTimer)
			microphone.stop()
			if (!stopping && !errorReported) onError('Lost the connection to Zoom Scribe.')
			pending.forEach((text, itemId) => onCaption({ id: captionId(itemId), text, final: true }))
			pending.clear()
			onEnd()
		})

		const stop = () => {
			if (stopping || ended) return
			stopping = true
			microphone.onChunk = null
			sendBuffered()
			microphone.stop()
			if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'session.close' }))
			closeTimer = setTimeout(() => socket.close(), CLOSE_TIMEOUT_MS)
		}

		microphone.onEnded = () => {
			reportError('The microphone was disconnected.')
			stop()
		}

		return {
			status: 'via Zoom Scribe',
			debugInfo: `${language}, model: ${model ?? 'auto'}`,
			stop,
		}
	},
}
