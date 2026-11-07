import { Locator, Page } from '@playwright/test'

/**
 * Page object for the room screen.
 */
export class GamePage {
	readonly page: Page
	readonly roomId: Locator
	readonly infoBarRole: Locator
	readonly players: Locator

	constructor(page: Page) {
		this.page = page
		this.roomId = page.getByTestId('room-id')
		this.infoBarRole = page.getByTestId('info-bar-role')
		this.players = page.getByRole('listitem')
	}

	async getNumberOfPlayers(): Promise<number> {
		return this.players.count()
	}
}
