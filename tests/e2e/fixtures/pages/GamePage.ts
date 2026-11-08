import { Locator, Page } from '@playwright/test'

/**
 * Page object for the room screen.
 */
export class GamePage {
	readonly page: Page
	readonly roomId: Locator
	readonly speakers: Locator
	readonly inviteButton: Locator
	readonly startCaptioningButton: Locator

	constructor(page: Page) {
		this.page = page
		this.roomId = page.getByTestId('room-id')
		this.speakers = page.getByTestId('speaker-bar').getByRole('listitem')
		this.inviteButton = page.getByRole('button', { name: 'Invite others' })
		this.startCaptioningButton = page.getByRole('button', { name: 'Start captioning' })
	}

	getRoomIdFromUrl(): string {
		return new URL(this.page.url()).pathname.split('/').pop() ?? ''
	}
}
