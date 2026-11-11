// Inlined so it doesn't need its own bundled file; batches 128-sample render quanta into ~40ms chunks.
const CAPTURE_PROCESSOR = `
class MicCapture extends AudioWorkletProcessor {
	constructor() {
		super()
		this.buffer = new Float32Array(2048)
		this.length = 0
	}
	process(inputs) {
		const channel = inputs[0] && inputs[0][0]
		if (!channel) return true
		let offset = 0
		while (offset < channel.length) {
			const count = Math.min(channel.length - offset, this.buffer.length - this.length)
			this.buffer.set(channel.subarray(offset, offset + count), this.length)
			this.length += count
			offset += count
			if (this.length === this.buffer.length) {
				const chunk = this.buffer.slice()
				this.port.postMessage(chunk, [chunk.buffer])
				this.length = 0
			}
		}
		return true
	}
}
registerProcessor('mic-capture', MicCapture)
`

function microphoneErrorMessage(err: unknown): string {
	const name = err instanceof DOMException ? err.name : ''
	if (name === 'NotAllowedError' || name === 'SecurityError') {
		return 'Microphone access was blocked. Allow it for this site and try again.'
	}
	if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone was found.'
	if (name === 'NotReadableError') return 'The microphone is being used by another app.'
	return 'Could not start the microphone.'
}

export interface Microphone {
	readonly sampleRate: number
	/** Receives ~40ms chunks of mono samples at `sampleRate`; chunks arriving before it's set are dropped. */
	onChunk: ((chunk: Float32Array) => void) | null
	/** Called if the mic goes away on its own, e.g. it's unplugged or permission is revoked. */
	onEnded: (() => void) | null
	stop(): void
}

export function isMicrophoneSupported(): boolean {
	return (
		typeof window !== 'undefined' &&
		typeof AudioWorkletNode !== 'undefined' &&
		!!navigator.mediaDevices?.getUserMedia
	)
}

/** Call synchronously from a tap: the AudioContext and mic request need its user activation. */
export async function openMicrophone(): Promise<Microphone> {
	if (!window.isSecureContext) {
		throw new Error('Microphone access needs HTTPS (or localhost). Open this page over HTTPS.')
	}

	const audioContext = new AudioContext()
	void audioContext.resume()
	const streamRequest = navigator.mediaDevices.getUserMedia({
		audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
	})

	const workletUrl = URL.createObjectURL(
		new Blob([CAPTURE_PROCESSOR], { type: 'application/javascript' })
	)
	let stream: MediaStream
	try {
		;[stream] = await Promise.all([
			streamRequest.catch((err) => {
				throw new Error(microphoneErrorMessage(err))
			}),
			audioContext.audioWorklet.addModule(workletUrl),
		])
	} catch (err) {
		streamRequest.then((s) => s.getTracks().forEach((track) => track.stop())).catch(() => {})
		void audioContext.close()
		throw err
	} finally {
		URL.revokeObjectURL(workletUrl)
	}

	const source = audioContext.createMediaStreamSource(stream)
	const capture = new AudioWorkletNode(audioContext, 'mic-capture')
	source.connect(capture)
	// some browsers only pull audio through nodes that reach the destination; this outputs silence
	capture.connect(audioContext.destination)

	let stopped = false
	const microphone: Microphone = {
		sampleRate: audioContext.sampleRate,
		onChunk: null,
		onEnded: null,
		stop() {
			if (stopped) return
			stopped = true
			capture.port.onmessage = null
			source.disconnect()
			capture.disconnect()
			stream.getTracks().forEach((track) => track.stop())
			void audioContext.close()
		},
	}
	capture.port.onmessage = (event: MessageEvent<Float32Array>) => microphone.onChunk?.(event.data)
	stream.getAudioTracks()[0]?.addEventListener('ended', () => {
		if (!stopped) microphone.onEnded?.()
	})
	return microphone
}
