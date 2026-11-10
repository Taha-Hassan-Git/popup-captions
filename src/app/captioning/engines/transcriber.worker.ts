import { pipeline, type ProgressInfo } from '@huggingface/transformers'
import type { LocalModelConfig } from '../config'

export type ModelDevice = 'webgpu' | 'wasm'

export type TranscriberRequest =
	| {
			id: number
			type: 'load'
			model: string
			device: LocalModelConfig['device']
			dtype: LocalModelConfig['dtype']
	  }
	| { id: number; type: 'transcribe'; audio: Float32Array }

export type TranscriberResponse =
	| { type: 'progress'; message: string }
	| { id: number; type: 'loaded'; device: ModelDevice }
	| { id: number; type: 'transcribed'; text: string }
	| { id: number; type: 'error'; message: string }

type Transcriber = (audio: Float32Array) => Promise<{ text: string } | { text: string }[]>
type LoadRequest = Extract<TranscriberRequest, { type: 'load' }>

const SAMPLE_RATE = 16_000

let loading: Promise<{ transcriber: Transcriber; device: ModelDevice }> | null = null
let queue: Promise<unknown> = Promise.resolve()

function post(response: TranscriberResponse) {
	self.postMessage(response)
}

async function hasWebGPU() {
	const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
	try {
		return !!(await gpu?.requestAdapter())
	} catch {
		return false
	}
}

async function createTranscriber(request: LoadRequest, device: ModelDevice): Promise<Transcriber> {
	const transcriber = await pipeline('automatic-speech-recognition', request.model, {
		device,
		dtype: request.dtype[device],
		progress_callback: (info: ProgressInfo) => {
			if (info.status === 'progress_total') {
				post({ type: 'progress', message: `Downloading speech model… ${Math.round(info.progress)}%` })
			}
		},
	})
	post({ type: 'progress', message: 'Preparing speech model…' })
	// the first run compiles shaders/kernels, so do it before real speech arrives
	await transcriber(new Float32Array(SAMPLE_RATE))
	return transcriber as unknown as Transcriber
}

async function load(request: LoadRequest) {
	const preferred = request.device
	const device = preferred === 'auto' ? ((await hasWebGPU()) ? 'webgpu' : 'wasm') : preferred
	try {
		return { transcriber: await createTranscriber(request, device), device }
	} catch (err) {
		if (device !== 'webgpu' || preferred === 'webgpu') throw err
		return { transcriber: await createTranscriber(request, 'wasm'), device: 'wasm' as const }
	}
}

async function handle(request: TranscriberRequest): Promise<TranscriberResponse> {
	if (request.type === 'load') {
		loading ??= load(request).catch((err) => {
			loading = null
			throw err
		})
		const { device } = await loading
		return { id: request.id, type: 'loaded', device }
	}

	if (!loading) throw new Error('The speech model is not loaded.')
	const { transcriber } = await loading
	const output = await transcriber(request.audio)
	const text = Array.isArray(output) ? output.map((o) => o.text).join(' ') : output.text
	return { id: request.id, type: 'transcribed', text }
}

self.addEventListener('message', (event: MessageEvent<TranscriberRequest>) => {
	const request = event.data
	// one request at a time: the model can't run two inferences at once
	queue = queue.then(async () => {
		try {
			post(await handle(request))
		} catch (err) {
			post({
				id: request.id,
				type: 'error',
				message: err instanceof Error ? err.message : String(err),
			})
		}
	})
})
