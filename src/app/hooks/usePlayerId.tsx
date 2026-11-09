import { useSyncExternalStore } from 'react'
import { v4 as uuidv4 } from 'uuid'

const PLAYER_ID_KEY = 'playerId'

function getPlayerId(): string {
	let playerId = localStorage.getItem(PLAYER_ID_KEY)
	if (!playerId) {
		playerId = uuidv4()
		localStorage.setItem(PLAYER_ID_KEY, playerId)
	}
	return playerId
}

const subscribe = () => () => {}

// null on the server and during hydration, since localStorage only exists in the browser
export function usePlayerId() {
	return useSyncExternalStore(subscribe, getPlayerId, () => null) as string
}
