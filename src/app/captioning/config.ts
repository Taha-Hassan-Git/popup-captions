import type { DataType } from '@huggingface/transformers'

/**
 * Central switch for how phones turn speech into captions.
 * Change `engine` here, or set NEXT_PUBLIC_CAPTION_ENGINE in .env.local to override it per environment.
 */
export const captionEngineIds = ['web-speech', 'local-model'] as const
export type CaptionEngineId = (typeof captionEngineIds)[number]

const defaultEngine: CaptionEngineId = 'web-speech'

const envEngine = captionEngineIds.find((id) => id === process.env.NEXT_PUBLIC_CAPTION_ENGINE)

export const captionConfig = {
	engine: envEngine ?? defaultEngine,

	localModel: {
		/**
		 * A transformers.js speech-recognition model on Hugging Face. Moonshine tiny is ~28 MB at q8 and its
		 * cost scales with phrase length; Whisper (e.g. onnx-community/whisper-tiny.en) always processes 30s.
		 */
		model: 'onnx-community/moonshine-tiny-ONNX',
		/** 'auto' tries WebGPU first; 8-bit weights only run well on WebAssembly. */
		device: 'wasm' as 'auto' | 'webgpu' | 'wasm',
		/** Weight precision per backend; must exist in the model repo's onnx/ folder. */
		dtype: {
			webgpu: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
			wasm: 'q8',
		} satisfies Record<'webgpu' | 'wasm', DataType | Record<string, DataType>>,
		/** Microphone level (RMS, 0–1) above which audio counts as speech. */
		speechThreshold: 0.01,
		/** Speech shorter than this is treated as noise. */
		minSpeechMs: 250,
		/** Silence that ends a phrase. */
		endOfPhraseSilenceMs: 700,
		/** Long phrases are cut so captions keep flowing (Whisper can't take more than 30s). */
		maxPhraseMs: 15_000,
		/** How often to re-transcribe the phrase in progress to show interim captions. */
		interimIntervalMs: 1_000,
	},
}

export type LocalModelConfig = typeof captionConfig.localModel
