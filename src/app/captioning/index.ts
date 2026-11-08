import { webSpeechEngine } from './engines/webSpeech'
import type { CaptionEngine } from './types'

export type { CaptionCallbacks, CaptionEngine, CaptionSession, SpokenCaption } from './types'
export { useCaptionEngine } from './useCaptionEngine'

/** Register new engines here; the first is the default. */
export const captionEngines: readonly CaptionEngine[] = [webSpeechEngine]

export function getCaptionEngine(id: string | null | undefined): CaptionEngine {
	return captionEngines.find((engine) => engine.id === id) ?? captionEngines[0]
}
