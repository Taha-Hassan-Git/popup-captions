/** Root-mean-square level of a chunk of samples, 0–1. */
export function rms(samples: Float32Array): number {
	let sum = 0
	for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
	return samples.length ? Math.sqrt(sum / samples.length) : 0
}

/** Resamples mono audio; downsampling averages each window so high frequencies don't alias. */
export function resample(input: Float32Array, from: number, to: number): Float32Array {
	if (from === to) return input
	const ratio = from / to
	const output = new Float32Array(Math.floor(input.length / ratio))
	for (let i = 0; i < output.length; i++) {
		const start = i * ratio
		const first = Math.floor(start)
		if (ratio > 1) {
			const end = Math.min(Math.floor(start + ratio), input.length)
			let sum = 0
			for (let j = first; j < end; j++) sum += input[j]
			output[i] = sum / (end - first)
		} else {
			const next = input[Math.min(first + 1, input.length - 1)]
			output[i] = input[first] + (next - input[first]) * (start - first)
		}
	}
	return output
}

export function concat(chunks: Float32Array[]): Float32Array {
	const output = new Float32Array(chunks.reduce((total, chunk) => total + chunk.length, 0))
	let offset = 0
	for (const chunk of chunks) {
		output.set(chunk, offset)
		offset += chunk.length
	}
	return output
}

/** Removes Whisper's non-speech annotations such as "[BLANK_AUDIO]", "(music)" and "*sighs*". */
export function cleanTranscript(text: string): string {
	return text
		.replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*/g, '')
		.replace(/\s+/g, ' ')
		.trim()
}
