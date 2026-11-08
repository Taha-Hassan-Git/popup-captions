// Lowercase letters and digits, minus easily confused characters (0/o, 1/l/i).
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const LENGTH = 6

export function generateRoomId() {
	const values = crypto.getRandomValues(new Uint32Array(LENGTH))
	return Array.from(values, (value) => ALPHABET[value % ALPHABET.length]).join('')
}
