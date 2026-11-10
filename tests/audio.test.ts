import { describe, expect, it } from '@jest/globals'
import { cleanTranscript, resample, rms } from '../src/app/captioning/engines/audio'

describe('local model audio helpers', () => {
	it('measures the level of a chunk', () => {
		expect(rms(new Float32Array(4))).toBe(0)
		expect(rms(Float32Array.from([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5)
	})

	it('downsamples 48kHz to 16kHz by averaging each window', () => {
		const output = resample(Float32Array.from([0, 0.3, 0.6, 1, 1, 1]), 48_000, 16_000)
		expect(Array.from(output)).toEqual([expect.closeTo(0.3), expect.closeTo(1)])
	})

	it('handles sample rates that are not whole multiples', () => {
		const output = resample(new Float32Array(44_100).fill(0.2), 44_100, 16_000)
		expect(output).toHaveLength(16_000)
		expect(output.every((sample) => Math.abs(sample - 0.2) < 1e-6)).toBe(true)
	})

	it('strips non-speech annotations from transcripts', () => {
		expect(cleanTranscript(' [BLANK_AUDIO] ')).toBe('')
		expect(cleanTranscript(' (upbeat music) Hello  there *sighs* [Music]')).toBe('Hello there')
	})
})
