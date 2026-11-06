import { Locator, Page } from '@playwright/test'

/**
 * Page object for the game room (the waiting/lobby screen).
 */
export class GamePage {
	readonly page: Page
	readonly readyButton: Locator
	readonly roomId: Locator
	readonly infoBarRound: Locator
	readonly waitingPlayers: Locator

	constructor(page: Page) {
		this.page = page
		this.readyButton = page.getByRole('button', { name: 'Ready?' })
		this.roomId = page.getByTestId('room-id')
		this.infoBarRound = page.getByTestId('info-bar-round')
		this.waitingPlayers = page.getByRole('listitem')
	}

	async getNumberOfWaitingPlayers(): Promise<number> {
		return this.waitingPlayers.count()
	}
}
