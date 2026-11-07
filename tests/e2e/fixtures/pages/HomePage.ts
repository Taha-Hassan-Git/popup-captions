import { Locator, Page } from '@playwright/test'

/**
 * Page object for the homepage where users create or join a room.
 */
export class HomePage {
	readonly page: Page
	readonly header: Locator
	readonly createNewButton: Locator
	readonly joinExistingButton: Locator
	readonly nameInput: Locator
	readonly roomIdInput: Locator
	readonly createRoomFormButton: Locator
	readonly joinRoomFormButton: Locator
	readonly micRoleOption: Locator
	readonly audienceRoleOption: Locator

	constructor(page: Page) {
		this.page = page
		this.header = page.getByRole('heading')
		this.createNewButton = page.getByRole('button', { name: 'Create new room' })
		this.joinExistingButton = page.getByRole('button', { name: 'Join existing room' })
		this.nameInput = page.getByLabel('Your Name:')
		this.roomIdInput = page.getByLabel('Room Id:')
		this.createRoomFormButton = page.getByRole('button', { name: 'Create Room' })
		this.joinRoomFormButton = page.getByRole('button', { name: 'Join Room' })
		this.micRoleOption = page.getByText('Mic', { exact: true })
		this.audienceRoleOption = page.getByText('Audience', { exact: true })
	}

	async goto() {
		await this.page.goto('/')
	}
}
