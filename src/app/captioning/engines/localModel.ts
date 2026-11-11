import { v4 as uuidv4 } from 'uuid'
import { captionConfig } from '../config'
import type { CaptionEngine } from '../types'
import { cleanTranscript, concat, resample, rms } from './audio'
import { isMicrophoneSupported, type Microphone, openMicrophone } from './microphone'
import type { ModelDevice, TranscriberRequest, TranscriberResponse } from './transcriber.worker'

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never

const MODEL_SAMPLE_RATE = 16_000

// The worker (and the model loaded in it) outlives sessions so turning the mic off and on is instant.
let worker: Worker | null = null
let loaded: Promise<ModelDevice> | null = null
let nextRequestId = 0
let progressListener: ((message: string) => void) | undefined
const pending = new Map<
	number,
	{ resolve(response: TranscriberResponse): void; reject(err: Error): void }
>()

function getWorker(): Worker {
	if (worker) return worker
	const w = new Worker(new URL('./transcriber.worker.ts', import.meta.url), { type: 'module' })
	w.onmessage = (event: MessageEvent<TranscriberResponse>) => {
		const response = event.data
		if (response.type === 'progress') {
			progressListener?.(response.message)
			return
		}
		const request = pending.get(response.id)
		pending.delete(response.id)
		if (response.type === 'error') request?.reject(new Error(response.message))
		else request?.resolve(response)
	}
	w.onerror = (event) => {
		event.preventDefault()
		const error = new Error(event.message || 'The speech model stopped unexpectedly.')
		pending.forEach((request) => request.reject(error))
		pending.clear()
		w.terminate()
		worker = null
		loaded = null
	}
	worker = w
	return w
}

function send(request: WithoutId<TranscriberRequest>, transfer: Transferable[] = []) {
	const id = nextRequestId++
	return new Promise<TranscriberResponse>((resolve, reject) => {
		pending.set(id, { resolve, reject })
		getWorker().postMessage({ ...request, id }, transfer)
	})
}

function loadModel(): Promise<ModelDevice> {
	const { model, device, dtype } = captionConfig.localModel
	loaded ??= send({ type: 'load', model, device, dtype }).then(
		(response) => (response.type === 'loaded' ? response.device : 'wasm'),
		(err) => {
			loaded = null
			throw new Error(`Could not load the speech model: ${err.message}`)
		}
	)
	return loaded
}

async function transcribe(audio: Float32Array): Promise<string> {
	const response = await send({ type: 'transcribe', audio }, [audio.buffer])
	return response.type === 'transcribed' ? cleanTranscript(response.text) : ''
}

/** A speech model running in the browser via transformers.js; audio never leaves the device. */
export const localModelEngine: CaptionEngine = {
	id: 'local-model',
	name: 'On-device speech model',

	isSupported: () => isMicrophoneSupported() && typeof Worker !== 'undefined',

	async start({ onCaption, onError, onEnd, onProgress }) {
		progressListener = onProgress
		// opened first, while the tap's user activation is still valid
		const microphoneRequest = openMicrophone()
		let microphone: Microphone
		let device: ModelDevice
		try {
			;[microphone, device] = await Promise.all([microphoneRequest, loadModel()])
		} catch (err) {
			microphoneRequest.then((m) => m.stop()).catch(() => {})
			throw err
		} finally {
			progressListener = undefined
		}

		const config = captionConfig.localModel
		const sampleRate = microphone.sampleRate
		const samplesFor = (ms: number) => (ms * sampleRate) / 1000

		let active = true
		let preRoll: Float32Array | null = null
		let phrase: {
			id: string
			chunks: Float32Array[]
			samples: number
			voicedSamples: number
			silentSamples: number
			samplesSinceInterim: number
			text: string
			final: boolean
		} | null = null
		let interimInFlight = false
		let finals: Promise<void> = Promise.resolve()

		const phraseAudio = (chunks: Float32Array[]) =>
			resample(concat(chunks), sampleRate, MODEL_SAMPLE_RATE)

		const reportError = (err: unknown) => {
			if (active) onError(err instanceof Error ? err.message : 'Could not transcribe speech.')
		}

		const sendInterim = () => {
			if (!phrase) return
			const current = phrase
			current.samplesSinceInterim = 0
			interimInFlight = true
			transcribe(phraseAudio(current.chunks))
				.then((text) => {
					if (current.final || !text) return
					current.text = text
					onCaption({ id: current.id, text, final: false })
				})
				.catch(reportError)
				.finally(() => {
					interimInFlight = false
				})
		}

		const endPhrase = () => {
			const ended = phrase
			phrase = null
			if (!ended) return
			ended.final = true
			// a click or bump with nothing shown yet isn't worth a (possibly hallucinated) caption
			if (!ended.text && ended.voicedSamples < samplesFor(config.minSpeechMs)) return
			const audio = phraseAudio(ended.chunks)
			finals = finals.then(async () => {
				try {
					const text = (await transcribe(audio)) || ended.text
					if (text) onCaption({ id: ended.id, text, final: true })
				} catch (err) {
					reportError(err)
					if (ended.text) onCaption({ id: ended.id, text: ended.text, final: true })
				}
			})
		}

		microphone.onChunk = (chunk) => {
			const voiced = rms(chunk) >= config.speechThreshold

			if (!phrase) {
				if (!voiced) {
					preRoll = chunk
					return
				}
				// keep the chunk before speech started so the first syllable isn't clipped
				const chunks = preRoll ? [preRoll] : []
				phrase = {
					id: uuidv4(),
					chunks,
					samples: preRoll?.length ?? 0,
					voicedSamples: 0,
					silentSamples: 0,
					samplesSinceInterim: 0,
					text: '',
					final: false,
				}
				preRoll = null
			}

			phrase.chunks.push(chunk)
			phrase.samples += chunk.length
			phrase.samplesSinceInterim += chunk.length
			if (voiced) {
				phrase.voicedSamples += chunk.length
				phrase.silentSamples = 0
			} else {
				phrase.silentSamples += chunk.length
			}

			if (
				phrase.silentSamples >= samplesFor(config.endOfPhraseSilenceMs) ||
				phrase.samples >= samplesFor(config.maxPhraseMs)
			) {
				endPhrase()
			} else if (
				!interimInFlight &&
				phrase.samplesSinceInterim >= samplesFor(config.interimIntervalMs)
			) {
				sendInterim()
			}
		}

		const stop = () => {
			if (!active) return
			endPhrase()
			active = false
			microphone.stop()
			void finals.then(onEnd)
		}

		microphone.onEnded = () => {
			onError('The microphone was disconnected.')
			stop()
		}

		return {
			status: device === 'webgpu' ? 'on this device (GPU)' : 'on this device',
			stop,
		}
	},
}
