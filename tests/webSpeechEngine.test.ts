import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { webSpeechEngine } from '../src/app/captioning/engines/webSpeech'
import type { SpokenCaption } from '../src/app/captioning/types'

class FakeRecognition {
	static instance: FakeRecognition
	continuous = false
	interimResults = false
	lang = ''
	onresult: ((event: unknown) => void) | null = null
	onerror: ((event: unknown) => void) | null = null
	onend: (() => void) | null = null
	start() {
		FakeRecognition.instance = this
	}
	stop() {
		this.onend?.()
	}
}

/** Fires a result event; `results` is the browser's full cumulative list of [transcript, isFinal]. */
function emit(resultIndex: number, results: [string, boolean][]) {
	FakeRecognition.instance.onresult?.({
		resultIndex,
		results: results.map(([transcript, isFinal]) => Object.assign([{ transcript }], { isFinal })),
	})
}

let captions: SpokenCaption[]
let now: number

/** The latest version of each caption, in the order they first appeared. */
function shownCaptions() {
	const latest = new Map<string, SpokenCaption>()
	for (const caption of captions) latest.set(caption.id, caption)
	return [...latest.values()]
}

beforeEach(async () => {
	captions = []
	now = 1_000_000
	jest.spyOn(Date, 'now').mockImplementation(() => now)
	Object.assign(globalThis, { window: { SpeechRecognition: FakeRecognition, isSecureContext: true } })
	await webSpeechEngine.start(
		{
			onCaption: (caption) => captions.push(caption),
			onError: () => {},
			onEnd: () => {},
		},
		{ roomId: 'room', playerId: 'player' }
	)
})

afterEach(() => {
	jest.restoreAllMocks()
	delete (globalThis as { window?: unknown }).window
})

describe('Web Speech engine', () => {
	it('updates a phrase in place when the browser reuses the result index (desktop Chrome)', () => {
		emit(0, [['hello', false]])
		emit(0, [['hello my', false]])
		emit(0, [['hello my name', true]])
		emit(1, [
			['hello my name', true],
			['is Taha', true],
		])

		expect(shownCaptions().map(({ text, final }) => ({ text, final }))).toEqual([
			{ text: 'hello my name', final: true },
			{ text: 'is Taha', final: true },
		])
	})

	it('merges partials reported as new results into one caption (Android Chrome)', () => {
		const partials = ['hello', 'hello', 'hello', 'hello my', 'hello my name', 'hello my name is Taha']
		const results: [string, boolean][] = []
		for (const text of partials) {
			results.push([text, true])
			now += 200
			emit(results.length - 1, [...results])
		}

		expect(shownCaptions()).toHaveLength(1)
		expect(shownCaptions()[0]).toMatchObject({ text: 'hello my name is Taha', final: true })
	})

	it('starts a new caption when a phrase repeats after a pause', () => {
		emit(0, [['hello', true]])
		now += 10_000
		emit(1, [
			['hello', true],
			['hello again', true],
		])

		expect(shownCaptions().map((c) => c.text)).toEqual(['hello', 'hello again'])
	})

	it('finalises unfinished phrases when stopped', () => {
		emit(0, [['half a sente', false]])
		FakeRecognition.instance.stop()

		expect(captions.at(-1)).toMatchObject({ text: 'half a sente', final: true })
	})
})
