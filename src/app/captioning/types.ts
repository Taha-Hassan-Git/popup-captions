import type { Caption } from '../../../game-logic/types'

/** A caption as produced by an engine; the room adds the speaker. Reuse an id to update a phrase. */
export type SpokenCaption = Omit<Caption, 'playerId'>

export interface CaptionCallbacks {
	onCaption(caption: SpokenCaption): void
	/** Report a problem to the user. Fatal errors should be followed by `onEnd`. */
	onError(message: string): void
	/** Called exactly once, when the session has fully stopped for any reason. */
	onEnd(): void
}

export interface CaptionSession {
	/** Short description shown while listening, e.g. "on this device". */
	readonly status: string
	/** Stop listening; the engine should flush any unfinished phrases as final, then call `onEnd`. */
	stop(): void
}

export interface CaptionEngine {
	readonly id: string
	readonly name: string
	isSupported(): boolean
	/**
	 * Called from a button tap. Anything needing user activation (mic access, speech APIs)
	 * should happen before the first `await`. Rejects if listening can't start.
	 */
	start(callbacks: CaptionCallbacks): Promise<CaptionSession>
}
