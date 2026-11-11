import { captionConfig } from './config'
import { localModelEngine } from './engines/localModel'
import { webSpeechEngine } from './engines/webSpeech'
import { zoomScribeEngine } from './engines/zoomScribe'
import type { CaptionEngine } from './types'

export { captionConfig, type CaptionEngineId } from './config'
export type {
	CaptionCallbacks,
	CaptionContext,
	CaptionEngine,
	CaptionSession,
	SpokenCaption,
} from './types'
export { useCaptionEngine } from './useCaptionEngine'

/** Register new engines here; the first is the fallback. */
export const captionEngines: readonly CaptionEngine[] = [
	webSpeechEngine,
	localModelEngine,
	zoomScribeEngine,
]

export function getCaptionEngine(id: string | null | undefined): CaptionEngine {
	return captionEngines.find((engine) => engine.id === id) ?? captionEngines[0]
}

/** The engine chosen in config.ts. */
export const activeCaptionEngine = getCaptionEngine(captionConfig.engine)
